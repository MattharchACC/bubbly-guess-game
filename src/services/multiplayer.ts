
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { Game, SyncEvent } from '../types/game';

// Generate a device ID and store it in local storage
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

// Store game session in local storage
export const storeGameSession = (game: Game | null): void => {
  if (game) {
    localStorage.setItem('gameSession', JSON.stringify(game));
  } else {
    localStorage.removeItem('gameSession');
  }
};

// Get stored game session from local storage
export const getStoredGameSession = (): Game | null => {
  const storedGame = localStorage.getItem('gameSession');
  return storedGame ? JSON.parse(storedGame) : null;
};

// Generate a session code for joining games
export const generateSessionCode = async (): Promise<string> => {
  // Use the Supabase function to generate a session code
  const { data, error } = await supabase.rpc('generate_session_code');
  
  if (error) {
    console.error('Error generating session code:', error);
    // Fallback to client-side generation
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  return data;
};

class Multiplayer {
  // Event listeners for sync events
  private listeners: Record<string, Function[]> = {};

  constructor() {
    this.setupRealtimeListeners();
  }

  // Set up Supabase realtime listeners
  private setupRealtimeListeners() {
    const channel = supabase.channel('game-updates')
      .on('broadcast', { event: 'game-event' }, (payload) => {
        const { event, data } = payload.payload;
        this.notifyListeners(event, data);
      })
      .subscribe();
  }

  // Create a new game session
  createGameSession(game: Game): Game {
    const sessionCode = game.sessionCode || `DEMO${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    return {
      ...game,
      sessionCode,
    };
  }

  // Join an existing game session
  async joinGameSession(sessionCode: string, playerName: string): Promise<{ success: boolean, game?: Game, error?: string }> {
    try {
      // Get the game by session code
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          players(*),
          game_rounds(*)
        `)
        .eq('session_code', sessionCode)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: "Game not found. Check the session code and try again."
        };
      }

      // Convert Supabase data to Game type
      const game = data as unknown as Game;
      
      // Emit player joined event
      this.emit(SyncEvent.PLAYER_JOINED, {
        sessionCode,
        playerName,
        deviceId: getDeviceId()
      });

      return {
        success: true,
        game
      };
    } catch (error) {
      console.error("Error joining game:", error);
      return {
        success: false,
        error: "Failed to join the game. Please try again."
      };
    }
  }

  // Add event listener
  addEventListener(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Remove event listener
  removeEventListener(event: string, callback: Function): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  // Notify listeners of an event
  notifyListeners(event: string, data: any): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }

  // Broadcast an event to all connected clients
  emit(event: SyncEvent, data: any): void {
    // Broadcast via Supabase Realtime
    const channel = supabase.channel('game-events');
    
    // Subscribe to the channel first
    channel.subscribe();
    
    // Send the message after subscription (without using then/catch)
    try {
      channel.send({
        type: 'broadcast',
        event: 'game-event',
        payload: { event, data }
      });
    } catch (error) {
      console.error('Error broadcasting event:', error);
    }
    
    // Also notify local listeners
    this.notifyListeners(event, data);
  }

  // Submit a vote/guess
  submitVote(gameId: string, playerId: string, roundId: string, drinkId: string): void {
    // Submit to Supabase - Fix the Promise handling
    supabase
      .from('guesses')
      .upsert({
        player_id: playerId,
        round_id: roundId,
        drink_id: drinkId,
      })
      .then(({ error }) => {
        if (error) {
          console.error('Error submitting vote:', error);
          return;
        }
        
        // Broadcast the vote
        this.emit(SyncEvent.VOTE_SUBMITTED, {
          gameId,
          playerId,
          roundId,
          drinkId,
          timestamp: Date.now()
        });
      });
  }
}

export const multiplayer = new Multiplayer();
