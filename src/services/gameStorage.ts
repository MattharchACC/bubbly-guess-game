
import { Game } from '../types/game';

/**
 * Store game session in local storage
 */
export const storeGameSession = (game: Game | null): void => {
  if (game) {
    localStorage.setItem('gameSession', JSON.stringify(game));
    console.log(`Game session stored in localStorage: ${game.id}, with ${game.players.length} players`);
    
    // Also store the session code separately for easier recovery
    if (game.sessionCode) {
      localStorage.setItem('lastActiveSession', game.sessionCode);
    }
  } else {
    localStorage.removeItem('gameSession');
    console.log('Game session removed from localStorage');
  }
};

/**
 * Get stored game session from local storage
 */
export const getStoredGameSession = (): Game | null => {
  const storedGame = localStorage.getItem('gameSession');
  if (storedGame) {
    console.log('Found stored game session in localStorage');
    return JSON.parse(storedGame);
  }
  console.log('No stored game session found in localStorage');
  return null;
};
