
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import GameSetup from './GameSetup';
import PlayerRegistration from './PlayerRegistration';
import GameRound from './GameRound';
import GameResults from './GameResults';

const GameContainer: React.FC = () => {
  const { game, isHost, currentPlayer } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check URL for join code and redirect to join page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const joinCode = params.get('join');
    
    if (joinCode) {
      console.log("Join code detected in main page, redirecting:", joinCode);
      navigate(`/join?join=${joinCode}`, { replace: true });
    }
  }, [location, navigate]);

  // Log important state information for debugging
  useEffect(() => {
    if (game && currentPlayer) {
      console.log("Game Container - Current state:", {
        isHost,
        currentPlayer: {
          id: currentPlayer.id,
          name: currentPlayer.name,
          isHost: currentPlayer.isHost
        },
        gameMode: game.mode,
        currentRound: game.currentRound,
        playersCount: game.players.length
      });
    }
  }, [game, currentPlayer, isHost]);

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
