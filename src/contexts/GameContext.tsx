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
    const roundTimeLimit = currentRound.timeLimit || game.roundTimeLimit || 60;
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
      if (!game || !isHost) return;
      
      // Only the host should handle adding players
      if (data.sessionCode === game.sessionCode && data.playerName) {
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
      }
    };
    
    const handleVoteSubmitted = (data: any) => {
      if (!game) return;
      
      if (data.gameId === game.id) {
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
      }
    };
    
    multiplayer.addEventListener(SyncEvent.PLAYER_JOINED, handlePlayerJoined);
    multiplayer.addEventListener(SyncEvent.VOTE_SUBMITTED, handleVoteSubmitted);
    
    return () => {
      multiplayer.removeEventListener(SyncEvent.PLAYER_JOINED, handlePlayerJoined);
      multiplayer.removeEventListener(SyncEvent.VOTE_SUBMITTED, handleVoteSubmitted);
    };
  }, [game, isHost]);
  
  // Generate a shareable link for joining the game
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
      roundTimeLimit: 60, // Default 60 seconds per round
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
    
    const updatedRounds = game.rounds.map((round, index) => 
      index === 0
        ? { ...round, startTime: Date.now() }
        : round
    );
    
    const updatedGame = {
      ...game,
      currentRound: 0,
      rounds: updatedRounds
    };
    
    setGame(updatedGame);
    storeGameSession(updatedGame);
    
    // Broadcast game start
    multiplayer.emit(SyncEvent.ROUND_STARTED, {
      gameId: game.id,
      roundId: updatedRounds[0].id,
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
    
    // Broadcast round change
    multiplayer.emit(SyncEvent.ROUND_STARTED, {
      gameId: game.id,
      roundId: updatedRounds[nextRoundIndex].id,
      roundIndex: nextRoundIndex,
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
    
    // Broadcast game completion
    multiplayer.emit(SyncEvent.GAME_COMPLETED, {
      gameId: game.id,
      timestamp: Date.now()
    });

    toast({
      title: "Game completed",
      description: "Let's see the results!",
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
