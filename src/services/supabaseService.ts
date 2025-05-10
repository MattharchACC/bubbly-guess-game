
import { supabase } from "@/integrations/supabase/client";
import type { Game, Player, Round, Drink } from "../types/game";
import type { Tables } from "../types/supabase-types";

// Game operations
export const getGames = async () => {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const getGameBySessionCode = async (sessionCode: string) => {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      game_rounds(*),
      players(*)
    `)
    .eq('session_code', sessionCode)
    .single();
  
  if (error) throw error;
  return data;
};

export const createGame = async (game: Omit<Tables['games']['Insert'], 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('games')
    .insert(game)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateGame = async (id: string, updates: Partial<Tables['games']['Update']>) => {
  const { data, error } = await supabase
    .from('games')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Player operations
export const addPlayer = async (player: Omit<Tables['players']['Insert'], 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('players')
    .insert(player)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getPlayersByGameId = async (gameId: string) => {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', gameId);
  
  if (error) throw error;
  return data;
};

// Rounds operations
export const createRounds = async (rounds: Omit<Tables['game_rounds']['Insert'], 'id'>[]) => {
  const { data, error } = await supabase
    .from('game_rounds')
    .insert(rounds)
    .select();
  
  if (error) throw error;
  return data;
};

export const updateRound = async (roundId: string, updates: Partial<Tables['game_rounds']['Update']>) => {
  const { data, error } = await supabase
    .from('game_rounds')
    .update(updates)
    .eq('id', roundId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Drinks operations
export const getDrinks = async () => {
  const { data, error } = await supabase
    .from('drinks')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
};

export const createDrink = async (drink: Omit<Tables['drinks']['Insert'], 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('drinks')
    .insert(drink)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Guesses operations
export const submitGuess = async (guess: Omit<Tables['guesses']['Insert'], 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('guesses')
    .insert(guess)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getGuessesByRoundId = async (roundId: string) => {
  const { data, error } = await supabase
    .from('guesses')
    .select('*, players(*)')
    .eq('round_id', roundId);
  
  if (error) throw error;
  return data;
};
