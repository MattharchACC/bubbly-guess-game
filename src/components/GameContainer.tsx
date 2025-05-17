
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import GameSetup from './GameSetup';
import PlayerRegistration from './PlayerRegistration';
import GameRound from './GameRound';
import GameResults from './GameResults';
import { useToast } from '@/hooks/use-toast';

const GameContainer: React.FC = () => {
  const { game, isHost, currentPlayer } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Check URL for join code and redirect to join page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const joinCode = params.get('join');
    
    if (joinCode) {
      console.log("Join code detected in main page, redirecting:", joinCode);
      navigate(`/join?join=${joinCode}`, { replace: true });
    }
  }, [location, navigate]);

  // Show a toast if player has successfully joined
  useEffect(() => {
    if (game && currentPlayer && !currentPlayer.isHost) {
      console.log("Player has joined the game:", currentPlayer.name);
      toast({
        title: "Joined game",
        description: `You've joined as ${currentPlayer.name}`
      });
    }
  }, [currentPlayer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // If we have a game but no current player, show a message
  if (game && !currentPlayer) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg max-w-md mx-auto">
          <h2 className="text-xl font-medium mb-2">Unable to identify your player</h2>
          <p className="mb-4">
            You appear to be connected to a game session, but we couldn't identify which player you are.
          </p>
          <p className="text-sm text-muted-foreground">
            Try using the join link again or ask the host to share a new link.
          </p>
        </div>
      </div>
    );
  }

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
