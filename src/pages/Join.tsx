
import React, { useEffect } from 'react';
import { Wine } from 'lucide-react';
import JoinGame from '@/components/JoinGame';
import { useGame } from '@/contexts/GameContext';
import { useLocation, useNavigate } from 'react-router-dom';

const Join = () => {
  const { game, currentPlayer } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  
  // If user has successfully joined a game, redirect them to the main game page
  useEffect(() => {
    if (game && currentPlayer) {
      console.log("User has successfully joined the game, redirecting to main page");
      navigate('/', { replace: true });
    }
  }, [game, currentPlayer, navigate]);
  
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
        <JoinGame />
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
