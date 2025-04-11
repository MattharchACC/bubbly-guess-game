
import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, ArrowRight, Wine, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const GameRound: React.FC = () => {
  const { game, submitGuess, advanceRound, completeGame } = useGame();
  const [selectedTab, setSelectedTab] = useState<string>(game?.players[0]?.id || '');
  const [isDrinkSelected, setIsDrinkSelected] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState<boolean>(false);

  if (!game || game.currentRound < 0) return null;

  const currentRound = game.rounds[game.currentRound];
  const isLastRound = game.currentRound === game.rounds.length - 1;
  
  const handleSelect = (playerId: string, drinkId: string) => {
    submitGuess(playerId, currentRound.id, drinkId);
    setIsDrinkSelected({...isDrinkSelected, [playerId]: true});
  };

  const handleRevealResults = () => {
    setShowResults(true);
    
    // For beginner mode, show toast notification
    if (game.mode === 'beginner') {
      const correctDrink = game.drinks.find(d => d.id === currentRound.correctDrinkId);
      toast({
        title: 'Round Results',
        description: `The correct drink was ${correctDrink?.name}`,
      });
    }
  };

  const handleNext = () => {
    // Reset states for the next round
    setIsDrinkSelected({});
    setShowResults(false);
    
    if (isLastRound) {
      completeGame();
    } else {
      advanceRound();
    }
  };

  const allPlayersGuessed = game.players.every(
    player => Object.keys(player.guesses).includes(currentRound.id)
  );

  const renderDrinkOption = (drink, player) => {
    const isSelected = player.guesses[currentRound.id] === drink.id;
    const isCorrect = drink.id === currentRound.correctDrinkId;
    const showFeedback = game.mode === 'beginner' && showResults && isSelected;
    
    let feedbackClass = '';
    if (showFeedback) {
      feedbackClass = isCorrect 
        ? 'ring-2 ring-green-500 bg-green-50' 
        : 'ring-2 ring-red-500 bg-red-50';
    }

    return (
      <button
        key={drink.id}
        className={`p-4 rounded-xl border transition-all ${
          isSelected 
            ? `border-secondary bg-secondary/10 ${feedbackClass}` 
            : 'border-border hover:border-muted-foreground'
        } mb-3`}
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
            <>
              {showFeedback ? (
                isCorrect ? (
                  <Check className="ml-auto h-5 w-5 text-green-500" />
                ) : (
                  <X className="ml-auto h-5 w-5 text-red-500" />
                )
              ) : (
                <Check className="ml-auto h-5 w-5 text-secondary" />
              )}
            </>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="container mx-auto max-w-3xl animate-fade-in px-3">
      <div className="flex justify-between items-center mb-6">
        <h1 className="heading-lg">{game.name}</h1>
        <div className="text-sm font-medium text-muted-foreground">
          {game.mode === 'pro' ? 'Pro Mode' : 'Beginner Mode'}
        </div>
      </div>
      
      <div className="bg-muted/30 p-4 rounded-2xl mb-6 text-center">
        <h2 className="heading-md">{currentRound.name}</h2>
        <p className="text-muted-foreground">
          Round {game.currentRound + 1} of {game.rounds.length}
        </p>
      </div>
      
      <Card className="mb-8 shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl">Tasting Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 mb-4 rounded-xl overflow-hidden bg-gray-100">
              {game.players.map(player => (
                <TabsTrigger 
                  key={player.id} 
                  value={player.id}
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
                >
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
                
                <div className="grid grid-cols-1 gap-3">
                  {game.drinks.map(drink => renderDrinkOption(drink, player))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t p-4">
          {allPlayersGuessed && game.mode === 'beginner' && !showResults && (
            <Button 
              onClick={handleRevealResults}
              variant="outline"
              className="rounded-full text-sm"
            >
              Reveal Results
            </Button>
          )}
          
          <Button 
            onClick={handleNext} 
            disabled={!allPlayersGuessed || (game.mode === 'beginner' && !showResults)}
            className="btn-primary text-sm"
          >
            {isLastRound ? 'Finish Game' : 'Next Round'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
      
      <div className="text-center text-sm text-muted-foreground mb-8">
        {!allPlayersGuessed 
          ? 'Waiting for all players to make their selections...'
          : game.mode === 'beginner' && !showResults
            ? 'All players have made their selections. Ready to reveal results!'
            : 'Ready to continue to the next round.'}
      </div>
    </div>
  );
};

export default GameRound;
