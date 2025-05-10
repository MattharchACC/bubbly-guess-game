
import type { Database } from '@/integrations/supabase/types';

// Type definitions that extend or use the auto-generated Database type
export type Tables = Database['public']['Tables'];
export type GameRow = Tables['games']['Row'];
export type DrinkRow = Tables['drinks']['Row'];
export type PlayerRow = Tables['players']['Row'];
export type GameRoundRow = Tables['game_rounds']['Row'];
export type GuessRow = Tables['guesses']['Row'];

// Export interface aliases that match our existing app types
export interface SupabaseDrink extends DrinkRow {}
export interface SupabaseGame extends GameRow {}
export interface SupabasePlayer extends PlayerRow {}
export interface SupabaseRound extends GameRoundRow {}
export interface SupabaseGuess extends GuessRow {}
