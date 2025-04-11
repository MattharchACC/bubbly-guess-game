
import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Trophy, RotateCcw } from 'lucide-react';

const GameResults: React.FC = () => {
  const { game, resetGame } = useGame();

  if (!game || !game.isComplete) return null;

  // Calculate scores and create leaderboard
  const playerScores = game.players.map(player => {
    let score = 0;
    const playerGuesses = game.rounds.map(round => {
      const playerGuess = player.guesses[round.id];
      const isCorrect = playerGuess === round.correctDrinkId;
      if (isCorrect) score++;
      return {
        roundId: round.id,
        roundName: round.name,
        drinkGuessed: game.drinks.find(d => d.id === playerGuess)?.name || 'No guess',
        correctDrink: game.drinks.find(d => d.id === round.correctDrinkId)?.name || 'Unknown',
        isCorrect,
      };
    });

    return {
      player,
      score,
      guesses: playerGuesses,
    };
  });

  // Sort players by score (highest first)
  const sortedScores = [...playerScores].sort((a, b) => b.score - a.score);

  return (
    <div className="container mx-auto max-w-3xl animate-fade-in pb-12">
      <div className="text-center mb-8">
        <h1 className="heading-lg mb-2">{game.name} - Results</h1>
        <p className="text-muted-foreground">
          {game.mode === 'pro' ? 'Pro Mode' : 'Beginner Mode'} • {game.rounds.length} Rounds
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center">
          <div className="mr-4 bg-gold p-2 rounded-full">
            <Trophy className="h-6 w-6 text-black" />
          </div>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedScores.map((playerScore, index) => (
              <div 
                key={playerScore.player.id} 
                className={`flex items-center p-4 rounded-xl ${
                  index === 0 ? 'bg-gold/20 border-gold' : 'bg-muted/30'
                } border`}
              >
                <div className="text-2xl font-bold mr-4 w-8 text-center">
                  {index + 1}
                </div>
                <div className="mr-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    {playerScore.player.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{playerScore.player.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {playerScore.score} correct out of {game.rounds.length}
                  </div>
                </div>
                <div className="text-2xl font-bold">
                  {playerScore.score}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Round Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {game.rounds.map((round) => (
              <div key={round.id} className="border rounded-xl overflow-hidden">
                <div className="bg-muted p-3 flex justify-between items-center">
                  <h3 className="font-medium">{round.name}</h3>
                  <div className="text-sm">
                    Correct: {game.drinks.find(d => d.id === round.correctDrinkId)?.name}
                  </div>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {game.players.map((player) => {
                      const playerGuess = player.guesses[round.id];
                      const isCorrect = playerGuess === round.correctDrinkId;
                      
                      return (
                        <div key={player.id} className="flex items-center space-x-3 p-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{player.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Guessed: {game.drinks.find(d => d.id === playerGuess)?.name || 'No guess'}
                            </div>
                          </div>
                          <div>
                            {isCorrect ? (
                              <Check className="h-5 w-5 text-green-500" />
                            ) : (
                              <X className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={resetGame} className="btn-outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Start New Game
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default GameResults;
