
import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { UserPlus, Users, Play } from 'lucide-react';

const PlayerRegistration: React.FC = () => {
  const { game, addPlayer, startGame } = useGame();
  const [playerName, setPlayerName] = useState<string>('');

  if (!game) return null;

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      addPlayer(playerName.trim());
      setPlayerName('');
    }
  };

  return (
    <div className="container mx-auto max-w-3xl animate-fade-in">
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="heading-lg">Add Players</CardTitle>
          <CardDescription>
            Add everyone who will be participating in "{game.name}"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddPlayer} className="flex space-x-2 mb-6">
            <Input
              placeholder="Enter player name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="rounded-xl"
            />
            <Button type="submit" className="btn-outline whitespace-nowrap">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Player
            </Button>
          </form>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Players ({game.players.length})
            </Label>
            
            {game.players.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {game.players.map((player) => (
                  <div key={player.id} className="p-3 border rounded-xl flex items-center">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mr-3">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{player.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground">
                No players added yet. Add players to begin the game.
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={startGame} 
            disabled={game.players.length === 0}
            className="btn-primary"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Game
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        <p>
          {game.mode === 'beginner' 
            ? 'In Beginner Mode, players will see if their guess was correct after each round.' 
            : 'In Pro Mode, players will not know if their guesses were correct until the end.'}
        </p>
      </div>
    </div>
  );
};

export default PlayerRegistration;
