import React, { createContext, useContext, useState, useEffect } from 'react';
import { Game, GameMode, Player, Round, Drink, SyncEvent } from '../types/game';
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { 
  multiplayer, 
  generateSessionCode, 
  getDeviceId, 
  storeGameSession, 
  getStoredGameSession 
} from '../services/multiplayer';
import { supabase } from '@/integrations/supabase/client';

type GameContextType = {
  game: Game | null;
  setUpGame: (name: string, mode: GameMode, drinks: Drink[], roundCount: number, preassignedRounds?: Round[], enableTimeLimit?: boolean) => void;
  addPlayer: (name: string) => void;
  startGame: () => void;
  submitGuess: (playerId: string, roundId: string, drinkId: string) => void;
  advanceRound: () => void;
  completeGame: () => void;
  resetGame: () => void;
  endGame: () => void;
  joinGame: (sessionCode: string, playerName: string) => Promise<{ success: boolean, error?: string, playerId?: string }>;
  isHost: boolean;
  currentPlayer: Player | null;
  shareableLink: string;
  remainingTime: number | null;
  canPlayerGuess: (playerId: string) => boolean;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [game, setGame] = useState<Game | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Initialize from localStorage if available - enhanced version
  useEffect(() => {
    const storedGame = getStoredGameSession();
    if (storedGame) {
      console.log("Initializing game from local storage:", storedGame.id);
      setGame(storedGame);
      const deviceId = getDeviceId();
      setIsHost(storedGame.hostId === deviceId);
      console.log("Current device ID:", deviceId);
      console.log("Host ID:", storedGame.hostId);
      console.log("Is host:", storedGame.hostId === deviceId);
      
      // Find current player logic improved
      let player = null;
      
      // First try to find by device ID
      player = storedGame.players.find(p => {
        const matches = p.deviceId === deviceId || p.assignedToDeviceId === deviceId;
        console.log(`Checking player ${p.name} (${p.id}): deviceId=${p.deviceId}, assignedToDeviceId=${p.assignedToDeviceId}, matches=${matches}`);
        return matches;
      });
      
      // If player not found by device ID, try to find by stored player ID in localStorage
      if (!player && storedGame.sessionCode) {
        const playerId = localStorage.getItem(`player:${storedGame.sessionCode}`);
        console.log("Looking up player by stored ID:", playerId);
        
        if (playerId) {
          player = storedGame.players.find(p => p.id === playerId);
          console.log("Player found by ID:", player?.name);
          
          // If found this way, update the device IDs for future reference
          if (player) {
            player.deviceId = deviceId;
            player.assignedToDeviceId = deviceId;
            
            // Update the game state with the updated player
            setGame({
              ...storedGame,
              players: storedGame.players.map(p => 
                p.id === player?.id ? {...p, deviceId, assignedToDeviceId: deviceId} : p
              )
            });
          }
        }
      }
      
      // If we found a player, set it as the current player
      if (player) {
        console.log("Found player:", player.name);
        setCurrentPlayer(player);
        
        // Store the player ID in localStorage for this session
        if (storedGame.sessionCode) {
          localStorage.setItem(`player:${storedGame.sessionCode}`, player.id);
          localStorage.setItem(`playerName:${storedGame.sessionCode}`, player.name);
        }
      } else {
        console.log("No player found for current device");
      }
      
      // Log all available players for debugging
      console.log("Available players:", storedGame.players.map(p => ({
        name: p.name, 
        isHost: p.isHost,
        deviceId: p.deviceId,
        assignedToDeviceId: p.assignedToDeviceId,
        id: p.id
      })));
    }
  }, []);
  
  // Handle player assignment (matching device to player created by host)
  const handlePlayerAssignment = (data: any) => {
    if (!game || game.sessionCode !== data.sessionCode) return;
    
    console.log("Player assignment event:", data);
    
    // Update the player with the device ID AND name
    const updatedGame = {
      ...game,
      players: game.players.map(player => 
        player.id === data.playerId 
          ? { 
              ...player, 
              deviceId: data.deviceId, 
              assignedToDeviceId: data.deviceId,
              name: data.playerName || player.name // Use the name from the event if provided
            } 
          : player
      )
    };
    
    setGame(updatedGame);
    storeGameSession(updatedGame);
    
    // Update current player if this assignment is for the current device
    const deviceId = getDeviceId();
    if (deviceId === data.deviceId) {
      const updatedPlayer = updatedGame.players.find(p => p.id === data.playerId);
      if (updatedPlayer) {
        setCurrentPlayer(updatedPlayer);
      }
    }
    
    // If this is the host device, broadcast the updated game state
    if (isHost) {
      multiplayer.emit(SyncEvent.GAME_STATE_UPDATED, {
        sessionCode: game.sessionCode,
        game: updatedGame,
        timestamp: Date.now()
      });
    }
  };
  
  // Set up timer for rounds
  useEffect(() => {
    if (!game || game.currentRound < 0 || game.isComplete || !game.enableTimeLimit) {
      setRemainingTime(null);
      return;
    }
    
    const currentRound = game.rounds[game.currentRound];
    const roundTimeLimit = currentRound.timeLimit || game.roundTimeLimit || 0;
    
    // If there's no time limit (timeLimit is 0), don't start the timer
    if (roundTimeLimit <= 0) {
      setRemainingTime(null);
      return;
    }
    
    const startTime = currentRound.startTime || Date.now();
    const endTime = startTime + (roundTimeLimit * 1000);
    
    const intervalId = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setRemainingTime(remaining);
      
      if (remaining <= 0 && isHost) {
        // Host is responsible for advancing rounds
        clearInterval(intervalId);
        if (game.currentRound < game.rounds.length - 1) {
          advanceRound();
        } else {
          completeGame();
        }
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [game?.currentRound, game?.isComplete, game?.enableTimeLimit]);
  
  // Listen for sync events with improved synchronization
  useEffect(() => {
    // Handle player assignment (matching device to player created by host)
    const handlePlayerAssignment = (data: any) => {
      if (!game || game.sessionCode !== data.sessionCode) return;
      
      console.log("Player assignment event:", data);
      
      // Update the player with the device ID
      const updatedGame = {
        ...game,
        players: game.players.map(player => 
          player.id === data.playerId 
            ? { ...player, deviceId: data.deviceId, assignedToDeviceId: data.deviceId } 
            : player
        )
      };
      
      setGame(updatedGame);
      storeGameSession(updatedGame);
      
      // If this is the host device, broadcast the updated game state
      if (isHost) {
        multiplayer.emit(SyncEvent.GAME_STATE_UPDATED, {
          sessionCode: game.sessionCode,
          game: updatedGame,
          timestamp: Date.now()
        });
      }
    };
    
    // Handle player joined events
    const handlePlayerJoined = (data: any) => {
      if (!game) return;
      
      console.log("Player joined event received:", data);
      
      if (data.sessionCode !== game.sessionCode) {
        console.log("Session code mismatch, ignoring event");
        return;
      }
      
      // Only the host should handle adding players directly
      if (isHost) {
        // If this game session has already started, send the current game state to the new player
        if (game.currentRound >= 0) {
          console.log("Game already started, sending current state to new player");
          multiplayer.emit(SyncEvent.GAME_STATE_UPDATED, {
            sessionCode: game.sessionCode,
            game: game,
            targetDeviceId: data.deviceId,
            timestamp: Date.now()
          });
        }
      } else if (data.game) {
        // Non-hosts should update their game state when game state is updated
        console.log("Receiving updated game state:", data.game);
        setGame(data.game);
        storeGameSession(data.game);
        
        // Update current player reference
        const deviceId = getDeviceId();
        const player = data.game.players.find((p: Player) => p.deviceId === deviceId || p.assignedToDeviceId === deviceId);
        if (player) {
          setCurrentPlayer(player);
        }
      }
    };
    
    // Handle player join requests - mainly for the host to respond with current game state
    const handleJoinGame = (data: any) => {
      if (!game || !isHost) return;
      
      if (data.sessionCode !== game.sessionCode) {
        console.log("Session code mismatch, ignoring join request");
        return;
      }
      
      console.log("Join game request received, responding with current state:", data);
      
      // Host responds with current game state
      multiplayer.emit(SyncEvent.GAME_STATE_UPDATED, {
        sessionCode: game.sessionCode,
        game: game,
        targetDeviceId: data.deviceId,
        timestamp: Date.now()
      });
    };
    
    // Handle game state updates from host
    const handleGameStateUpdated = (data: any) => {
      if (!game) return;
      
      if (data.sessionCode !== game.sessionCode) {
        console.log("Session code mismatch, ignoring state update");
        return;
      }
      
      // Check if this update is targeted at a specific device
      if (data.targetDeviceId && data.targetDeviceId !== getDeviceId()) {
        console.log("State update targeted at another device, ignoring");
        return;
      }
      
      console.log("Game state update received:", data.game);
      
      // Update local game state
      setGame(data.game);
      storeGameSession(data.game);
      
      // Update current player reference
      const deviceId = getDeviceId();
      const player = data.game.players.find((p: Player) => p.deviceId === deviceId || p.assignedToDeviceId === deviceId);
      
      if (player) {
        console.log("Updated current player:", player);
        setCurrentPlayer(player);
      }
    };
    
    const handleGameStarted = (data: any) => {
      console.log("Game started event received:", data);
      if (!game) return;
      
      if (data.gameId !== game.id && data.sessionCode !== game.sessionCode) {
        console.log("Game ID or session code mismatch, ignoring event");
        return;
      }
      
      // Update the game state for all players
      const updatedRounds = game.rounds.map((round, index) => {
        return index === 0 
          ? { ...round, startTime: data.timestamp }
          : round;
      });
      
      const updatedGame: Game = {
        ...game,
        currentRound: 0,
        rounds: updatedRounds
      };
      
      console.log("Updating game state for game start:", updatedGame);
      setGame(updatedGame);
      storeGameSession(updatedGame);
      
      toast({
        title: "Game started",
        description: "The first round has begun!",
      });
    };
    
    const handleVoteSubmitted = (data: any) => {
      if (!game || data.gameId !== game.id) return;
      
      const updatedGame = {
        ...game,
        players: game.players.map(player => 
          player.id === data.playerId
            ? {
                ...player,
                guesses: {
                  ...player.guesses,
                  [data.roundId]: data.drinkId,
                },
              }
            : player
        ),
      };
      
      setGame(updatedGame);
      storeGameSession(updatedGame);
    };
    
    const handleRoundStarted = (data: any) => {
      console.log("Round started event received:", data);
      if (!game || data.gameId !== game.id) return;
      
      // This handles both when the first round starts and subsequent rounds
      const updatedRounds = game.rounds.map((round, index) => {
        if (data.roundIndex === undefined) {
          // This is the old format, handle first round scenario
          if (round.id === data.roundId) {
            return { ...round, startTime: data.timestamp };
          }
        } else {
          // New format with roundIndex
          if (index === data.roundIndex) {
            return { ...round, startTime: data.timestamp };
          } else if (index === data.roundIndex - 1) {
            return { ...round, endTime: data.timestamp };
          }
        }
        return round;
      });
      
      const updatedGame = {
        ...game,
        currentRound: data.roundIndex !== undefined ? data.roundIndex : 0,
        rounds: updatedRounds
      };
      
      console.log("Updating game state for round start:", updatedGame);
      setGame(updatedGame);
      storeGameSession(updatedGame);
      
      // If this is the host, broadcast the updated game state to ensure all clients are in sync
      if (isHost) {
        multiplayer.emit(SyncEvent.GAME_STATE_UPDATED, {
          sessionCode: game.sessionCode,
          game: updatedGame,
          timestamp: Date.now()
        });
      }
    };
    
    const handleGameCompleted = (data: any) => {
      console.log("Game completed event received:", data);
      if (!game) return;
      
      if (data.gameId !== game.id && data.sessionCode !== game.sessionCode) {
        console.log("Game ID or session code mismatch, ignoring event");
        return;
      }
      
      const updatedGame = {
        ...game,
        isComplete: true,
      };
      
      setGame(updatedGame);
      storeGameSession(updatedGame);
      
      if (data.endedEarly) {
        toast({
          title: "Game ended",
          description: "The game has been ended by the host.",
        });
      } else {
        toast({
          title: "Game completed",
          description: "Let's see the results!",
        });
      }
    };
    
    multiplayer.addEventListener(SyncEvent.PLAYER_ASSIGNED, handlePlayerAssignment);
    multiplayer.addEventListener(SyncEvent.PLAYER_JOINED, handlePlayerJoined);
    multiplayer.addEventListener(SyncEvent.JOIN_GAME, handleJoinGame);
    multiplayer.addEventListener(SyncEvent.GAME_STATE_UPDATED, handleGameStateUpdated);
    multiplayer.addEventListener(SyncEvent.GAME_STARTED, handleGameStarted);
    multiplayer.addEventListener(SyncEvent.VOTE_SUBMITTED, handleVoteSubmitted);
    multiplayer.addEventListener(SyncEvent.ROUND_STARTED, handleRoundStarted);
    multiplayer.addEventListener(SyncEvent.GAME_COMPLETED, handleGameCompleted);
    
    return () => {
      multiplayer.removeEventListener(SyncEvent.PLAYER_ASSIGNED, handlePlayerAssignment);
      multiplayer.removeEventListener(SyncEvent.PLAYER_JOINED, handlePlayerJoined);
      multiplayer.removeEventListener(SyncEvent.JOIN_GAME, handleJoinGame);
      multiplayer.removeEventListener(SyncEvent.GAME_STATE_UPDATED, handleGameStateUpdated);
      multiplayer.removeEventListener(SyncEvent.GAME_STARTED, handleGameStarted);
      multiplayer.removeEventListener(SyncEvent.VOTE_SUBMITTED, handleVoteSubmitted);
      multiplayer.removeEventListener(SyncEvent.ROUND_STARTED, handleRoundStarted);
      multiplayer.removeEventListener(SyncEvent.GAME_COMPLETED, handleGameCompleted);
    };
  }, [game, isHost, toast]);
  
  // Generate a shareable link for joining the game
  const shareableLink = game?.sessionCode 
    ? `${window.location.origin}/join?join=${game.sessionCode}` 
    : '';

  // Allow hosts to guess as well
  const canPlayerGuess = (playerId: string): boolean => {
    if (!game || !currentPlayer) return false;
    
    // Host cannot make guesses
    if (currentPlayer.isHost) return false;
    
    // Only the player themselves can make guesses
    if (currentPlayer.id !== playerId) return false;
    
    // The current device must be assigned to this player
    const deviceId = getDeviceId();
    return currentPlayer.deviceId === deviceId || currentPlayer.assignedToDeviceId === deviceId;
  };

  const setUpGame = async (
    name: string, 
    mode: GameMode, 
    drinks: Drink[], 
    roundCount: number, 
    preassignedRounds?: Round[],
    enableTimeLimit: boolean = true
  ) => {
    if (drinks.length < roundCount) {
      toast({
        title: "Not enough drinks",
        description: "You need at least as many drinks as rounds",
        variant: "destructive"
      });
      return;
    }

    // Generate a session code
    const sessionCode = await generateSessionCode();
    console.log("Generated session code:", sessionCode);

    // Create rounds with assigned drinks or random if not provided
    let rounds: Round[];
    
    if (preassignedRounds && preassignedRounds.length === roundCount) {
      // Use the preassigned rounds from the interface
      rounds = preassignedRounds;
    } else {
      // Create rounds with random correct drinks (original behavior)
      const shuffledDrinks = [...drinks].sort(() => Math.random() - 0.5);
      const selectedDrinks = shuffledDrinks.slice(0, roundCount);
      
      rounds = Array.from({ length: roundCount }, (_, index) => ({
        id: uuidv4(),
        name: `Round ${index + 1}`,
        correctDrinkId: selectedDrinks[index].id,
        timeLimit: 60 // Default time limit in seconds
      }));
    }

    // Extract round time limit from the first round (all rounds should have the same time limit)
    const roundTimeLimit = preassignedRounds && preassignedRounds.length > 0 
      ? preassignedRounds[0].timeLimit || 60 
      : 60;

    const deviceId = getDeviceId();
    const hostPlayer: Player = {
      id: uuidv4(),
      name: 'Host',
      guesses: {},
      isHost: true,
      deviceId,
      isConnected: true
    };

    const newGame: Game = {
      id: uuidv4(),
      name,
      mode,
      rounds,
      players: [hostPlayer],
      drinks,
      currentRound: -1, // -1 means game not started yet
      isComplete: false,
      hostId: deviceId,
      roundTimeLimit, // Use the time limit from rounds
      sessionCode, // Add session code from the beginning
      enableTimeLimit // Add the time limit setting
    };
    
    console.log("Creating new game:", newGame);
    
    // Create multiplayer session (which will now save to Supabase)
    const gameWithSession = await multiplayer.createGameSession(newGame);
    
    setGame(gameWithSession);
    setIsHost(true);
    setCurrentPlayer(hostPlayer);
    storeGameSession(gameWithSession);

    toast({
      title: "Game created",
      description: `${name} has been set up with ${roundCount} rounds`,
    });
  };

  // Modified joinGame function to better handle player assignments
  const joinGame = async (sessionCode: string, playerName: string): Promise<{ success: boolean, error?: string, playerId?: string }> => {
    try {
      console.log(`Joining game with session code: ${sessionCode}, player name: ${playerName}`);
      
      const result = await multiplayer.joinGameSession(sessionCode, playerName);
      
      if (result.success && result.game) {
        console.log("Join game successful, setting game state:", result.game);
        
        setGame(result.game);
        setIsHost(false);
        
        // Get the device ID for this client
        const deviceId = getDeviceId();
        console.log("Looking for player with deviceId:", deviceId);
        console.log("All players:", result.game.players.map(p => ({
          id: p.id,
          name: p.name,
          deviceId: p.deviceId,
          assignedDevice: p.assignedToDeviceId
        })));
        
        // First try to find existing player by device ID
        let foundPlayer = result.game.players.find(p => 
          (p.deviceId === deviceId || p.assignedToDeviceId === deviceId)
        );
        
        // If player not found by device ID, try to find by name
        if (!foundPlayer) {
          console.log("Could not find player by device ID, trying by name");
          foundPlayer = result.game.players.find(p => 
            p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
          );
          
          // If found by name, update device IDs
          if (foundPlayer) {
            console.log("Found player by name:", foundPlayer);
            foundPlayer.deviceId = deviceId;
            foundPlayer.assignedToDeviceId = deviceId;
          }
        }
        
        // If we found a player, use it
        if (foundPlayer) {
          console.log("Setting current player:", foundPlayer);
          setCurrentPlayer(foundPlayer);
          
          // Store player ID in localStorage with game session code as key
          // This ensures we can recover the player after page refresh
          localStorage.setItem(`player:${result.game.sessionCode}`, foundPlayer.id);
          localStorage.setItem(`playerName:${result.game.sessionCode}`, foundPlayer.name);
          
          // Update game with correct device ID assignments
          const updatedPlayers = result.game.players.map(p => 
            p.id === foundPlayer?.id ? {...p, deviceId, assignedToDeviceId: deviceId} : p
          );
          
          const updatedGame = {
            ...result.game,
            players: updatedPlayers
          };
          
          setGame(updatedGame);
          storeGameSession(updatedGame);
          
          // Emit player assigned event to sync with other clients
          multiplayer.emit(SyncEvent.PLAYER_ASSIGNED, {
            sessionCode: result.game.sessionCode,
            playerId: foundPlayer.id,
            deviceId,
            timestamp: Date.now()
          });

          // Return the player ID for saving to localStorage
          return { 
            success: true,
            playerId: foundPlayer.id
          };
        } else if (result.playerId) {
          // If we didn't find a player but multiplayer service returned a playerId
          console.log("No player found in the game state, but multiplayer returned playerId:", result.playerId);
          
          // Try to find the player using the playerId returned from multiplayer
          const playerFromId = result.game.players.find(p => p.id === result.playerId);
          
          if (playerFromId) {
            console.log("Found player by ID from multiplayer:", playerFromId);
            setCurrentPlayer(playerFromId);
            
            // Update device ID and store in localStorage
            playerFromId.deviceId = deviceId;
            playerFromId.assignedToDeviceId = deviceId;
            localStorage.setItem(`player:${result.game.sessionCode}`, playerFromId.id);
            localStorage.setItem(`playerName:${result.game.sessionCode}`, playerFromId.name);
            
            // Update game with the device ID assignments
            const updatedPlayers = result.game.players.map(p => 
              p.id === playerFromId.id ? {...p, deviceId, assignedToDeviceId: deviceId} : p
            );
            
            const updatedGame = {
              ...result.game,
              players: updatedPlayers
            };
            
            setGame(updatedGame);
            storeGameSession(updatedGame);
            
            return { 
              success: true,
              playerId: playerFromId.id
            };
          } else {
            console.error("Could not find any player matching the joining user");
            return {
              success: false,
              error: "Could not find player in the game"
            };
          }
        } else {
          console.error("Could not find any player matching the joining user");
          return {
            success: false,
            error: "Could not find player in the game"
          };
        }
      }
      
      return { 
        success: false, 
        error: result.error || "Could not join game" 
      };
    } catch (error) {
      console.error("Error joining game:", error);
      return { 
        success: false, 
        error: "An error occurred while joining the game" 
      };
    }
  };

  const addPlayer = (name: string) => {
    if (!game) return;
    
    const newPlayer: Player = {
      id: uuidv4(),
      name,
      guesses: {},
      isConnected: true
    };

    const updatedGame = {
      ...game,
      players: [...game.players, newPlayer],
    };
    
    setGame(updatedGame);
    storeGameSession(updatedGame);

    toast({
      title: "Player added",
      description: `${name} has been added to the game`,
    });
  };

  const startGame = () => {
    if (!game) return;
    
    if (game.players.length <= 1) { // Only have host
      toast({
        title: "No players",
        description: "Add at least one player to start the game",
        variant: "destructive"
      });
      return;
    }
    
    // Fix the code here to properly update rounds
    const updatedRounds = game.rounds.map((round, index) => {
      // First round gets start time, others remain as is
      return index === 0 
        ? { ...round, startTime: Date.now() }
        : round;
    });
    
    const updatedGame: Game = {
      ...game,
      currentRound: 0,
      rounds: updatedRounds
    };
    
    setGame(updatedGame);
    storeGameSession(updatedGame);
    
    // Broadcast game start with more detailed information
    multiplayer.emit(SyncEvent.GAME_STARTED, {
      gameId: game.id,
      sessionCode: game.sessionCode,
      timestamp: Date.now(),
      game: updatedGame // Send the full updated game state
    });
    
    // Also emit round started event to ensure consistent state
    multiplayer.emit(SyncEvent.ROUND_STARTED, {
      gameId: game.id,
      sessionCode: game.sessionCode,
      roundId: updatedRounds[0].id,
      roundIndex: 0,
      timestamp: Date.now(),
      game: updatedGame // Include the full game state
    });

    // Emit full game state update to ensure all clients are in sync
    multiplayer.emit(SyncEvent.GAME_STATE_UPDATED, {
      sessionCode: game.sessionCode,
      game: updatedGame,
      timestamp: Date.now()
    });

    toast({
      title: "Game started",
      description: "The first round has begun!",
    });
  };

  // Modified submitGuess function with better error handling
  const submitGuess = (playerId: string, roundId: string, drinkId: string) => {
    if (!game) {
      console.error("Cannot submit guess: No active game");
      toast({
        title: "Error",
        description: "No active game found. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    console.log(`Attempting to submit guess for player ${playerId}, round ${roundId}, drink ${drinkId}`);
    
    // Check if the player exists in the game
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      console.error("Player does not exist in game:", playerId);
      console.error("Available players:", game.players.map(p => ({ id: p.id, name: p.name })));
      toast({
        title: "Cannot submit guess",
        description: "Player not found in this game",
        variant: "destructive"
      });
      return;
    }
    
    // Don't allow hosts to submit guesses
    if (player.isHost) {
      console.error("Hosts cannot submit guesses:", playerId);
      toast({
        title: "Cannot submit guess",
        description: "Host is not allowed to make guesses",
        variant: "destructive"
      });
      return;
    }
    
    // Check if the current user is submitting for themselves
    if (currentPlayer && currentPlayer.id !== playerId) {
      console.error(`User ${currentPlayer.id} (${currentPlayer.name}) tried to submit for player ${playerId}`);
      toast({
        title: "Cannot submit guess",
        description: "You can only make selections for yourself",
        variant: "destructive"
      });
      return;
    }
    
    // Submit the guess to the database
    multiplayer.submitVote(game.id, playerId, roundId, drinkId);
    
    // Update local state immediately for better UX
    const updatedGame = {
      ...game,
      players: game.players.map(p => 
        p.id === playerId
          ? {
              ...p,
              guesses: {
                ...p.guesses,
                [roundId]: drinkId,
              },
            }
          : p
      ),
    };
    
    setGame(updatedGame);
    storeGameSession(updatedGame);
    
    // Broadcast the change to all connected clients
    multiplayer.emit(SyncEvent.VOTE_SUBMITTED, {
      gameId: game.id,
      sessionCode: game.sessionCode,
      playerId,
      roundId,
      drinkId,
      timestamp: Date.now()
    });
    
    // Show success toast
    toast({
      title: "Vote submitted",
      description: "Your selection has been recorded",
      variant: "default" 
    });
  };

  const advanceRound = () => {
    if (!game || game.currentRound >= game.rounds.length - 1) return;
    
    const nextRoundIndex = game.currentRound + 1;
    const updatedRounds = game.rounds.map((round, index) => {
      if (index === game.currentRound) {
        return { ...round, endTime: Date.now() };
      }
      if (index === nextRoundIndex) {
        return { ...round, startTime: Date.now() };
      }
      return round;
    });
    
    const updatedGame = {
      ...game,
      currentRound: nextRoundIndex,
      rounds: updatedRounds
    };
    
    setGame(updatedGame);
    storeGameSession(updatedGame);
    
    // Broadcast round change with full game data
    multiplayer.emit(SyncEvent.ROUND_STARTED, {
      gameId: game.id,
      sessionCode: game.sessionCode,
      roundId: updatedRounds[nextRoundIndex].id,
      roundIndex: nextRoundIndex,
      timestamp: Date.now(),
      game: updatedGame // Send the full updated game state
    });
    
    // Also send full game state update
    multiplayer.emit(SyncEvent.GAME_STATE_UPDATED, {
      sessionCode: game.sessionCode,
      game: updatedGame,
      timestamp: Date.now()
    });

    toast({
      title: `Round ${nextRoundIndex + 1}`,
      description: "Next round has begun!",
    });
  };

  const completeGame = () => {
    if (!game) return;
    
    const updatedGame = {
      ...game,
      isComplete: true,
    };
    
    setGame(updatedGame);
    storeGameSession(updatedGame);
    
    // Broadcast game completion with full game data
    multiplayer.emit(SyncEvent.GAME_COMPLETED, {
      gameId: game.id,
      sessionCode: game.sessionCode,
      timestamp: Date.now(),
      game: updatedGame // Send the full updated game state
    });
    
    // Also send full game state update
    multiplayer.emit(SyncEvent.GAME_STATE_UPDATED, {
      sessionCode: game.sessionCode,
      game: updatedGame,
      timestamp: Date.now()
    });

    toast({
      title: "Game completed",
      description: "Let's see the results!",
    });
  };

  const endGame = () => {
    if (!game || !isHost) return;
    
    const updatedGame = {
      ...game,
      isComplete: true,
    };
    
    setGame(updatedGame);
    storeGameSession(updatedGame);
    
    // Broadcast game ending with full game data
    multiplayer.emit(SyncEvent.GAME_COMPLETED, {
      gameId: game.id,
      sessionCode: game.sessionCode,
      timestamp: Date.now(),
      endedEarly: true,
      game: updatedGame // Send the full updated game state
    });
    
    // Also send full game state update
    multiplayer.emit(SyncEvent.GAME_STATE_UPDATED, {
      sessionCode: game.sessionCode,
      game: updatedGame,
      timestamp: Date.now()
    });

    toast({
      title: "Game ended",
      description: "The game has been ended by the host.",
    });
  };

  const resetGame = () => {
    setGame(null);
    setIsHost(false);
    setCurrentPlayer(null);
    
    // Clear ALL game-related localStorage items
    localStorage.removeItem('gameSession');
    localStorage.removeItem('lastActiveSession');
    
    // Clear any player-specific data that might be stored
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      if (key.startsWith('player:') || 
          key.startsWith('playerName:') || 
          key.startsWith('deviceId:') || 
          key.startsWith('currentPlayerId:') || 
          key.startsWith('gameSession:')) {
        localStorage.removeItem(key);
      }
    }
    
    toast({
      title: "Game reset",
      description: "Start a new game!",
    });
  };

  return (
    <GameContext.Provider value={{
      game,
      setUpGame,
      addPlayer,
      startGame,
      submitGuess,
      advanceRound,
      completeGame,
      resetGame,
      endGame,
      joinGame,
      isHost,
      currentPlayer,
      shareableLink,
      remainingTime,
      canPlayerGuess,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
