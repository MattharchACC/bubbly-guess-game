
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, UserPlus, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

const JoinGame: React.FC = () => {
  const [sessionCode, setSessionCode] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
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
    setError('');
    
    if (!sessionCode.trim()) {
      setError("Please enter the session code");
      return;
    }
    
    if (!playerName.trim()) {
      setError("Please enter your player name");
      return;
    }
    
    setIsJoining(true);
    
    try {
      // Log the exact input values for debugging
      console.log(`Attempting to join with: session=${sessionCode.trim()}, name=${playerName.trim()}`);
      
      const result = await joinGame(sessionCode.trim(), playerName.trim());
      
      if (!result.success) {
        setError(result.error || "Could not connect to the game session");
        toast({
          title: "Failed to join game",
          description: result.error || "Could not connect to the game session",
          variant: "destructive"
        });
        setIsJoining(false); // Make sure to reset joining state on error
      } else {
        // Successfully joined
        toast({
          title: "Joined game",
          description: "Successfully joined the game session"
        });
        navigate('/');
      }
    } catch (error) {
      console.error("Join error:", error);
      setError("An unexpected error occurred");
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      setIsJoining(false); // Reset joining state on error
    }
  };
  
  return (
    <div className="container mx-auto max-w-md py-12 animate-fade-in">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="heading-lg">Join Game</CardTitle>
          <CardDescription>
            Enter the session code and your name exactly as created by the host
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
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
              <p className="text-sm text-muted-foreground mt-1">
                Use the exact player name created by the host
              </p>
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
