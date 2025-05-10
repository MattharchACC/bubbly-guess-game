
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import GameSetup from './GameSetup';
import PlayerRegistration from './PlayerRegistration';
import GameRound from './GameRound';
import GameResults from './GameResults';

const GameContainer: React.FC = () => {
  const { game } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check URL for join code
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const joinCode = params.get('join');
    
    if (joinCode) {
      navigate(`/join?join=${joinCode}`, { replace: true });
    }
  }, [location]);

  // Determine which component to show based on game state
  if (!game) {
    return <GameSetup />;
  }

  if (game.currentRound === -1) {
    return <PlayerRegistration />;
  }

  if (game.isComplete) {
    return <GameResults />;
  }

  return <GameRound />;
};

export default GameContainer;
