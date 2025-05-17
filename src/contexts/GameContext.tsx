
import React, { createContext, useContext, useState } from 'react';
import { Game, GameMode, Player, Round, Drink } from '../types/game';
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

type GameContextType = {
  game: Game | null;
  setUpGame: (name: string, mode: GameMode, drinks: Drink[], roundCount: number, preassignedRounds?: Round[]) => void;
  addPlayer: (name: string) => void;
  startGame: () => void;
  submitGuess: (playerId: string, roundId: string, drinkId: string) => void;
  advanceRound: () => void;
  completeGame: () => void;
  resetGame: () => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [game, setGame] = useState<Game | null>(null);
  const { toast } = useToast();

  const setUpGame = (name: string, mode: GameMode, drinks: Drink[], roundCount: number, preassignedRounds?: Round[]) => {
    if (drinks.length < roundCount) {
      toast({
        title: "Not enough drinks",
        description: "You need at least as many drinks as rounds",
        variant: "destructive"
      });
      return;
    }

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
      }));
    }

    setGame({
      id: uuidv4(),
      name,
      mode,
      rounds,
      players: [],
      drinks,
      currentRound: -1, // -1 means game not started yet
      isComplete: false,
    });

    toast({
      title: "Game created",
      description: `${name} has been set up with ${roundCount} rounds`,
    });
  };

  const addPlayer = (name: string) => {
    if (!game) return;
    
    const newPlayer: Player = {
      id: uuidv4(),
      name,
      guesses: {},
    };

    setGame({
      ...game,
      players: [...game.players, newPlayer],
    });

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

    setGame({
      ...game,
      currentRound: 0,
    });

    toast({
      title: "Game started",
      description: "The first round has begun!",
    });
  };

  const submitGuess = (playerId: string, roundId: string, drinkId: string) => {
    if (!game) return;
    
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
    
    setGame({
      ...game,
      currentRound: game.currentRound + 1,
    });

    toast({
      title: `Round ${game.currentRound + 2}`,
      description: "Next round has begun!",
    });
  };

  const completeGame = () => {
    if (!game) return;
    
    setGame({
      ...game,
      isComplete: true,
    });

    toast({
      title: "Game completed",
      description: "Let's see the results!",
    });
  };

  const resetGame = () => {
    setGame(null);
    
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
