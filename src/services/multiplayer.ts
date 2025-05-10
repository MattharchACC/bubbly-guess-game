
import { v4 as uuidv4 } from 'uuid';
import { Game, Player, SyncEvent } from '../types/game';

// Generate a short, user-friendly session code
export const generateSessionCode = (): string => {
  // Create a 6-character alphanumeric code
  const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Generate a unique device ID or retrieve the existing one
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('bubbly_device_id');
  
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('bubbly_device_id', deviceId);
  }
  
  return deviceId;
};

// Store the current game session in localStorage
export const storeGameSession = (game: Game): void => {
  localStorage.setItem('bubbly_current_game', JSON.stringify(game));
};

// Retrieve the current game session from localStorage
export const getStoredGameSession = (): Game | null => {
  const storedGame = localStorage.getItem('bubbly_current_game');
  return storedGame ? JSON.parse(storedGame) : null;
};

// Clear the current game session from localStorage
export const clearGameSession = (): void => {
  localStorage.removeItem('bubbly_current_game');
};

// Simple implementation of synchronization using localStorage and events
// This simulates a real backend but works for demonstration purposes
class MultiplayerService {
  private listeners: Record<string, Function[]> = {};
  
  constructor() {
    // Listen for storage events to sync between tabs/windows
    window.addEventListener('storage', this.handleStorageEvent);
  }
  
  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key?.startsWith('bubbly_sync_')) {
      try {
        const data = JSON.parse(event.newValue || '{}');
        const eventType = event.key.replace('bubbly_sync_', '');
        this.notifyListeners(eventType, data);
      } catch (error) {
        console.error('Error parsing sync event:', error);
      }
    }
  };
  
  // Add event listener
  public addEventListener(eventType: SyncEvent, callback: Function) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);
  }
  
  // Remove event listener
  public removeEventListener(eventType: SyncEvent, callback: Function) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(
        listener => listener !== callback
      );
    }
  }
  
  // Emit an event to all connected devices
  public emit(eventType: SyncEvent, data: any) {
    localStorage.setItem(`bubbly_sync_${eventType}`, JSON.stringify({
      ...data,
      timestamp: Date.now(),
    }));
    
    // Notify local listeners
    this.notifyListeners(eventType, data);
  }
  
  private notifyListeners(eventType: string, data: any) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => callback(data));
    }
  }
  
  // Create a new multiplayer game session
  public createGameSession(game: Game): Game {
    const sessionCode = generateSessionCode();
    const deviceId = getDeviceId();
    
    const gameWithSession = {
      ...game,
      sessionCode,
      hostId: deviceId,
      roundTimeLimit: 60, // Default 60 seconds
    };
    
    storeGameSession(gameWithSession);
    
    // Broadcast the new game
    this.emit(SyncEvent.JOIN_GAME, { gameId: game.id, sessionCode });
    
    return gameWithSession;
  }
  
  // Join an existing game session
  public joinGameSession(sessionCode: string, playerName: string): Promise<{ success: boolean, game?: Game, error?: string }> {
    return new Promise((resolve) => {
      // Check if we already have this game stored locally
      const storedGame = getStoredGameSession();
      
      if (storedGame && storedGame.sessionCode === sessionCode) {
        // We're already connected to this game
        resolve({ success: true, game: storedGame });
        return;
      }
      
      // Wait for a response from the host
      const timeout = setTimeout(() => {
        resolve({ success: false, error: "No response from game host. Please check the code and try again." });
      }, 5000);
      
      // Listen for game data
      const handleJoinResponse = (data: any) => {
        if (data.sessionCode === sessionCode && data.game) {
          clearTimeout(timeout);
          this.removeEventListener(SyncEvent.PLAYER_JOINED, handleJoinResponse);
          
          // Store the game locally
          storeGameSession(data.game);
          
          resolve({ success: true, game: data.game });
        }
      };
      
      this.addEventListener(SyncEvent.PLAYER_JOINED, handleJoinResponse);
      
      // Emit join request
      this.emit(SyncEvent.JOIN_GAME, {
        sessionCode,
        playerName,
        deviceId: getDeviceId(),
        timestamp: Date.now()
      });
    });
  }
  
  // Submit a vote for a round
  public submitVote(gameId: string, playerId: string, roundId: string, drinkId: string) {
    this.emit(SyncEvent.VOTE_SUBMITTED, {
      gameId,
      playerId,
      roundId,
      drinkId,
      deviceId: getDeviceId(),
      timestamp: Date.now()
    });
  }
}

export const multiplayer = new MultiplayerService();
