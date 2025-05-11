
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const JoinGame: React.FC = () => {
  const [sessionCode, setSessionCode] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const { joinGame } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check URL for join code with improved error handling
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const joinCode = params.get('join');
      
      if (joinCode) {
        console.log("Join code detected:", joinCode);
        setSessionCode(joinCode);
      }
    } catch (error) {
      console.error("Error parsing URL parameters:", error);
    }
  }, [location]);
  
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionCode.trim() || !playerName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both a session code and your name",
        variant: "destructive"
      });
      return;
    }
    
    setIsJoining(true);
    
    try {
      const result = await joinGame(sessionCode.trim(), playerName.trim());
      
      if (!result.success) {
        toast({
          title: "Failed to join game",
          description: result.error || "Could not connect to the game session",
          variant: "destructive"
        });
      } else {
        // Successfully joined
        navigate('/');
      }
    } catch (error) {
      console.error("Join error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };
  
  return (
    <div className="container mx-auto max-w-md py-12 animate-fade-in">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="heading-lg">Join Game</CardTitle>
          <CardDescription>
            Enter the session code to join an existing game
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="session-code" className="block text-sm font-medium mb-1">
                Session Code
              </label>
              <Input
                id="session-code"
                placeholder="Enter 6-digit code"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                className="rounded-xl"
                maxLength={6}
              />
            </div>
            
            <div>
              <label htmlFor="player-name" className="block text-sm font-medium mb-1">
                Your Name
              </label>
              <Input
                id="player-name"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleJoin} 
            disabled={isJoining || !sessionCode.trim() || !playerName.trim()}
            className="btn-primary"
          >
            {isJoining ? (
              "Connecting..."
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Join Game
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default JoinGame;
