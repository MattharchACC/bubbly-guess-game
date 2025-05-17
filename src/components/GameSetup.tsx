import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Drink, GameMode, DrinkAssignment } from '@/types/game';
import { Plus, Trash2, Wine, ArrowDown, ArrowUp, Clock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';

const GameSetup: React.FC = () => {
  const { setUpGame } = useGame();
  const [gameName, setGameName] = useState<string>('Prosecco Tasting Challenge');
  const [gameMode] = useState<GameMode>('pro'); // Fixed to pro mode only
  const [roundCount, setRoundCount] = useState<number>(6);
  const [enableTimeLimit, setEnableTimeLimit] = useState<boolean>(true);
  const [roundTimeLimit, setRoundTimeLimit] = useState<number>(60); // Default 60 seconds
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
  const [drinkAssignments, setDrinkAssignments] = useState<DrinkAssignment[]>([]);
  const [roundNames, setRoundNames] = useState<Record<string, string>>({});
  const [currentTab, setCurrentTab] = useState('drinks');

  // Generate round IDs and names when roundCount changes
  useEffect(() => {
    const generatedRoundNames: Record<string, string> = {};
    const newAssignments: DrinkAssignment[] = [];
    
    for (let i = 0; i < roundCount; i++) {
      const roundId = uuidv4();
      const roundName = `Round ${i + 1}`;
      generatedRoundNames[roundId] = roundName;
      
      // Initialize with no drink selected
      newAssignments.push({
        roundId,
        roundName,
        drinkId: '',
      });
    }
    
    setRoundNames(generatedRoundNames);
    setDrinkAssignments(newAssignments);
  }, [roundCount]);

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
    
    // Also remove this drink from any assignments
    setDrinkAssignments(drinkAssignments.map(assignment => 
      assignment.drinkId === id ? {...assignment, drinkId: ''} : assignment
    ));
  };

  const handleDrinkAssignment = (roundId: string, drinkId: string) => {
    setDrinkAssignments(drinkAssignments.map(assignment => 
      assignment.roundId === roundId ? {...assignment, drinkId} : assignment
    ));
  };

  const updateRoundName = (roundId: string, name: string) => {
    setRoundNames(prev => ({...prev, [roundId]: name}));
    
    setDrinkAssignments(drinkAssignments.map(assignment => 
      assignment.roundId === roundId ? {...assignment, roundName: name} : assignment
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if all rounds have drinks assigned
    const allAssigned = drinkAssignments.every(assignment => assignment.drinkId !== '');
    
    if (!allAssigned) {
      alert('Please assign a drink to each round');
      return;
    }
    
    // Create rounds with assigned drinks
    const rounds = drinkAssignments.map(assignment => ({
      id: assignment.roundId,
      name: assignment.roundName,
      correctDrinkId: assignment.drinkId,
      timeLimit: enableTimeLimit ? roundTimeLimit : 0, // Use 0 to indicate no time limit
    }));
    
    setUpGame(gameName, gameMode, drinks, roundCount, rounds);
  };

  // Move round up in the order (if not the first)
  const moveRoundUp = (index: number) => {
    if (index <= 0) return;
    
    const newAssignments = [...drinkAssignments];
    const temp = newAssignments[index];
    newAssignments[index] = newAssignments[index - 1];
    newAssignments[index - 1] = temp;
    
    setDrinkAssignments(newAssignments);
  };

  // Move round down in the order (if not the last)
  const moveRoundDown = (index: number) => {
    if (index >= drinkAssignments.length - 1) return;
    
    const newAssignments = [...drinkAssignments];
    const temp = newAssignments[index];
    newAssignments[index] = newAssignments[index + 1];
    newAssignments[index + 1] = temp;
    
    setDrinkAssignments(newAssignments);
  };

  // Check if we can create the game
  const canCreateGame = () => {
    return (
      drinks.length >= roundCount && 
      drinks.length > 0 && 
      roundCount > 0 && 
      drinkAssignments.every(assignment => assignment.drinkId !== '')
    );
  };

  // Format time in minutes and seconds
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="container mx-auto max-w-3xl animate-fade-in">
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="heading-lg">Set Up Your Tasting Game</CardTitle>
          <CardDescription>Configure your game settings and assign drinks to rounds</CardDescription>
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

            {/* Game mode section removed since we only use Pro mode now */}
            <div className="space-y-3">
              <Label>Game Mode: Professional</Label>
              <p className="text-sm text-muted-foreground">
                Results are hidden until the end of the game.
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

            {/* Add time limit toggle checkbox */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="enableTimeLimit" 
                  checked={enableTimeLimit} 
                  onCheckedChange={(checked) => setEnableTimeLimit(checked as boolean)}
                />
                <Label htmlFor="enableTimeLimit" className="cursor-pointer">Enable Round Time Limit</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {enableTimeLimit 
                  ? 'Each round will have a time limit for players to make their selection.' 
                  : 'Players will have unlimited time to make their selection for each round.'}
              </p>
            </div>

            {/* Show time limit settings only if enabled */}
            {enableTimeLimit && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="roundTimeLimit" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Round Time Limit: {formatTime(roundTimeLimit)}
                  </Label>
                  <span className="text-sm text-muted-foreground">{roundTimeLimit} seconds</span>
                </div>
                <div className="px-2">
                  <Slider
                    id="roundTimeLimit" 
                    defaultValue={[roundTimeLimit]}
                    min={10}
                    max={300}
                    step={5}
                    onValueChange={(value) => setRoundTimeLimit(value[0])}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10s</span>
                  <span>1m</span>
                  <span>2m</span>
                  <span>3m</span>
                  <span>5m</span>
                </div>
              </div>
            )}

            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="drinks">Drinks</TabsTrigger>
                <TabsTrigger value="rounds">Round Assignment</TabsTrigger>
              </TabsList>
              
              <TabsContent value="drinks" className="mt-4 space-y-4">
                <div className="space-y-3">
                  <Label>Available Drinks</Label>
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
              </TabsContent>
              
              <TabsContent value="rounds" className="mt-4 space-y-5">
                <div className="space-y-3">
                  <Label>Assign Drinks to Rounds</Label>
                  <p className="text-sm text-muted-foreground">Select which drink will be served in each round</p>
                  
                  {drinkAssignments.map((assignment, index) => (
                    <div key={assignment.roundId} className="p-4 border rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <Input
                            value={roundNames[assignment.roundId] || `Round ${index + 1}`}
                            onChange={(e) => updateRoundName(assignment.roundId, e.target.value)}
                            className="font-medium rounded-xl max-w-[200px]"
                          />
                        </div>
                        <div className="flex space-x-1">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => moveRoundUp(index)}
                            disabled={index === 0}
                            className="h-8 w-8"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => moveRoundDown(index)}
                            disabled={index === drinkAssignments.length - 1}
                            className="h-8 w-8"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <Select
                        value={assignment.drinkId}
                        onValueChange={(value) => handleDrinkAssignment(assignment.roundId, value)}
                      >
                        <SelectTrigger className="w-full rounded-xl">
                          <SelectValue placeholder="Select a drink for this round" />
                        </SelectTrigger>
                        <SelectContent>
                          {drinks.map(drink => (
                            <SelectItem key={drink.id} value={drink.id}>
                              {drink.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {assignment.drinkId && (
                        <div className="text-sm p-2 bg-primary/10 rounded-lg">
                          {drinks.find(d => d.id === assignment.drinkId)?.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between space-x-2">
          <Button 
            type="button"
            variant="outline"
            onClick={() => setCurrentTab(currentTab === 'drinks' ? 'rounds' : 'drinks')}
            className="btn-secondary"
          >
            {currentTab === 'drinks' ? 'Next: Assign Rounds' : 'Back to Drinks'}
          </Button>
          
          <Button 
            type="submit"
            onClick={handleSubmit}
            disabled={!canCreateGame()}
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
