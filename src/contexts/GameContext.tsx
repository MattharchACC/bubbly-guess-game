
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Game, GameMode, Player, Round, Drink, SyncEvent } from '../types/game';
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { multiplayer, generateSessionCode, getDeviceId, storeGameSession, getStoredGameSession } from '../services/multiplayer';
import { supabase } from '@/integrations/supabase/client';

type GameContextType = {
  game: Game | null;
  setUpGame: (name: string, mode: GameMode, drinks: Drink[], roundCount: number, preassignedRounds?: Round[]) => void;
  addPlayer: (name: string) => void;
  startGame: () => void;
  submitGuess: (playerId: string, roundId: string, drinkId: string) => void;
  advanceRound: () => void;
  completeGame: () => void;
  resetGame: () => void;
  endGame: () => void;
  joinGame: (sessionCode: string, playerName: string) => Promise<{ success: boolean, error?: string }>;
  isHost: boolean;
  currentPlayer: Player | null;
  shareableLink: string;
  remainingTime: number | null;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [game, setGame] = useState<Game | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Initialize from localStorage if available
  useEffect(() => {
    const storedGame = getStoredGameSession();
    if (storedGame) {
      setGame(storedGame);
      const deviceId = getDeviceId();
      setIsHost(storedGame.hostId === deviceId);
      
      // Find current player
      const player = storedGame.players.find(p => p.deviceId === deviceId);
      setCurrentPlayer(player || null);
    }
  }, []);
  
  // Set up timer for rounds
  useEffect(() => {
    if (!game || game.currentRound < 0 || game.isComplete) {
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
  }, [game?.currentRound, game?.isComplete]);
  
  // Listen for sync events
  useEffect(() => {
    const handlePlayerJoined = (data: any) => {
      if (!game) return;
      
      // Only the host should handle adding players
      if (isHost && data.sessionCode === game.sessionCode && data.playerName) {
        const newPlayer: Player = {
          id: uuidv4(),
          name: data.playerName,
          guesses: {},
          deviceId: data.deviceId,
          isConnected: true
        };
        
        const updatedGame = {
          ...game,
          players: [...game.players, newPlayer]
        };
        
        setGame(updatedGame);
        storeGameSession(updatedGame);
        
        // Notify all players about the updated game
        multiplayer.emit(SyncEvent.PLAYER_JOINED, {
          sessionCode: game.sessionCode,
          game: updatedGame
        });
        
        toast({
          title: "Player joined",
          description: `${data.playerName} has joined the game`,
        });
      } else if (!isHost && data.game) {
        // Non-hosts should update their game state when players join
        console.log("Receiving updated game state after player joined:", data.game);
        setGame(data.game);
        storeGameSession(data.game);
        
        // Update current player reference
        const deviceId = getDeviceId();
        const player = data.game.players.find((p: Player) => p.deviceId === deviceId);
        if (player) {
          setCurrentPlayer(player);
        }
      }
    };
    
    const handleGameStarted = (data: any) => {
      console.log("Game started event received:", data);
      if (!game || data.gameId !== game.id) return;
      
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
      
      console.log("Updating game state for non-host:", updatedGame);
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
    };
    
    const handleGameCompleted = (data: any) => {
      console.log("Game completed event received:", data);
      if (!game || data.gameId !== game.id) return;
      
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
    
    multiplayer.addEventListener(SyncEvent.PLAYER_JOINED, handlePlayerJoined);
    multiplayer.addEventListener(SyncEvent.GAME_STARTED, handleGameStarted);
    multiplayer.addEventListener(SyncEvent.VOTE_SUBMITTED, handleVoteSubmitted);
    multiplayer.addEventListener(SyncEvent.ROUND_STARTED, handleRoundStarted);
    multiplayer.addEventListener(SyncEvent.GAME_COMPLETED, handleGameCompleted);
    
    return () => {
      multiplayer.removeEventListener(SyncEvent.PLAYER_JOINED, handlePlayerJoined);
      multiplayer.removeEventListener(SyncEvent.GAME_STARTED, handleGameStarted);
      multiplayer.removeEventListener(SyncEvent.VOTE_SUBMITTED, handleVoteSubmitted);
      multiplayer.removeEventListener(SyncEvent.ROUND_STARTED, handleRoundStarted);
      multiplayer.removeEventListener(SyncEvent.GAME_COMPLETED, handleGameCompleted);
    };
  }, [game, isHost]);
  
  // Generate a shareable link for joining the game - Updated to handle any domain
  const shareableLink = game?.sessionCode 
    ? `${window.location.origin}/join?join=${game.sessionCode}` 
    : '';

  const setUpGame = async (name: string, mode: GameMode, drinks: Drink[], roundCount: number, preassignedRounds?: Round[]) => {
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
    };
    
    // Create multiplayer session (which will now save to Supabase)
    const gameWithSession = multiplayer.createGameSession(newGame);
    
    setGame(gameWithSession);
    setIsHost(true);
    setCurrentPlayer(hostPlayer);
    storeGameSession(gameWithSession);

    toast({
      title: "Game created",
      description: `${name} has been set up with ${roundCount} rounds`,
    });
  };

  const joinGame = async (sessionCode: string, playerName: string): Promise<{ success: boolean, error?: string }> => {
    try {
      const result = await multiplayer.joinGameSession(sessionCode, playerName);
      
      if (result.success && result.game) {
        setGame(result.game);
        setIsHost(false);
        
        // Find or create current player
        const deviceId = getDeviceId();
        let player = result.game.players.find(p => p.deviceId === deviceId);
        
        if (!player) {
          // This shouldn't normally happen as the host should have added the player
          // but just in case, we'll add the player locally
          player = {
            id: uuidv4(),
            name: playerName,
            guesses: {},
            deviceId,
            isConnected: true
          };
          
          // Add player to the game object
          const updatedGame = {
            ...result.game,
            players: [...result.game.players, player]
          };
          
          setGame(updatedGame);
          storeGameSession(updatedGame);
        }
        
        setCurrentPlayer(player);
        storeGameSession(result.game);
        
        toast({
          title: "Joined game",
          description: `You've joined ${result.game.name}`,
        });
        
        return { success: true };
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
      deviceId: getDeviceId(),
      isConnected: true
    };

    const updatedGame = {
      ...game,
      players: [...game.players, newPlayer],
    };
    
    setGame(updatedGame);
    storeGameSession(updatedGame);
    
    if (getDeviceId() === newPlayer.deviceId) {
      setCurrentPlayer(newPlayer);
    }

    toast({
      title: "Player added",
      description: `${name} has joined the game`,
    });
  };

  const startGame = () => {
    if (!game) return;
    
    if (game.players.length === 0) {
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
      roundId: updatedRounds[0].id,
      roundIndex: 0,
      timestamp: Date.now()
    });

    toast({
      title: "Game started",
      description: "The first round has begun!",
    });
  };

  const submitGuess = (playerId: string, roundId: string, drinkId: string) => {
    if (!game) return;
    
    multiplayer.submitVote(game.id, playerId, roundId, drinkId);
    
    setGame({
      ...game,
      players: game.players.map(player => 
        player.id === playerId
          ? {
              ...player,
              guesses: {
                ...player.guesses,
                [roundId]: drinkId,
              },
            }
          : player
      ),
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
      roundId: updatedRounds[nextRoundIndex].id,
      roundIndex: nextRoundIndex,
      timestamp: Date.now(),
      game: updatedGame // Send the full updated game state
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
      timestamp: Date.now(),
      game: updatedGame // Send the full updated game state
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
      timestamp: Date.now(),
      endedEarly: true,
      game: updatedGame // Send the full updated game state
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
    storeGameSession(null);
    
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
