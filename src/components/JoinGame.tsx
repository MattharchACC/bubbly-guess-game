
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from "sonner";
import { useGame } from '@/contexts/GameContext';

const formSchema = z.object({
  playerName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(20, { message: "Name cannot be longer than 20 characters." })
});

interface JoinGameProps {
  onJoining?: () => void;
  onJoinError?: (error: string) => void;
}

const JoinGame: React.FC<JoinGameProps> = ({ onJoining, onJoinError }) => {
  const [isJoining, setIsJoining] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { joinGame } = useGame();
  
  // Extract session code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setSessionCode(joinCode);
      console.log("Extracted join code from URL:", joinCode);
    }
  }, [location]);

  // Initialize form with react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playerName: ''
    }
  });
  
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!sessionCode.trim()) {
      toast.error("Please enter a valid session code.");
      return;
    }
    
    setIsJoining(true);
    // Call the onJoining callback if provided
    if (onJoining) onJoining();
    
    try {
      console.log(`Joining game with session code: ${sessionCode}, player name: ${values.playerName}`);
      
      // Clear any previous game data from local storage to prevent conflicts
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('player:') || key.startsWith('currentPlayerId:'))) {
          if (!key.includes(sessionCode)) {
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      const result = await joinGame(sessionCode, values.playerName);
      
      if (result.success) {
        // Store player name for this session code for recovery purposes
        localStorage.setItem(`playerName:${sessionCode}`, values.playerName);
        
        // Navigate to the game page
        navigate(`/play/${sessionCode}`);
      } else {
        // Call the onJoinError callback if provided and there's an error
        if (onJoinError) onJoinError(result.error || "Unknown error");

        toast.error("Failed to join game", {
          description: result.error || "Please check the session code and try again."
        });
      }
    } catch (error) {
      console.error("Error joining game:", error);
      
      // Call the onJoinError callback if provided
      if (onJoinError && error instanceof Error) onJoinError(error.message);

      toast.error("Failed to join game", {
        description: "An error occurred while trying to join the game."
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Join a Game</CardTitle>
          <CardDescription>Enter the session code and your name to join the game.</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="playerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Player Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <FormLabel>Session Code</FormLabel>
                <Input
                  type="text"
                  placeholder="Enter session code"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value)}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isJoining}>
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    Join Game
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="flex justify-between items-center">
          <Button variant="link" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default JoinGame;
