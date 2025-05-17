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
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from "sonner";
import { SyncEvent } from '@/types/game';
import { multiplayer } from '@/services/multiplayer';

const GameContainer: React.FC = () => {
  const { game, isHost, currentPlayer, joinGame } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  const [isRecoveringPlayer, setIsRecoveringPlayer] = useState(false);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);
  
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
      
      // Store comprehensive player data in localStorage with game session code to help with recovery
      if (game.sessionCode) {
        localStorage.setItem(`player:${game.sessionCode}`, currentPlayer.id);
        localStorage.setItem(`playerName:${game.sessionCode}`, currentPlayer.name);
        localStorage.setItem(`deviceId:${game.sessionCode}`, currentPlayer.deviceId || '');
        localStorage.setItem(`gameSession:${game.sessionCode}`, game.id);
        localStorage.setItem(`currentPlayerId:${game.id}`, currentPlayer.id);
        
        console.log(`Stored comprehensive player data in localStorage for session ${game.sessionCode}`);
      }
      
      // Notify host that player has joined (just in case)
      if (multiplayer && game.sessionCode) {
        multiplayer.emit(SyncEvent.PLAYER_JOINED, {
          sessionCode: game.sessionCode,
          playerId: currentPlayer.id,
          playerName: currentPlayer.name,
          deviceId: currentPlayer.deviceId,
          timestamp: Date.now()
        });
      }
      
      // Show toast notification only once when player joins
      if (!recoveryAttempted) {
        toast.success(`Joined as ${currentPlayer.name}`, {
          description: "You've joined the game successfully"
        });
      }
    }
  }, [currentPlayer?.id, game, recoveryAttempted]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (game && !currentPlayer && game.sessionCode && !recoveryAttempted) {
        setIsRecoveringPlayer(true);
        setRecoveryAttempted(true);
        console.log("Attempting to recover player identity for session:", game.sessionCode);
        
        // Check if we have stored player ID for this specific session
        const playerId = localStorage.getItem(`player:${game.sessionCode}`);
        const playerName = localStorage.getItem(`playerName:${game.sessionCode}`);
        const deviceId = localStorage.getItem(`deviceId:${game.sessionCode}`);
        
        console.log("Recovery data from localStorage:", { playerId, playerName, deviceId });
        
        if (playerId && playerName) {
          console.log("Found stored player data:", { playerId, playerName });
          
          // Find the player in the game
          const player = game.players.find(p => p.id === playerId);
          
          if (player) {
            console.log("Found player in game, attempting to rejoin:", player.name);
            
            // Re-join the game with the stored player info to re-establish connection
            try {
              const result = await joinGame(game.sessionCode, player.name);
              console.log("Rejoin result:", result);
              
              if (result.success) {
                toast.success(`Welcome back, ${player.name}!`, {
                  description: "Your session has been restored"
                });
                
                // Notify host about reconnection
                multiplayer.emit(SyncEvent.PLAYER_JOINED, {
                  sessionCode: game.sessionCode,
                  playerId: player.id,
                  playerName: player.name,
                  deviceId: deviceId || '',
                  timestamp: Date.now()
                });
              } else {
                toast.error("Reconnection failed", {
                  description: result.error || "Could not restore your player identity"
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
                toast.success(`Welcome back, ${playerName}!`, {
                  description: "Your session has been restored"
                });
              } else {
                toast.error("Reconnection failed", {
                  description: result.error || "Could not restore your player identity"
                });
              }
            } catch (error) {
              console.error("Error rejoining game by name:", error);
            }
          }
        } else {
          console.log("No stored player data found for this session");
        }
        
        setIsRecoveringPlayer(false);
      }
    };
    
    recoverPlayer();
  }, [game, currentPlayer, joinGame, recoveryAttempted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Try to rejoin manually
  const handleManualRejoin = async () => {
    if (!game || !game.sessionCode) return;
    
    setIsRecoveringPlayer(true);
    const playerName = localStorage.getItem(`playerName:${game.sessionCode}`) || 
                       localStorage.getItem('playerName') || 
                       '';
                       
    if (playerName) {
      try {
        console.log("Attempting manual rejoin as:", playerName);
        const result = await joinGame(game.sessionCode, playerName);
        
        if (result.success) {
          toast.success(`Reconnected as ${playerName}`, {
            description: "You've rejoined the game successfully"
          });
        } else {
          toast.error("Rejoin failed", {
            description: result.error || "Could not rejoin the game"
          });
          
          // Redirect to join page
          navigate(`/join?join=${game.sessionCode}`, { replace: true });
        }
      } catch (error) {
        console.error("Error in manual rejoin:", error);
        toast.error("Rejoin error", {
          description: "An error occurred while trying to rejoin"
        });
      }
    } else {
      // No stored player name, redirect to join page
      navigate(`/join?join=${game.sessionCode}`, { replace: true });
    }
    
    setIsRecoveringPlayer(false);
  };

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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleManualRejoin}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try reconnecting
            </Button>
            <Button 
              onClick={() => navigate(`/join?join=${game.sessionCode}`, { replace: true })}
              variant="outline"
            >
              Join with a different name
            </Button>
          </div>
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
