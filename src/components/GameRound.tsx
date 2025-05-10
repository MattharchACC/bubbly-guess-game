
import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, ArrowRight, Wine } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const GameRound: React.FC = () => {
  const { game, submitGuess, advanceRound, completeGame } = useGame();
  const [selectedTab, setSelectedTab] = useState<string>(game?.players[0]?.id || '');
  const [isDrinkSelected, setIsDrinkSelected] = useState<Record<string, boolean>>({});

  if (!game || game.currentRound < 0) return null;

  const currentRound = game.rounds[game.currentRound];
  const isLastRound = game.currentRound === game.rounds.length - 1;
  
  const handleSelect = (playerId: string, drinkId: string) => {
    submitGuess(playerId, currentRound.id, drinkId);
    setIsDrinkSelected({...isDrinkSelected, [playerId]: true});
    
    // For beginner mode, show if guess is correct
    if (game.mode === 'beginner') {
      const isCorrect = drinkId === currentRound.correctDrinkId;
      toast({
        title: isCorrect ? 'Correct!' : 'Incorrect!',
        description: isCorrect 
          ? 'You guessed the right drink!' 
          : `The correct drink was ${game.drinks.find(d => d.id === currentRound.correctDrinkId)?.name}`,
        variant: isCorrect ? 'default' : 'destructive',
      });
    }
  };

  const handleNext = () => {
    // Reset selection states
    setIsDrinkSelected({});
    
    if (isLastRound) {
      completeGame();
    } else {
      advanceRound();
    }
  };

  const allPlayersGuessed = game.players.every(
    player => Object.keys(player.guesses).includes(currentRound.id)
  );

  return (
    <div className="container mx-auto max-w-3xl animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="heading-lg">{game.name}</h1>
        <div className="text-sm font-medium text-muted-foreground">
          {game.mode === 'pro' ? 'Pro Mode' : 'Beginner Mode'}
        </div>
      </div>
      
      <div className="bg-muted/30 p-4 rounded-xl mb-6 text-center">
        <h2 className="heading-md">{currentRound.name}</h2>
        <p className="text-muted-foreground">
          Round {game.currentRound + 1} of {game.rounds.length}
        </p>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Tasting Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 mb-4">
              {game.players.map(player => (
                <TabsTrigger key={player.id} value={player.id}>
                  {player.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {game.players.map(player => (
              <TabsContent key={player.id} value={player.id} className="animate-fade-in">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium">{player.name}'s Selection</h3>
                  <p className="text-sm text-muted-foreground">
                    Select which drink you think this is
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {game.drinks.map(drink => {
                    const isSelected = player.guesses[currentRound.id] === drink.id;
                    
                    return (
                      <button
                        key={drink.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected 
                            ? 'border-secondary bg-secondary/10 ring-2 ring-secondary' 
                            : 'border-border hover:border-muted-foreground'
                        }`}
                        onClick={() => handleSelect(player.id, drink.id)}
                        disabled={!!player.guesses[currentRound.id]}
                      >
                        <div className="flex items-center">
                          <div className="mr-3 rounded-full bg-muted/50 p-2">
                            <Wine className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{drink.name}</div>
                            {drink.description && (
                              <div className="text-sm text-muted-foreground">{drink.description}</div>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="ml-auto h-5 w-5 text-secondary" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleNext} 
            disabled={!allPlayersGuessed}
            className="btn-primary"
          >
            {isLastRound ? 'Finish Game' : 'Next Round'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
      
      <div className="text-center text-sm text-muted-foreground">
        {allPlayersGuessed 
          ? 'All players have made their selections. Ready to continue!' 
          : 'Waiting for all players to make their selections...'}
      </div>
    </div>
  );
};

export default GameRound;
