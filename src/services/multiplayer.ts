
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
        console.log(`Received event: ${event}`, data);
        this.notifyListeners(event, data);
      })
      .subscribe((status) => {
        console.log(`Supabase channel status: ${status}`);
      });
  }

  // Create a new game session
  createGameSession(game: Game): Game {
    if (!game.sessionCode) {
      // Generate a temporary session code for UI display
      const sessionCode = `DEMO${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      game.sessionCode = sessionCode;
    }

    // Save the game to Supabase
    this.saveGameToSupabase(game);
    
    return game;
  }

  // Save game to Supabase database
  private async saveGameToSupabase(game: Game) {
    try {
      // First, create or update the game record
      const gameData = {
        id: game.id,
        name: game.name,
        mode: game.mode,
        host_id: game.hostId,
        is_complete: game.isComplete,
        current_round: game.currentRound,
        session_code: game.sessionCode,
        round_time_limit: game.roundTimeLimit
      };

      const { error: gameError } = await supabase
        .from('games')
        .upsert(gameData);

      if (gameError) {
        console.error('Error saving game:', gameError);
        return;
      }

      // Save players
      for (const player of game.players) {
        const playerData = {
          id: player.id,
          name: player.name,
          game_id: game.id,
          is_host: player.isHost || false,
          device_id: player.deviceId
        };

        await supabase
          .from('players')
          .upsert(playerData);
      }

      // Save rounds
      for (let i = 0; i < game.rounds.length; i++) {
        const round = game.rounds[i];
        const roundData = {
          id: round.id,
          name: round.name,
          game_id: game.id,
          correct_drink_id: round.correctDrinkId,
          time_limit: round.timeLimit,
          round_order: i,
          // Convert JS timestamp to ISO string for Postgres
          start_time: round.startTime ? new Date(round.startTime).toISOString() : null,
          end_time: round.endTime ? new Date(round.endTime).toISOString() : null
        };

        await supabase
          .from('game_rounds')
          .upsert(roundData);
      }

      console.log('Game saved successfully to Supabase:', game.id);
    } catch (error) {
      console.error('Error in saveGameToSupabase:', error);
    }
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
        console.error('Error fetching game:', error);
        return {
          success: false,
          error: "Game not found. Check the session code and try again."
        };
      }

      // Convert Supabase data to Game type
      const game: Game = {
        id: data.id,
        name: data.name,
        mode: data.mode as any,
        hostId: data.host_id,
        currentRound: data.current_round,
        isComplete: data.is_complete,
        sessionCode: data.session_code,
        roundTimeLimit: data.round_time_limit,
        players: data.players.map((p: any) => ({
          id: p.id,
          name: p.name,
          isHost: p.is_host,
          deviceId: p.device_id,
          guesses: {},
          isConnected: true
        })),
        rounds: data.game_rounds.map((r: any) => ({
          id: r.id,
          name: r.name,
          correctDrinkId: r.correct_drink_id,
          timeLimit: r.time_limit,
          startTime: r.start_time ? new Date(r.start_time).getTime() : undefined,
          endTime: r.end_time ? new Date(r.end_time).getTime() : undefined
        })),
        drinks: [] // We'll need to fetch drinks separately
      };
      
      // Fetch drinks for this game
      const { data: drinksData } = await supabase
        .from('drinks')
        .select('*');
        
      if (drinksData) {
        game.drinks = drinksData.map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          imageUrl: d.image_url
        }));
      }
      
      // Fetch existing guesses
      const { data: guessesData } = await supabase
        .from('guesses')
        .select('player_id, round_id, drink_id')
        .eq('round_id', game.rounds[game.currentRound]?.id);
        
      if (guessesData) {
        // Update players with their existing guesses
        game.players = game.players.map(player => {
          const playerGuesses = guessesData
            .filter((g: any) => g.player_id === player.id)
            .reduce((acc: Record<string, string>, g: any) => {
              acc[g.round_id] = g.drink_id;
              return acc;
            }, {});
            
          return {
            ...player,
            guesses: { ...player.guesses, ...playerGuesses }
          };
        });
      }
      
      // Emit player joined event
      this.emit(SyncEvent.PLAYER_JOINED, {
        sessionCode,
        playerName,
        deviceId: getDeviceId()
      });

      console.log("Joined game successfully:", game);
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
    console.log(`Notifying ${this.listeners[event].length} listeners for event ${event}`);
    this.listeners[event].forEach(callback => callback(data));
  }

  // Broadcast an event to all connected clients
  emit(event: SyncEvent, data: any): void {
    console.log(`Emitting event: ${event}`, data);
    
    // Broadcast via Supabase Realtime
    const channel = supabase.channel('game-events');
    
    try {
      // Subscribe to the channel first
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Send the message after subscription
          channel.send({
            type: 'broadcast',
            event: 'game-event',
            payload: { event, data }
          });
        }
      });
    } catch (error) {
      console.error('Error broadcasting event:', error);
    }
    
    // Also notify local listeners
    this.notifyListeners(event, data);
  }

  // Submit a vote/guess
  submitVote(gameId: string, playerId: string, roundId: string, drinkId: string): void {
    // Submit to Supabase
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
        
        // Only broadcast the vote if successful
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
