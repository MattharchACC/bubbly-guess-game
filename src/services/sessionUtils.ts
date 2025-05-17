
import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a session code for joining games
 */
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
