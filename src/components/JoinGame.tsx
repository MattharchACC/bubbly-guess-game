
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, Users } from 'lucide-react';

interface JoinGameProps {
  onJoining?: () => void;
  onJoinError?: (error: string) => void;
}

const JoinGame: React.FC<JoinGameProps> = ({ onJoining, onJoinError }) => {
  const { joinGame } = useGame();
  const location = useLocation();
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Get join code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlJoinCode = params.get('join');
    
    if (urlJoinCode) {
      console.log("JoinGame component - Found join code in URL:", urlJoinCode);
      setJoinCode(urlJoinCode);
    } else {
      // Try to get from localStorage if not in URL
      const storedJoinCode = localStorage.getItem('lastJoinedSession');
      if (storedJoinCode) {
        console.log("JoinGame component - Found stored join code:", storedJoinCode);
        setJoinCode(storedJoinCode);
      }
    }

    // Get last used player name if available
    const storedName = localStorage.getItem('playerName');
    if (storedName) {
      setPlayerName(storedName);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!joinCode.trim()) {
      setError('Please enter a join code');
      onJoinError?.('Please enter a join code');
      return;
    }
    
    if (!playerName.trim()) {
      setError('Please enter your name');
      onJoinError?.('Please enter your name');
      return;
    }
    
    setError(null);
    setJoining(true);
    if (onJoining) onJoining();
    
    // Store name for future use
    localStorage.setItem('playerName', playerName);
    
    console.log(`Attempting to join game with code: ${joinCode} as: ${playerName}`);
    
    try {
      const { success, error: joinError } = await joinGame(joinCode, playerName);
      
      if (!success) {
        console.error("Join error:", joinError);
        setError(joinError || 'Failed to join game');
        setJoining(false);
        if (onJoinError) onJoinError(joinError || 'Failed to join game');
      }
    } catch (err) {
      console.error("Error joining game:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setJoining(false);
      if (onJoinError) onJoinError(errorMessage);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Join Tasting Game</CardTitle>
        <CardDescription>
          Enter the game code provided by the host to join a tasting session
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="joinCode">Game Code</Label>
            <Input
              id="joinCode"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              className="text-center uppercase tracking-widest font-semibold"
              maxLength={6}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="playerName">Your Name</Label>
            <Input
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={joining || !joinCode || !playerName}
          >
            {joining ? 'Joining...' : 'Join Game'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-4">
        <div className="text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-1">
            <Users className="h-4 w-4" /> 
            <span>Don't have a code? Ask the host to share it with you.</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default JoinGame;
