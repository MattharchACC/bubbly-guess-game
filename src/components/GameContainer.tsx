
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import GameSetup from './GameSetup';
import PlayerRegistration from './PlayerRegistration';
import GameRound from './GameRound';
import GameResults from './GameResults';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const GameContainer: React.FC = () => {
  const { game, isHost, currentPlayer, joinGame } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRecoveringPlayer, setIsRecoveringPlayer] = useState(false);
  
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
      console.log("Player details:", {
        id: currentPlayer.id,
        name: currentPlayer.name,
        deviceId: currentPlayer.deviceId,
        assignedToDeviceId: currentPlayer.assignedToDeviceId
      });
      
      // Store player ID in localStorage with game session code to help with recovery
      if (game.sessionCode) {
        localStorage.setItem(`player:${game.sessionCode}`, currentPlayer.id);
        localStorage.setItem(`playerName:${game.sessionCode}`, currentPlayer.name);
        console.log(`Stored player ID (${currentPlayer.id}) and name (${currentPlayer.name}) in localStorage for session ${game.sessionCode}`);
      }
      
      toast({
        title: "Joined game",
        description: `You've joined as ${currentPlayer.name}`
      });
    }
  }, [currentPlayer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Log important state information for debugging
  useEffect(() => {
    if (game) {
      console.log("Game Container - Current state:", {
        isHost,
        currentPlayer: currentPlayer ? {
          id: currentPlayer.id,
          name: currentPlayer.name,
          isHost: currentPlayer.isHost,
          deviceId: currentPlayer.deviceId,
          assignedToDeviceId: currentPlayer.assignedToDeviceId
        } : 'No current player',
        gameMode: game.mode,
        currentRound: game.currentRound,
        playersCount: game.players.length,
        sessionCode: game.sessionCode
      });
      
      // Log all players for debugging
      console.log("All players in game:", game.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        deviceId: p.deviceId,
        assignedToDeviceId: p.assignedToDeviceId
      })));
    }
  }, [game, currentPlayer, isHost]);

  // Attempt to recover player identity if we have a game but no current player
  useEffect(() => {
    // If we have a game but no current player, try to recover player identity
    const recoverPlayer = async () => {
      if (game && !currentPlayer && game.sessionCode) {
        setIsRecoveringPlayer(true);
        console.log("Attempting to recover player identity for session:", game.sessionCode);
        
        // Check if we have stored player ID in localStorage
        const playerId = localStorage.getItem(`player:${game.sessionCode}`);
        const playerName = localStorage.getItem(`playerName:${game.sessionCode}`);
        
        if (playerId) {
          console.log("Found stored player ID:", playerId);
          
          // Find the player in the game
          const player = game.players.find(p => p.id === playerId);
          
          if (player) {
            console.log("Found player in game, attempting to rejoin:", player.name);
            
            // Re-join the game with the stored player info
            try {
              const result = await joinGame(game.sessionCode, player.name);
              console.log("Rejoin result:", result);
              
              if (result.success) {
                toast({
                  title: "Reconnected",
                  description: `Welcome back, ${player.name}!`
                });
              } else {
                toast({
                  title: "Reconnection failed",
                  description: result.error || "Could not restore your player identity",
                  variant: "destructive"
                });
              }
            } catch (error) {
              console.error("Error rejoining game:", error);
            }
          } else if (playerName) {
            // If we have the player name but not the player object, try rejoining with the name
            console.log("Player not found in game, but we have the name. Attempting to rejoin as:", playerName);
            
            try {
              const result = await joinGame(game.sessionCode, playerName);
              console.log("Rejoin by name result:", result);
              
              if (result.success) {
                toast({
                  title: "Reconnected",
                  description: `Welcome back, ${playerName}!`
                });
              } else {
                toast({
                  title: "Reconnection failed",
                  description: result.error || "Could not restore your player identity",
                  variant: "destructive"
                });
              }
            } catch (error) {
              console.error("Error rejoining game by name:", error);
            }
          }
        }
        
        setIsRecoveringPlayer(false);
      }
    };
    
    recoverPlayer();
  }, [game, currentPlayer, joinGame, toast]);

  // If we're still trying to recover the player
  if (isRecoveringPlayer) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="pt-6 text-center p-6">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Reconnecting to game session...</p>
          <p className="text-sm text-muted-foreground mt-2">Please wait while we restore your player data</p>
        </CardContent>
      </Card>
    );
  }

  // If we have a game but no current player, show a message
  if (game && !currentPlayer) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg max-w-md mx-auto">
          <h2 className="text-xl font-medium mb-2">Unable to identify your player</h2>
          <p className="mb-4">
            You appear to be connected to a game session, but we couldn't identify which player you are.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Try using the join link again or ask the host to share a new link.
          </p>
          <Button 
            onClick={() => navigate(`/join?join=${game.sessionCode}`, { replace: true })}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Try joining again
          </Button>
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
