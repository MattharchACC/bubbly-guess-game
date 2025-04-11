
import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Drink, GameMode } from '@/types/game';
import { Plus, Trash2, Wine } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const GameSetup: React.FC = () => {
  const { setUpGame } = useGame();
  const [gameName, setGameName] = useState<string>('Prosecco Tasting Challenge');
  const [gameMode, setGameMode] = useState<GameMode>('beginner');
  const [roundCount, setRoundCount] = useState<number>(6);
  const [drinks, setDrinks] = useState<Drink[]>([
    // Default Prosecco examples
    { id: uuidv4(), name: 'La Marca Prosecco', description: 'Fresh and clean' },
    { id: uuidv4(), name: 'Mionetto Prosecco', description: 'Fruity with apple notes' },
    { id: uuidv4(), name: 'Riondo Prosecco', description: 'Crisp and light' },
    { id: uuidv4(), name: 'Zonin Prosecco', description: 'Dry with citrus hints' },
    { id: uuidv4(), name: 'Ruffino Prosecco', description: 'Elegant with peach notes' },
    { id: uuidv4(), name: 'Santa Margherita Prosecco', description: 'Delicate and aromatic' },
  ]);
  const [newDrinkName, setNewDrinkName] = useState<string>('');
  const [newDrinkDescription, setNewDrinkDescription] = useState<string>('');

  const addDrink = () => {
    if (newDrinkName.trim() === '') return;
    
    const newDrink: Drink = {
      id: uuidv4(),
      name: newDrinkName,
      description: newDrinkDescription !== '' ? newDrinkDescription : undefined,
    };
    
    setDrinks([...drinks, newDrink]);
    setNewDrinkName('');
    setNewDrinkDescription('');
  };

  const removeDrink = (id: string) => {
    setDrinks(drinks.filter(drink => drink.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUpGame(gameName, gameMode, drinks, roundCount);
  };

  return (
    <div className="container mx-auto max-w-3xl animate-fade-in">
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="heading-lg">Set Up Your Tasting Game</CardTitle>
          <CardDescription>Configure your game settings and add drinks</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="gameName">Game Name</Label>
              <Input
                id="gameName"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-3">
              <Label>Game Mode</Label>
              <RadioGroup value={gameMode} onValueChange={(value) => setGameMode(value as GameMode)} className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="beginner" id="beginner" />
                  <Label htmlFor="beginner" className="cursor-pointer">Beginner Mode</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pro" id="pro" />
                  <Label htmlFor="pro" className="cursor-pointer">Pro Mode</Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-muted-foreground">
                {gameMode === 'beginner' 
                  ? 'Players receive immediate feedback after each round.' 
                  : 'Results are hidden until the end of the game.'}
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="roundCount">Number of Rounds</Label>
              <Input
                id="roundCount"
                type="number"
                min={1}
                max={drinks.length}
                value={roundCount}
                onChange={(e) => setRoundCount(parseInt(e.target.value) || 1)}
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-3">
              <Label>Drinks</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {drinks.map(drink => (
                  <div key={drink.id} className="flex items-center justify-between p-3 border rounded-xl">
                    <div>
                      <p className="font-medium">{drink.name}</p>
                      {drink.description && <p className="text-sm text-muted-foreground">{drink.description}</p>}
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeDrink(drink.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-4 border rounded-xl bg-muted/30">
              <Label>Add New Drink</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Wine className="h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Drink name"
                    value={newDrinkName}
                    onChange={(e) => setNewDrinkName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <Input
                  placeholder="Description (optional)"
                  value={newDrinkDescription}
                  onChange={(e) => setNewDrinkDescription(e.target.value)}
                  className="rounded-xl"
                />
                <Button 
                  type="button" 
                  onClick={addDrink} 
                  variant="outline" 
                  className="w-full"
                  disabled={newDrinkName.trim() === ''}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Drink
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button 
            type="submit"
            onClick={handleSubmit}
            disabled={drinks.length < roundCount || drinks.length === 0 || roundCount <= 0}
            className="btn-primary"
          >
            Create Game
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default GameSetup;
