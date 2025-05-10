
export type GameMode = 'pro' | 'beginner';

export interface Drink {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface Round {
  id: string;
  name: string;
  correctDrinkId: string;
}

export interface Player {
  id: string;
  name: string;
  guesses: Record<string, string>; // roundId -> drinkId
}

export interface Game {
  id: string;
  name: string;
  mode: GameMode;
  rounds: Round[];
  players: Player[];
  drinks: Drink[];
  currentRound: number;
  isComplete: boolean;
}

// New interface for tracking drink assignments during setup
export interface DrinkAssignment {
  roundId: string;
  roundName: string;
  drinkId: string;
}
