
import React from 'react';
import { Wine, GlassWater, Users, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Landing = () => {
  const navigate = useNavigate();
  
  const startNewGame = () => {
    navigate('/game');
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
            >
              Create New Game
            </Button>
            
            <Button
              onClick={joinExistingGame}
              variant="outline"
              size="lg"
              className="border-primary text-primary hover:bg-primary/10 text-lg px-8 py-6"
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
                <span>Start the game and guide players through each tasting round</span>
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
