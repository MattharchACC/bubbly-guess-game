
import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { UserPlus, Users, Play, Share2, LinkIcon, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PlayerRegistration: React.FC = () => {
  const { game, addPlayer, startGame, shareableLink, isHost } = useGame();
  const [playerName, setPlayerName] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  if (!game) return null;

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      addPlayer(playerName.trim());
      setPlayerName('');
    }
  };
  
  const handleCopyLink = () => {
    if (shareableLink) {
      navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "Share this link with players to join the game"
      });
      
      setTimeout(() => setCopied(false), 3000);
    }
  };
  
  const handleShare = async () => {
    if (shareableLink) {
      try {
        if (navigator.share) {
          await navigator.share({
            title: `Join ${game.name}`,
            text: `Join my Bubbly blind tasting game!`,
            url: shareableLink
          });
        } else {
          handleCopyLink();
        }
      } catch (error) {
        console.error("Error sharing:", error);
      }
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
          {isHost && (
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
          )}

          <div className="space-y-4">
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
                    <span>
                      {player.name} 
                      {player.isHost && <span className="ml-2 text-xs text-muted-foreground">(Host)</span>}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground">
                No players added yet. Add players to begin the game.
              </p>
            )}
            
            {isHost && shareableLink && (
              <div className="mt-6 space-y-3">
                <Label>Invite Players</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted p-3 rounded-lg text-sm truncate">
                    {shareableLink}
                  </div>
                  <Button onClick={handleCopyLink} variant="outline" className="rounded-full" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleShare} variant="outline" className="rounded-full" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link or code with players to join the game from their devices
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          {isHost && (
            <Button 
              onClick={startGame} 
              disabled={game.players.length === 0}
              className="btn-primary"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Game
            </Button>
          )}
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
