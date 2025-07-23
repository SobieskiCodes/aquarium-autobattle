import React, { useState, useEffect } from 'react';
import { GamePiece } from '../types/game';
import { TankGrid } from './TankGrid';
import { TankSummary } from './TankSummary';
import { GoldTracker } from './GoldTracker';
import { analyzeTank, applyBonusesToPieces } from '../utils/tankAnalysis';
import { GoldTransaction } from '../types/game';
import { Sword, Shield, Zap, Play, ArrowRight, Eye } from 'lucide-react';

interface BattleViewProps {
  playerPieces: GamePiece[];
  opponentPieces: GamePiece[];
  playerWaterQuality: number;
  opponentWaterQuality: number;
  currentRound: number;
  onBattleComplete: (result: 'player' | 'opponent' | 'draw') => void;
  goldHistory: GoldTransaction[];
  currentGold: number;
}

export const BattleView: React.FC<BattleViewProps> = ({
  playerPieces,
  opponentPieces,
  playerWaterQuality,
  opponentWaterQuality,
  currentRound,
  onBattleComplete,
  goldHistory,
  currentGold
}) => {
  const [battleStarted, setBattleStarted] = useState(false);
  const [battleResult, setBattleResult] = useState<'player' | 'opponent' | 'draw' | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);

  // Apply bonuses to pieces for battle calculations
  const enhancedPlayerPieces = applyBonusesToPieces(playerPieces, playerPieces);
  const enhancedOpponentPieces = applyBonusesToPieces(opponentPieces, opponentPieces);

  // Analyze both tanks
  const playerAnalysis = analyzeTank(playerPieces);
  const opponentAnalysis = analyzeTank(opponentPieces);

  const startBattle = () => {
    setBattleStarted(true);
    setBattleLog(['Battle begins!']);
    
    // Simulate battle
    setTimeout(() => {
      simulateBattle();
    }, 1000);
  };

  const simulateBattle = () => {
    const playerFish = enhancedPlayerPieces.filter(p => p.type === 'fish' && p.position);
    const opponentFish = enhancedOpponentPieces.filter(p => p.type === 'fish' && p.position);
    
    if (playerFish.length === 0 && opponentFish.length === 0) {
      setBattleResult('draw');
      setBattleLog(prev => [...prev, 'No fish to battle! It\'s a draw.']);
      return;
    }
    
    if (playerFish.length === 0) {
      setBattleResult('opponent');
      setBattleLog(prev => [...prev, 'You have no fish! Opponent wins.']);
      return;
    }
    
    if (opponentFish.length === 0) {
      setBattleResult('player');
      setBattleLog(prev => [...prev, 'Opponent has no fish! You win!']);
      return;
    }

    // Simple battle simulation based on total stats
    const playerPower = playerAnalysis.totalAttack + playerAnalysis.totalHealth + (playerAnalysis.averageSpeed * playerFish.length);
    const opponentPower = opponentAnalysis.totalAttack + opponentAnalysis.totalHealth + (opponentAnalysis.averageSpeed * opponentFish.length);
    
    // Add some randomness (±20%)
    const playerFinalPower = playerPower * (0.8 + Math.random() * 0.4);
    const opponentFinalPower = opponentPower * (0.8 + Math.random() * 0.4);
    
    setBattleLog(prev => [
      ...prev,
      `Your tank power: ${Math.round(playerFinalPower)}`,
      `Opponent tank power: ${Math.round(opponentFinalPower)}`,
      'Battle in progress...'
    ]);
    
    setTimeout(() => {
      if (Math.abs(playerFinalPower - opponentFinalPower) < playerPower * 0.1) {
        setBattleResult('draw');
        setBattleLog(prev => [...prev, 'The battle is too close to call! It\'s a draw!']);
      } else if (playerFinalPower > opponentFinalPower) {
        setBattleResult('player');
        setBattleLog(prev => [...prev, 'Victory! Your aquarium dominates!']);
      } else {
        setBattleResult('opponent');
        setBattleLog(prev => [...prev, 'Defeat! The opponent\'s tank was stronger.']);
      }
    }, 2000);
  };

  const getResultColor = () => {
    switch (battleResult) {
      case 'player': return 'from-green-500 to-emerald-600';
      case 'opponent': return 'from-red-500 to-pink-600';
      case 'draw': return 'from-yellow-500 to-orange-600';
      default: return 'from-blue-500 to-cyan-600';
    }
  };

  const getResultText = () => {
    switch (battleResult) {
      case 'player': return 'Victory!';
      case 'opponent': return 'Defeat!';
      case 'draw': return 'Draw!';
      default: return `Battle Arena - Round ${currentRound}/15`;
    }
  };

  const getAdvantage = (player: number, opponent: number) => {
    const diff = player - opponent;
    if (Math.abs(diff) <= 1) return { text: 'Even', color: 'text-gray-600' };
    if (diff > 0) return { text: `+${diff} You`, color: 'text-green-600' };
    return { text: `${diff} Opponent`, color: 'text-red-600' };
  };

  const attackAdvantage = getAdvantage(playerAnalysis.totalAttack, opponentAnalysis.totalAttack);
  const healthAdvantage = getAdvantage(playerAnalysis.totalHealth, opponentAnalysis.totalHealth);
  const speedAdvantage = getAdvantage(playerAnalysis.averageSpeed, opponentAnalysis.averageSpeed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`bg-gradient-to-r ${getResultColor()} text-white p-4 rounded-lg`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Sword size={24} />
              <h1 className="text-2xl font-bold">{getResultText()}</h1>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm opacity-90">
                {battleStarted ? 'Battle in progress...' : 'Ready to battle'}
              </p>
              <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
                <span>You: {playerAnalysis.fishCount} pieces</span>
                <span className="mx-2">•</span>
                <span>Opponent: {opponentAnalysis.fishCount} pieces</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Gold Tracker Button */}
            <GoldTracker
              goldHistory={goldHistory}
              currentGold={currentGold}
              currentRound={currentRound}
            />
            
            {/* Battle/Continue Button */}
            {!battleStarted ? (
              <button
                onClick={startBattle}
                disabled={playerAnalysis.fishCount === 0}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all
                  ${playerAnalysis.fishCount > 0
                    ? 'bg-white text-blue-600 hover:bg-gray-100 hover:shadow-md'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <Play size={20} />
                Start Battle!
              </button>
            ) : battleResult ? (
              <button
                onClick={() => onBattleComplete(battleResult)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-bold hover:bg-gray-100 hover:shadow-md transition-all"
              >
                <ArrowRight size={20} />
                Continue to Next Round
              </button>
            ) : (
              <div className="px-6 py-3 bg-white/20 rounded-lg">
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Battle Stats Comparison */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Battle Stats Comparison</h2>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Player Tank Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-800 mb-3 text-center">Your Tank</h3>
            <TankSummary
              analysis={playerAnalysis}
              waterQuality={playerWaterQuality}
              showDetailed={true}
              className="bg-transparent border-0 p-0"
            />
          </div>

          {/* Opponent Tank Summary */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-bold text-red-800 mb-3 text-center">Opponent Tank</h3>
            <TankSummary
              analysis={opponentAnalysis}
              waterQuality={opponentWaterQuality}
              showDetailed={true}
              className="bg-transparent border-0 p-0"
            />
          </div>
        </div>

        {/* Advantage Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sword size={16} className="text-red-500" />
              <span className="font-medium text-gray-700">Attack Advantage</span>
            </div>
            <div className={`font-bold ${attackAdvantage.color}`}>
              {attackAdvantage.text}
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Shield size={16} className="text-green-500" />
              <span className="font-medium text-gray-700">Health Advantage</span>
            </div>
            <div className={`font-bold ${healthAdvantage.color}`}>
              {healthAdvantage.text}
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap size={16} className="text-blue-500" />
              <span className="font-medium text-gray-700">Speed Advantage</span>
            </div>
            <div className={`font-bold ${speedAdvantage.color}`}>
              {speedAdvantage.text}
            </div>
          </div>
        </div>
      </div>

      {/* Tank Grids */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Your Tank</h2>
          <TankGrid
            pieces={enhancedPlayerPieces}
            isInteractive={false}
            waterQuality={playerWaterQuality}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Opponent Tank</h2>
          <TankGrid
            pieces={enhancedOpponentPieces}
            isInteractive={false}
            waterQuality={opponentWaterQuality}
          />
        </div>
      </div>

      {/* Battle Log */}
      {battleStarted && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Battle Log</h3>
          <div className="bg-gray-100 rounded-lg p-4 max-h-40 overflow-y-auto">
            {battleLog.map((log, index) => (
              <div key={index} className="text-sm text-gray-700 mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};