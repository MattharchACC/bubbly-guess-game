
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
  timeLimit?: number; // Time limit in seconds
  startTime?: number; // Timestamp when round started
  endTime?: number; // Timestamp when round ended
}

export interface Player {
  id: string;
  name: string;
  guesses: Record<string, string>; // roundId -> drinkId
  isHost?: boolean;
  isConnected?: boolean;
  deviceId?: string;
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
  sessionCode?: string; // Unique code for joining the game
  hostId?: string; // ID of the host player
  roundTimeLimit: number; // Default time limit for rounds in seconds
}

// New interface for tracking drink assignments during setup
export interface DrinkAssignment {
  roundId: string;
  roundName: string;
  drinkId: string;
}

// New interface for multiplayer game sessions
export interface GameSession {
  gameId: string;
  sessionCode: string;
  hostDeviceId: string;
  connectedDevices: string[];
  startedAt: number;
  lastUpdatedAt: number;
}

// Enum for synchronization events between devices
export enum SyncEvent {
  JOIN_GAME = 'join_game',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  GAME_STARTED = 'game_started', // Event for game start
  ROUND_STARTED = 'round_started',
  VOTE_SUBMITTED = 'vote_submitted',
  ROUND_ENDED = 'round_ended',
  GAME_COMPLETED = 'game_completed',
}
