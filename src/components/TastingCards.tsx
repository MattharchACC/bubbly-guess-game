
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
    // Set selected tab to current player's ID or first player if currentPlayer is null
    if (currentPlayer && currentPlayer.id) {
      setSelectedTab(currentPlayer.id);
      console.log("Selected tab set to current player:", currentPlayer.id);
    } else if (game?.players[0]?.id) {
      setSelectedTab(game.players[0].id);
      console.log("Selected tab set to first player:", game.players[0].id);
    }
  }, [currentPlayer, game]);
  
  if (!game || !game.rounds || game.currentRound < 0) {
    console.log("TastingCards: No game data available");
    return null;
  }
  
  const currentRound = game.rounds[game.currentRound];
  
  console.log("TastingCards - Current player:", currentPlayer?.id, currentPlayer?.name);
  console.log("TastingCards - Current player device ID:", currentPlayer?.deviceId);
  console.log("TastingCards - isHost:", isHost);
  
  // Filter players based on user role
  // Hosts can see all players, regular players can see themselves
  const visiblePlayers = isHost 
    ? game.players 
    : (currentPlayer ? [currentPlayer] : []);
  
  console.log("TastingCards - Visible players count:", visiblePlayers.length);
  
  // Make sure that if there are no visible players, we show placeholder content
  if (visiblePlayers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-amber-800 mb-4">
          <p className="text-sm font-medium">You are connected to the game but your player identity could not be determined. 
             You can view the game but cannot make selections.</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium">Current Round</h3>
            <p className="text-sm text-muted-foreground">
              {game.rounds[game.currentRound]?.name || `Round ${game.currentRound + 1}`}
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {game.drinks.map(drink => (
              <div
                key={drink.id}
                className="p-4 rounded-xl border border-border opacity-70 mb-3"
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  console.log('TastingCards - Visible players:', visiblePlayers.map(p => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    hasGuessed: !!p.guesses[currentRound.id]
  })));
  
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
        const isPlayerHost = player.isHost;
        const isSelected = !!player.guesses[currentRound.id];
        const isCurrentPlayerTab = currentPlayer && currentPlayer.id === player.id;
        
        return (
          <TabsContent key={player.id} value={player.id} className="animate-fade-in">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">
                {player.name}'s Selection
                {isPlayerHost && ' (Host)'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isPlayerHost
                  ? 'Host is not allowed to make guesses'
                  : isSelected
                    ? 'Selection has been made'
                    : isCurrentPlayerTab
                      ? 'Select which drink you think this is'
                      : `Only ${player.name} can make this selection`
                }
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {game.drinks.map(drink => {
                const isSelected = player.guesses[currentRound.id] === drink.id;
                const isCorrect = drink.id === currentRound.correctDrinkId;
                const showFeedback = game.mode === 'beginner' && showResults && isSelected;
                
                // Only allow selection if:
                // 1. This is the current user's tab
                // 2. The current user is not a host
                // 3. The player has not already made a guess for this round
                const canMakeGuess = (
                  currentPlayer && 
                  currentPlayer.id === player.id && 
                  !isSelected && 
                  !currentPlayer.isHost
                );
                
                let feedbackClass = '';
                if (showFeedback) {
                  feedbackClass = isCorrect 
                    ? 'ring-2 ring-green-500 bg-green-50' 
                    : 'ring-2 ring-red-500 bg-red-50';
                }
                
                const handleDrinkSelect = () => {
                  if (canMakeGuess) {
                    console.log(`TastingCards: Selecting drink ${drink.name} (${drink.id}) for player ${player.name} (${player.id})`);
                    onSelect(player.id, drink.id);
                  }
                };
                
                return (
                  <button
                    key={drink.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected 
                        ? `border-secondary bg-secondary/10 ${feedbackClass}` 
                        : 'border-border hover:border-muted-foreground'
                    } mb-3 ${!canMakeGuess ? 'opacity-70 cursor-not-allowed' : ''}`}
                    onClick={handleDrinkSelect}
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
