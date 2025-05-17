import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowRight, Wine, X, Share2, Users, StopCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import RoundTimer from '@/components/RoundTimer';
import TastingCards from '@/components/TastingCards';

const GameRound: React.FC = () => {
  const { 
    game, 
    submitGuess, 
    advanceRound, 
    completeGame, 
    endGame, 
    isHost, 
    currentPlayer, 
    shareableLink
  } = useGame();
  const [showResults, setShowResults] = useState<boolean>(false);
  
  useEffect(() => {
    // Reset results when advancing to new round
    setShowResults(false);
  }, [game?.currentRound]);

  if (!game || game.currentRound < 0) return null;

  const currentRound = game.rounds[game.currentRound];
  const isLastRound = game.currentRound === game.rounds.length - 1;
  
  const handleSelect = (playerId: string, drinkId: string) => {
    // Enhanced logging for debugging
    console.log('handleSelect called with:', { 
      playerId, 
      drinkId, 
      currentPlayerId: currentPlayer?.id,
      isPlayerMatchingCurrent: currentPlayer?.id === playerId,
      isHost,
      currentPlayerIsHost: currentPlayer?.isHost
    });
    
    // Make sure the user is submitting for themselves and not someone else
    if (!currentPlayer || currentPlayer.id !== playerId) {
      console.error(`Cannot submit guess: Current player (${currentPlayer?.id}) does not match selected player (${playerId})`);
      toast({
        title: "Cannot submit guess",
        description: "You can only make selections for yourself",
        variant: "destructive"
      });
      return;
    }
    
    // Hosts should not be able to submit guesses
    if (currentPlayer.isHost) {
      console.error("Host attempted to submit a guess");
      toast({
        title: "Cannot submit guess",
        description: "Hosts are not allowed to make guesses",
        variant: "destructive"
      });
      return;
    }
    
    // Make sure game and round exist
    if (!game || !currentRound) {
      toast({
        title: "Cannot make selection",
        description: "Error processing your selection. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    // Submit the guess
    console.log(`Submitting guess for player ${playerId} (${currentPlayer.name}) and drink ${drinkId}`);
    submitGuess(playerId, currentRound.id, drinkId);
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
    setShowResults(false);
    
    if (isLastRound) {
      completeGame();
    } else {
      advanceRound();
    }
  };

  const allPlayersGuessed = game.players.every(
    player => player.isHost || Object.keys(player.guesses).includes(currentRound.id)
  );

  return (
    <div className="container mx-auto max-w-3xl animate-fade-in px-3">
      <div className="flex justify-between items-center mb-4">
        <h1 className="heading-lg">{game?.name}</h1>
        <div className="text-sm font-medium text-muted-foreground">
          {game?.mode === 'pro' ? 'Pro Mode' : 'Beginner Mode'}
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm">{game?.players.length} Players</span>
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
        <h2 className="heading-md">{game && game.currentRound >= 0 ? game.rounds[game.currentRound].name : ''}</h2>
        <p className="text-muted-foreground">
          Round {game && game.currentRound >= 0 ? game.currentRound + 1 : 0} of {game?.rounds.length}
        </p>
      </div>
      
      <RoundTimer />
      
      <Card className="mb-8 shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl">Tasting Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <TastingCards 
            showResults={showResults} 
            onSelect={handleSelect} 
          />
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t p-4">
          {isHost && (
            <Button 
              onClick={endGame} 
              variant="destructive"
              className="rounded-full text-sm mr-auto"
            >
              <StopCircle className="h-4 w-4 mr-1" />
              End Game
            </Button>
          )}

          {allPlayersGuessed && game?.mode === 'beginner' && !showResults && isHost && (
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
              disabled={!allPlayersGuessed || (game?.mode === 'beginner' && !showResults)}
              className="btn-primary text-sm"
            >
              {game && game.currentRound === game.rounds.length - 1 ? 'Finish Game' : 'Next Round'}
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
      
      <div className="text-center text-sm text-muted-foreground mb-8">
        {!allPlayersGuessed 
          ? 'Waiting for all players to make their selections...'
          : game?.mode === 'beginner' && !showResults && isHost
            ? 'All players have made their selections. Ready to reveal results!'
            : isHost 
              ? 'Ready to continue to the next round.'
              : 'Waiting for host to advance the game...'}
      </div>
    </div>
  );
};

export default GameRound;
