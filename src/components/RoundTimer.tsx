
import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';

const RoundTimer: React.FC = () => {
  const { game, remainingTime } = useGame();
  
  if (!game || game.currentRound < 0 || !remainingTime) return null;
  
  const currentRound = game.rounds[game.currentRound];
  const timeLimit = currentRound.timeLimit || game.roundTimeLimit || 60;
  const progress = Math.max(0, (remainingTime / timeLimit) * 100);
  
  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Determine color class based on remaining time
  const getColorClass = (): string => {
    if (remainingTime > timeLimit * 0.66) return 'bg-green-500';
    if (remainingTime > timeLimit * 0.33) return 'bg-amber-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="rounded-lg bg-muted/30 p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>Time Remaining</span>
        </div>
        <div className={`text-sm font-medium ${remainingTime < 10 ? 'text-red-500 animate-pulse' : ''}`}>
          {formatTime(remainingTime)}
        </div>
      </div>
      <Progress value={progress} className="h-2" indicatorClassName={getColorClass()} />
    </div>
  );
};

export default RoundTimer;
