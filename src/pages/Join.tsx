
import React, { useEffect, useState } from 'react';
import { Wine } from 'lucide-react';
import JoinGame from '@/components/JoinGame';
import { useGame } from '@/contexts/GameContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const Join = () => {
  const { game, currentPlayer, joinGame } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  // Process join code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const joinCode = params.get('join');
    
    if (joinCode) {
      console.log("Join page - Found join code in URL:", joinCode);
      localStorage.setItem('lastJoinedSession', joinCode);
    }
  }, [location]);
  
  // Log joining process to help with debugging
  useEffect(() => {
    console.log("Join page - Initial state:", { 
      hasGame: !!game, 
      hasCurrentPlayer: !!currentPlayer,
      gameId: game?.id,
      sessionCode: game?.sessionCode,
      currentPlayerId: currentPlayer?.id,
      currentPlayerName: currentPlayer?.name
    });
  }, [game, currentPlayer]);
  
  // If user has successfully joined a game, redirect them to the main game page
  useEffect(() => {
    if (game && currentPlayer) {
      setIsJoining(false);
      console.log("User has successfully joined the game, redirecting to main page");
      console.log("Join page - Current player data:", {
        id: currentPlayer.id,
        name: currentPlayer.name,
        isHost: currentPlayer.isHost,
        deviceId: currentPlayer.deviceId,
        assignedToDeviceId: currentPlayer.assignedToDeviceId
      });
      
      // Store player ID in localStorage with game session code for recovery
      if (game.sessionCode) {
        localStorage.setItem(`player:${game.sessionCode}`, currentPlayer.id);
        console.log(`Stored player ID (${currentPlayer.id}) in localStorage for session ${game.sessionCode}`);
        
        // Additionally store the player name for easier debugging and recovery
        localStorage.setItem(`playerName:${game.sessionCode}`, currentPlayer.name);
      }
      
      // Redirect to the unique game URL
      navigate(`/play/${game.sessionCode}`, { replace: true });
    }
  }, [game, currentPlayer, navigate]);
  
  // Handle joining state
  const handleJoining = () => {
    setIsJoining(true);
  };
  
  // Handle join errors
  const handleJoinError = (error: string) => {
    setIsJoining(false);
    setJoinError(error);
  };
  
  return (
    <div className="min-h-screen bg-bubbly-light">
      <header className="border-b bg-white/70 backdrop-blur-md sticky top-0 z-10">
        <div className="py-4 px-4 container mx-auto flex items-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-md">
              <Wine className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-medium">Prosecco Tasting Challenge</h1>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">Blind Tasting Game</div>
        </div>
      </header>
      
      <main className="py-6 container mx-auto">
        {isJoining ? (
          <Card className="max-w-md mx-auto p-6">
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Joining game session...</p>
              {joinError && (
                <p className="text-red-500 mt-2">{joinError}</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <JoinGame 
            onJoining={handleJoining} 
            onJoinError={handleJoinError}
          />
        )}
      </main>
      
      <footer className="border-t mt-12">
        <div className="py-6 px-4 container mx-auto text-center text-sm text-muted-foreground">
          Bubbly Blind Tasting Game © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default Join;
