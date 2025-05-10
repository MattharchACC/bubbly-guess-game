
import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, ArrowRight, Wine, X, Share2, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import RoundTimer from '@/components/RoundTimer';

const GameRound: React.FC = () => {
  const { game, submitGuess, advanceRound, completeGame, isHost, currentPlayer, shareableLink } = useGame();
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [isDrinkSelected, setIsDrinkSelected] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState<boolean>(false);
  
  useEffect(() => {
    // Set selected tab to current player's ID
    if (currentPlayer && currentPlayer.id) {
      setSelectedTab(currentPlayer.id);
    } else if (game?.players[0]?.id) {
      setSelectedTab(game.players[0].id);
    }
  }, [currentPlayer, game]);

  if (!game || game.currentRound < 0) return null;

  const currentRound = game.rounds[game.currentRound];
  const isLastRound = game.currentRound === game.rounds.length - 1;
  
  const handleSelect = (playerId: string, drinkId: string) => {
    submitGuess(playerId, currentRound.id, drinkId);
    setIsDrinkSelected({...isDrinkSelected, [playerId]: true});
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
          navigator.clipboard.writeText(shareableLink);
          toast({
            title: "Link copied",
            description: "Game link copied to clipboard"
          });
        }
      } catch (error) {
        console.error("Error sharing:", error);
      }
    }
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
  
  const canInteract = currentPlayer && game.currentRound >= 0 && !game.isComplete;

  const renderDrinkOption = (drink, player) => {
    const isCurrentUserPlayer = currentPlayer && currentPlayer.id === player.id;
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
        onClick={() => isCurrentUserPlayer && canInteract && !isSelected && handleSelect(player.id, drink.id)}
        disabled={!canInteract || !isCurrentUserPlayer || !!player.guesses[currentRound.id]}
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="heading-lg">{game.name}</h1>
        <div className="text-sm font-medium text-muted-foreground">
          {game.mode === 'pro' ? 'Pro Mode' : 'Beginner Mode'}
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm">{game.players.length} Players</span>
        </div>
        
        {shareableLink && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShare}
            className="rounded-full"
          >
            <Share2 className="h-4 w-4 mr-1" />
            Invite
          </Button>
        )}
      </div>
      
      <div className="bg-muted/30 p-4 rounded-2xl mb-4 text-center">
        <h2 className="heading-md">{currentRound.name}</h2>
        <p className="text-muted-foreground">
          Round {game.currentRound + 1} of {game.rounds.length}
        </p>
      </div>
      
      <RoundTimer />
      
      <Card className="mb-8 shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl">Tasting Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 mb-4 rounded-xl overflow-hidden bg-gray-100">
              {game.players.map(player => {
                const hasGuessed = !!player.guesses[currentRound.id];
                const isCurrentPlayer = currentPlayer && currentPlayer.id === player.id;
                
                return (
                  <TabsTrigger 
                    key={player.id} 
                    value={player.id}
                    className={`
                      data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg
                      ${hasGuessed ? 'text-green-600' : ''}
                      ${isCurrentPlayer ? 'font-medium' : ''}
                    `}
                  >
                    {player.name}
                    {hasGuessed && <Check className="h-3 w-3 ml-1" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            
            {game.players.map(player => {
              const isCurrentUserPlayer = currentPlayer && currentPlayer.id === player.id;
              
              return (
                <TabsContent key={player.id} value={player.id} className="animate-fade-in">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-medium">
                      {isCurrentUserPlayer ? 'Your Selection' : `${player.name}'s Selection`}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isCurrentUserPlayer 
                        ? 'Select which drink you think this is' 
                        : `View ${player.name}'s selections`
                      }
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {game.drinks.map(drink => renderDrinkOption(drink, player))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t p-4">
          {allPlayersGuessed && game.mode === 'beginner' && !showResults && isHost && (
            <Button 
              onClick={handleRevealResults}
              variant="outline"
              className="rounded-full text-sm"
            >
              Reveal Results
            </Button>
          )}
          
          {isHost && (
            <Button 
              onClick={handleNext} 
              disabled={!allPlayersGuessed || (game.mode === 'beginner' && !showResults)}
              className="btn-primary text-sm"
            >
              {isLastRound ? 'Finish Game' : 'Next Round'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
      
      <div className="text-center text-sm text-muted-foreground mb-8">
        {!allPlayersGuessed 
          ? 'Waiting for all players to make their selections...'
          : game.mode === 'beginner' && !showResults && isHost
            ? 'All players have made their selections. Ready to reveal results!'
            : isHost 
              ? 'Ready to continue to the next round.'
              : 'Waiting for host to advance the game...'}
      </div>
    </div>
  );
};

export default GameRound;
