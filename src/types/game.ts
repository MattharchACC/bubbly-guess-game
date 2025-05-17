
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
  assignedToDeviceId?: string; // New field to track which device is assigned to this player
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
  enableTimeLimit?: boolean; // Whether time limits are enabled
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

// Properly export the SyncEvent enum - making sure it's available to any file that imports it
export enum SyncEvent {
  JOIN_GAME = 'join_game',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  GAME_STARTED = 'game_started', // Event for game start
  ROUND_STARTED = 'round_started',
  VOTE_SUBMITTED = 'vote_submitted',
  ROUND_ENDED = 'round_ended',
  GAME_COMPLETED = 'game_completed',
  PLAYER_ASSIGNED = 'player_assigned', // New event for player assignment
  GAME_STATE_UPDATED = 'game_state_updated', // New event for full game state updates
}
