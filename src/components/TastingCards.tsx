
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Wine } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

interface TastingCardsProps {
  showResults?: boolean;
  onSelect: (playerId: string, drinkId: string) => void;
}

const TastingCards: React.FC<TastingCardsProps> = ({ showResults = false, onSelect }) => {
  const { game, currentPlayer, isHost } = useGame();
  const [selectedTab, setSelectedTab] = React.useState<string>('');
  
  React.useEffect(() => {
    // Set selected tab to current player's ID
    if (currentPlayer && currentPlayer.id) {
      setSelectedTab(currentPlayer.id);
    } else if (game?.players[0]?.id) {
      setSelectedTab(game.players[0].id);
    }
  }, [currentPlayer, game]);
  
  if (!game || !game.rounds || game.currentRound < 0) return null;
  
  const currentRound = game.rounds[game.currentRound];
  
  // Fix: Always show current player's card or all cards for host
  let visiblePlayers = [];
  
  if (isHost) {
    // Host can see all players
    visiblePlayers = game.players;
  } else if (currentPlayer) {
    // Regular player can see their own card
    visiblePlayers = [currentPlayer];
  } else {
    // If currentPlayer is null but we have players, show the first non-host player
    // This is a fallback for when player assignment hasn't completed
    visiblePlayers = game.players.filter(p => !p.isHost).slice(0, 1);
  }
  
  // If no players are visible (likely because there are no players), show a message
  if (visiblePlayers.length === 0) {
    return (
      <div className="text-center p-8">
        <p>Loading player data...</p>
      </div>
    );
  }
  
  return (
    <Tabs value={selectedTab} onValueChange={setSelectedTab}>
      <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 mb-4 rounded-xl overflow-hidden bg-gray-100">
        {visiblePlayers.map(player => {
          const hasGuessed = player.isHost || !!player.guesses[currentRound.id];
          const isCurrentPlayer = currentPlayer && currentPlayer.id === player.id;
          
          return (
            <TabsTrigger 
              key={player.id} 
              value={player.id}
              className={`
                data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg
                ${hasGuessed ? 'text-green-600' : ''}
                ${player.isHost ? 'font-medium italic' : ''}
                ${isCurrentPlayer ? 'font-medium' : ''}
              `}
            >
              {player.name}
              {player.isHost && <span className="text-xs ml-1">(Host)</span>}
              {hasGuessed && <Check className="h-3 w-3 ml-1" />}
            </TabsTrigger>
          );
        })}
      </TabsList>
      
      {visiblePlayers.map(player => {
        const isCurrentUserPlayer = currentPlayer && currentPlayer.id === player.id;
        const isPlayerHost = player.isHost;
        
        return (
          <TabsContent key={player.id} value={player.id} className="animate-fade-in">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">
                {isCurrentUserPlayer ? 'Your Selection' : `${player.name}'s Selection`}
                {isPlayerHost && ' (Host)'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isCurrentUserPlayer
                  ? 'Select which drink you think this is'
                  : isPlayerHost
                    ? 'Host is not allowed to make guesses'
                    : `View ${player.name}'s selections`
                }
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {game.drinks.map(drink => {
                const isSelected = player.guesses[currentRound.id] === drink.id;
                const isCorrect = drink.id === currentRound.correctDrinkId;
                const showFeedback = game.mode === 'beginner' && showResults && isSelected;
                const canMakeGuess = !player.isHost && (!isSelected || !currentPlayer);
                
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
                    } mb-3 ${!canMakeGuess ? 'opacity-70 cursor-not-allowed' : ''}`}
                    onClick={() => canMakeGuess && onSelect(player.id, drink.id)}
                    disabled={!canMakeGuess}
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
                              <span className="ml-auto h-5 w-5 text-red-500">✗</span>
                            )
                          ) : (
                            <Check className="ml-auto h-5 w-5 text-secondary" />
                          )}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

export default TastingCards;
