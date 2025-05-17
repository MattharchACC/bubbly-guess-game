
import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Link, Users, AlertTriangle } from 'lucide-react';
import { toast } from "sonner";
import QRCode from 'react-qr-code';

const PlayerRegistration: React.FC = () => {
  const { game, addPlayer, startGame, isHost, shareableLink } = useGame();
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [canStart, setCanStart] = useState<boolean>(false);

  // Check if we have enough players to start
  useEffect(() => {
    if (game) {
      // We need at least 2 non-host players to start
      const nonHostPlayers = game.players.filter(p => !p.isHost);
      setCanStart(nonHostPlayers.length >= 2);
    }
  }, [game]);

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    
    addPlayer(newPlayerName.trim());
    setNewPlayerName('');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopySuccess(true);
    toast.success("Link copied to clipboard");
    
    setTimeout(() => {
      setCopySuccess(false);
    }, 2000);
  };

  if (!game) return null;

  const nonHostPlayers = game.players.filter(p => !p.isHost);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isHost ? 'Waiting for Players' : 'Waiting for Host to Start'}
          </CardTitle>
          <CardDescription>
            {isHost ? 'Share the link with players to join the game' : 'The host will start the game soon'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {isHost && (
            <>
              <div className="p-4 border rounded-md bg-muted/30">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium">Invite Link</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCopyLink}
                    className="gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                
                <div className="p-3 bg-white rounded border flex items-center gap-2 text-sm overflow-auto">
                  <Link className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">{shareableLink}</span>
                </div>
              </div>
              
              <div className="flex justify-center">
                <div className="p-3 bg-white rounded-lg">
                  <QRCode
                    size={150}
                    value={shareableLink}
                    viewBox={`0 0 150 150`}
                  />
                </div>
              </div>
              
              {!canStart && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md mt-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-amber-800">Need more players</span>
                    <p className="text-sm text-amber-700">
                      At least 2 players must join before starting the game.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Users className="h-5 w-5" /> Players
              </h3>
              <span className="text-sm text-muted-foreground">
                {nonHostPlayers.length} {nonHostPlayers.length === 1 ? 'player' : 'players'} joined
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {nonHostPlayers.map(player => (
                <div key={player.id} className="p-3 border rounded-md flex items-center justify-between">
                  <span>{player.name}</span>
                  <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                    Ready
                  </span>
                </div>
              ))}
            </div>
            
            {isHost && (
              <form onSubmit={handleAddPlayer} className="mt-4 flex gap-2">
                <Input
                  placeholder="Add player manually"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!newPlayerName.trim()}>
                  Add
                </Button>
              </form>
            )}
          </div>
        </CardContent>
        
        {isHost && (
          <CardFooter>
            <Button 
              onClick={startGame}
              disabled={!canStart}
              className="w-full"
            >
              Start Game ({nonHostPlayers.length} {nonHostPlayers.length === 1 ? 'player' : 'players'})
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default PlayerRegistration;
