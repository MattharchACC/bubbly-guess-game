
import React, { useState, useEffect } from 'react';
import { Wine, GlassWater, Users, Star, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { multiplayer } from '@/services/multiplayer';
import { v4 as uuidv4 } from 'uuid';
import { Game } from '@/types/game';
import { toast } from "sonner";

const Landing = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  
  // Clear any existing game session when landing page loads
  useEffect(() => {
    // Remove current game session from localStorage
    localStorage.removeItem('gameSession');
    localStorage.removeItem('lastActiveSession');
    
    // Clear any player-specific data that might be stored
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      if (key.startsWith('player:') || 
          key.startsWith('playerName:') || 
          key.startsWith('deviceId:') || 
          key.startsWith('currentPlayerId:') || 
          key.startsWith('gameSession:')) {
        localStorage.removeItem(key);
      }
    }
    
    console.log("Cleared all game sessions and player data from localStorage");
  }, []);
  
  const startNewGame = async () => {
    setIsCreating(true);
    
    try {
      // Generate a unique game ID and session code
      const gameId = uuidv4();
      
      // Get a new unique session code from the backend
      const sessionCode = await multiplayer.generateSessionCode();
      
      // Force new device ID for each new game session to prevent host confusion
      const deviceId = uuidv4();
      localStorage.setItem('deviceId', deviceId);
      
      console.log(`Creating new game with new device ID: ${deviceId}`);
      
      // Create a basic game structure
      const initialGame: Game = {
        id: gameId,
        name: 'Prosecco Tasting Challenge',
        mode: 'pro', // Only using pro mode now
        hostId: deviceId, // Use the new device ID as host ID
        sessionCode,
        isComplete: false,
        currentRound: -1, // Not started yet
        roundTimeLimit: 60,
        enableTimeLimit: true,
        players: [],
        rounds: [],
        drinks: []
      };
      
      // Create the game session
      await multiplayer.createGameSession(initialGame);
      
      console.log(`New game created with session code: ${sessionCode}`);
      
      // Navigate to the unique game URL
      navigate(`/play/${sessionCode}`);
      
    } catch (error) {
      console.error("Error creating new game:", error);
      toast.error("Failed to create new game. Please try again.");
      setIsCreating(false);
    }
  };
  
  const joinExistingGame = () => {
    navigate('/join');
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
      
      <main className="container mx-auto py-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Create Your Blind Tasting Experience</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Host a fun and interactive blind tasting game for friends, family, or your next special occasion
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              onClick={startNewGame}
              size="lg"
              className="bg-primary text-white hover:bg-primary/90 text-lg px-8 py-6"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Game...
                </>
              ) : (
                'Create New Game'
              )}
            </Button>
            
            <Button
              onClick={joinExistingGame}
              variant="outline"
              size="lg"
              className="border-primary text-primary hover:bg-primary/10 text-lg px-8 py-6"
              disabled={isCreating}
            >
              Join Existing Game
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-white/80">
              <CardContent className="pt-6 text-center">
                <div className="bg-primary/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                  <GlassWater className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Simple Setup</h3>
                <p className="text-muted-foreground">
                  Create your game, add drinks, and invite friends with a shareable link
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80">
              <CardContent className="pt-6 text-center">
                <div className="bg-primary/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Multiplayer</h3>
                <p className="text-muted-foreground">
                  Players join from their own devices and submit guesses in real-time
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80">
              <CardContent className="pt-6 text-center">
                <div className="bg-primary/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Scoring</h3>
                <p className="text-muted-foreground">
                  Track scores automatically and see who has the best tasting skills
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-white/80 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
            <ol className="text-left space-y-4 max-w-2xl mx-auto">
              <li className="flex items-start gap-3">
                <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <span>Create a new game as the host and set up your drinks and rounds</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <span>Share your unique game link with participants</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <span>Players join the game from their own devices</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                <span>Start the game when at least two players have joined</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
                <span>See the results and find out who guessed correctly!</span>
              </li>
            </ol>
          </div>
        </div>
      </main>
      
      <footer className="border-t mt-12">
        <div className="py-6 px-4 container mx-auto text-center text-sm text-muted-foreground">
          Bubbly Blind Tasting Game © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default Landing;
