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
    // Fallback to client-side generation with timestamp to ensure uniqueness
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36).substring(4, 8);
    return result.substring(0, 4) + timestamp;
  }
  
  return data;
};

class Multiplayer {
  // Event listeners for sync events
  private listeners: Record<string, Function[]> = {};

  // Create ONE channel and reuse it everywhere
  private channel = supabase.channel('game-events', {
    config: { broadcast: { self: true } }, // let sender receive its own messages
  });

  constructor() {
    // Subscribe once in the constructor
    this.channel
      .on('broadcast', { event: 'game-event' }, (payload) => {
        const { event, data } = payload.payload;
        console.log(`Received event: ${event}`, data);
        this.notifyListeners(event, data);
      })
      .subscribe((status) => {
        console.log(`Supabase channel status: ${status}`);
      });
  }

  // Create a new game session with guaranteed unique session code
  async createGameSession(game: Game): Promise<Game> {
    // Generate a truly unique session code for this game
    const sessionCode = await generateSessionCode();
    console.log(`Generated unique session code: ${sessionCode}`);
    
    const updatedGame = {
      ...game,
      sessionCode
    };
    
    // Save the game to Supabase
    await this.saveGameToSupabase(updatedGame);
    
    return updatedGame;
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

  // Join an existing game session without player validation
  async joinGameSession(sessionCode: string, playerName: string): Promise<{ success: boolean, game?: Game, error?: string, playerId?: string }> {
    try {
      console.log(`Attempting to join game with session code: ${sessionCode}, player name: ${playerName}`);
      
      // Get game data first
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('session_code', sessionCode)
        .single();

      if (gameError || !gameData) {
        console.error('Error fetching game:', gameError);
        return {
          success: false,
          error: "Game not found. Check the session code and try again."
        };
      }

      console.log("Found game with session code:", gameData);
      
      // Get the full game data with relationships
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
        console.error('Error fetching complete game data:', error);
        return {
          success: false,
          error: "Error retrieving game data. Please try again."
        };
      }

      console.log("Found complete game data from Supabase:", data);

      // Convert Supabase data to Game type
      const game: Game = {
        id: data.id,
        name: data.name,
        mode: data.mode as any,
        hostId: data.host_id,
        currentRound: data.current_round,
        isComplete: data.is_complete,
        sessionCode: data.session_code,
        roundTimeLimit: data.round_time_limit || 60,
        enableTimeLimit: true, // Default to true for existing games
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
          timeLimit: r.time_limit || 60,
          startTime: r.start_time ? new Date(r.start_time).getTime() : undefined,
          endTime: r.end_time ? new Date(r.end_time).getTime() : undefined
        })),
        drinks: [] // We'll need to fetch drinks separately
      };
      
      // Sort rounds by order to ensure they're displayed correctly
      game.rounds.sort((a: any, b: any) => {
        const aOrder = data.game_rounds.find((r: any) => r.id === a.id)?.round_order || 0;
        const bOrder = data.game_rounds.find((r: any) => r.id === b.id)?.round_order || 0;
        return aOrder - bOrder;
      });
      
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
      } else {
        console.error("Failed to retrieve drinks data");
        return {
          success: false, 
          error: "Failed to retrieve necessary game data" 
        };
      }
      
      // Fetch existing guesses
      const { data: guessesData } = await supabase
        .from('guesses')
        .select('player_id, round_id, drink_id');
        
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
      
      // Get the device ID for this client
      const deviceId = getDeviceId();
      
      // Check if this player name already exists in the game
      const existingPlayer = game.players.find(p => 
        p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
      );
      
      let playerId: string;
      let foundPlayer; // Add a variable to track the joined player
      
      if (existingPlayer) {
        // If player already exists, update their device ID
        playerId = existingPlayer.id;
        console.log(`Player ${playerName} already exists in the game, updating device ID`);
        
        await supabase
          .from('players')
          .update({ device_id: deviceId })
          .eq('id', existingPlayer.id);
          
        // Update the player in our game object
        game.players = game.players.map(p => 
          p.id === existingPlayer.id ? { ...p, deviceId, assignedToDeviceId: deviceId } : p
        );
        
        foundPlayer = existingPlayer;
      } else {
        // Create a new player
        playerId = uuidv4();
        const newPlayer = {
          id: playerId,
          name: playerName.trim(),
          game_id: game.id,
          is_host: false,
          device_id: deviceId
        };
        
        console.log(`Creating new player: ${playerName}`);
        
        // Add to database
        const { error: playerError } = await supabase
          .from('players')
          .insert(newPlayer);
          
        if (playerError) {
          console.error('Error creating new player:', playerError);
          return {
            success: false,
            error: "Could not create new player. Please try again."
          };
        }
        
        // Add to our game object (and remember this one!)
        const newPlayerObj = {
          id: playerId,
          name: playerName.trim(),
          isHost: false,
          deviceId,
          assignedToDeviceId: deviceId,
          guesses: {},
          isConnected: true
        };
        game.players.push(newPlayerObj);
        foundPlayer = newPlayerObj; // make sure it's not undefined
      }
      
      // Emit player joined event
      this.emit(SyncEvent.PLAYER_JOINED, {
        sessionCode,
        playerId,
        playerName,
        deviceId,
        game,
        timestamp: Date.now()
      });
      
      // Also emit player assigned event for explicit device-player association
      this.emit(SyncEvent.PLAYER_ASSIGNED, {
        sessionCode,
        playerId,
        deviceId,
        timestamp: Date.now()
      });
      
      console.log("Final game state after joining:", game);
      
      // Request full game state from host
      this.emit(SyncEvent.JOIN_GAME, {
        sessionCode,
        playerName,
        deviceId,
        playerId,
        timestamp: Date.now()
      });

      return { success: true, game, playerId }; // always defined now
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

  // Broadcast an event to all connected clients with improved reliability
  emit(event: SyncEvent, data: any): void {
    console.log(`Emitting event: ${event}`, data);
    
    // Add timestamp to all events if not already present
    if (!data.timestamp) {
      data.timestamp = Date.now();
    }
    
    // Just send - the channel is already subscribed
    this.channel.send({
      type: 'broadcast',
      event: 'game-event',
      payload: { event, data }
    });
    
    // Also notify local listeners
    this.notifyListeners(event, data);
  }

  // Submit a vote/guess
  submitVote(gameId: string, playerId: string, roundId: string, drinkId: string): void {
    console.log(`Submitting vote for player ${playerId}, round ${roundId}, drink ${drinkId}`);
    
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
        
        console.log('Vote submitted successfully to Supabase');
        
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
