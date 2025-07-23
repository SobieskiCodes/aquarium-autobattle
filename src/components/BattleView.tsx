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
  const [battleState, setBattleState] = useState({
    battleActive: false,
    currentRound: 1,
    playerHealth: 0,
    opponentHealth: 0,
    playerMaxHealth: 0,
    opponentMaxHealth: 0,
    winner: null as 'player' | 'opponent' | null,
    battleEvents: [] as any[]
  });
  const [floatingTexts, setFloatingTexts] = useState<Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    color: string;
    side: 'player' | 'opponent';
  }>>([]);

  // Use pieces as they come from game state (already enhanced)
  const enhancedPlayerPieces = playerPieces;
  const enhancedOpponentPieces = opponentPieces;

  // Analyze both tanks (analyzeTank will apply bonuses internally)
  const playerAnalysis = analyzeTank(playerPieces);
  const opponentAnalysis = analyzeTank(opponentPieces);

  // Calculate initial health totals
  React.useEffect(() => {
    const playerTotal = enhancedPlayerPieces.reduce((total, piece) => total + piece.stats.health, 0);
    const opponentTotal = enhancedOpponentPieces.reduce((total, piece) => total + piece.stats.health, 0);
    
    setBattleState(prev => ({
      ...prev,
      playerHealth: playerTotal,
      opponentHealth: opponentTotal,
      playerMaxHealth: playerTotal,
      opponentMaxHealth: opponentTotal
    }));
  }, [enhancedPlayerPieces, enhancedOpponentPieces]);

  const addFloatingText = (text: string, side: 'player' | 'opponent', color: string) => {
    const newText = {
      id: Math.random().toString(),
      text,
      x: Math.random() * 100 + 50,
      y: Math.random() * 50 + 100,
      color,
      side
    };
    
    setFloatingTexts(prev => [...prev, newText]);
    
    // Remove after animation
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== newText.id));
    }, 2000);
  };
  const startBattle = () => {
    setBattleStarted(true);
    setBattleLog([]);
    
    // Simulate battle
    setTimeout(() => {
      simulateBattle();
    }, 1000);
  };

  const simulateBattle = () => {
    // Use pieces as they come from game state (already enhanced)
    const enhancedPlayerPieces = playerPieces;
    const enhancedOpponentPieces = opponentPieces;
    
    let playerBattlePieces = enhancedPlayerPieces.map(piece => ({
      ...piece,
      currentHealth: piece.stats.health,
      isAlive: true
    }));
    
    let opponentBattlePieces = enhancedOpponentPieces.map(piece => ({
      ...piece,
      currentHealth: piece.stats.health,
      isAlive: true
    }));
    
    let battleTurn = 1;
    const events: string[] = [];

    const battleInterval = setInterval(() => {
      // Get alive pieces
      // Recalculate alive pieces after each round
      const alivePlayerPieces = playerBattlePieces.filter(p => p.isAlive);
      const aliveOpponentPieces = opponentBattlePieces.filter(p => p.isAlive);
      
      // Check if battle should end
      const alivePlayerFish = alivePlayerPieces.filter(p => p.type === 'fish');
      const aliveOpponentFish = aliveOpponentPieces.filter(p => p.type === 'fish');
      const alivePlayerStructures = alivePlayerPieces.filter(p => p.type === 'plant' || p.type === 'equipment');
      const aliveOpponentStructures = aliveOpponentPieces.filter(p => p.type === 'plant' || p.type === 'equipment');
      
      // Battle ends when one side has no units left (fish, plants, or equipment)
      const playerHasUnits = alivePlayerFish.length > 0 || alivePlayerStructures.length > 0;
      const opponentHasUnits = aliveOpponentFish.length > 0 || aliveOpponentStructures.length > 0;
      
      console.log(`Battle Turn ${battleTurn}: Player units: ${playerHasUnits} (${alivePlayerFish.length} fish, ${alivePlayerStructures.length} structures), Opponent units: ${opponentHasUnits} (${aliveOpponentFish.length} fish, ${aliveOpponentStructures.length} structures)`);
      
      // Battle continues until one side is completely eliminated
      if (!playerHasUnits || !opponentHasUnits) {
        clearInterval(battleInterval);
        
        // Determine winner
        let playerWon;
        let isDraw = false;
        
        if (!playerHasUnits && !opponentHasUnits) {
          // Both sides eliminated simultaneously - draw
          isDraw = true;
          playerWon = false;
        } else {
          // One side has units remaining
          playerWon = playerHasUnits && !opponentHasUnits;
        }
        
        // If both sides still have units but no fish, compare remaining health
        if (playerHasUnits && opponentHasUnits && alivePlayerFish.length === 0 && aliveOpponentFish.length === 0) {
          const playerTotalHealth = alivePlayerPieces.reduce((total, p) => total + p.currentHealth, 0);
          const opponentTotalHealth = aliveOpponentPieces.reduce((total, p) => total + p.currentHealth, 0);
          if (playerTotalHealth === opponentTotalHealth) {
            isDraw = true;
            playerWon = false; // Will be overridden by draw logic
          } else {
            playerWon = playerTotalHealth > opponentTotalHealth;
          }
        }
        
        setBattleResult(isDraw ? 'draw' : (playerWon ? 'player' : 'opponent'));
        setBattleLog(events);
        
        const currentPlayerHealth = playerBattlePieces.reduce((total, p) => total + p.currentHealth, 0);
        const currentOpponentHealth = opponentBattlePieces.reduce((total, p) => total + p.currentHealth, 0);
        
        setBattleState(prev => ({
          ...prev,
          winner: isDraw ? null : (playerWon ? 'player' : 'opponent'),
          battleActive: false,
          playerHealth: currentPlayerHealth,
          opponentHealth: currentOpponentHealth
        }));
        
        return;
      }
      
      // Sort pieces by speed for turn order
      const allPieces = [
        ...playerBattlePieces.filter(p => p.isAlive && p.type === 'fish').map(p => ({ ...p, side: 'player' as const })),
        ...opponentBattlePieces.filter(p => p.isAlive && p.type === 'fish').map(p => ({ ...p, side: 'opponent' as const }))
      ]
       .sort((a, b) => b.stats.speed - a.stats.speed);
      
      // Each piece attacks in speed order
      allPieces.forEach((attacker, index) => {
        // Skip if attacker is dead
        const attackerPiece = attacker.side === 'player' ? 
          playerBattlePieces.find(p => p.id === attacker.id) : 
          opponentBattlePieces.find(p => p.id === attacker.id);
        
        if (!attackerPiece || !attackerPiece.isAlive) return;
        
        // Target any alive enemy piece randomly (fish, plants, equipment)
        const targets = attacker.side === 'player' ? 
          opponentBattlePieces.filter(p => p.isAlive && (p.type === 'fish' || p.type === 'plant' || p.type === 'equipment')) : 
          playerBattlePieces.filter(p => p.isAlive && (p.type === 'fish' || p.type === 'plant' || p.type === 'equipment'));
          
        if (targets.length === 0) return;
        
        // Choose random target
        const target = targets[Math.floor(Math.random() * targets.length)];
        let damage = attacker.stats.attack;
        
        // Apply water quality modifier
        const waterQuality = attacker.side === 'player' ? playerWaterQuality : opponentWaterQuality;
        if (waterQuality < 3) damage = Math.floor(damage * 0.7);
        else if (waterQuality > 7) damage = Math.floor(damage * 1.2);
        
        // Apply damage
        target.currentHealth = Math.max(0, target.currentHealth - damage);
        
        // Update the piece's alive status immediately
        if (target.currentHealth <= 0) {
          target.isAlive = false;
        }
        
        // Update health bars in real-time
        setBattleState(prev => ({
          ...prev,
          playerHealth: playerBattlePieces.reduce((total, p) => total + p.currentHealth, 0),
          opponentHealth: opponentBattlePieces.reduce((total, p) => total + p.currentHealth, 0)
        }));
        
        // Add floating text
        addFloatingText(`-${damage}`, attacker.side === 'player' ? 'opponent' : 'player', 'text-red-500');
        
        if (!target.isAlive) {
          const koText = target.type === 'fish' ? 'KO!' : 'Destroyed!';
          addFloatingText(koText, attacker.side === 'player' ? 'opponent' : 'player', 'text-red-700');
        }
        
        // Create attack event with detailed damage breakdown
        const targetType = target.type === 'fish' ? '' : ` (${target.type})`;
        const baseDamage = attacker.stats.attack;
        const originalAttacker = (attacker.side === 'player' ? playerPieces : opponentPieces).find(p => p.id === attacker.id);
        const baseAttack = originalAttacker ? originalAttacker.stats.attack : baseDamage;
        const attackBonus = baseDamage - baseAttack;
        
        // Build detailed damage breakdown
        let damageBreakdown = '';
        let waterQualityNote = '';
        
        if (attackBonus > 0) {
          damageBreakdown = `${baseAttack}+${attackBonus}=${baseDamage}`;
        } else {
          damageBreakdown = `${baseDamage}`;
        }
        
        // Add water quality modification
        if (waterQuality < 3) {
          waterQualityNote = ` → ${damage} (-30% water quality)`;
        } else if (waterQuality > 7) {
          waterQualityNote = ` → ${damage} (+20% water quality)`;
        } else if (damage !== baseDamage) {
          waterQualityNote = ` → ${damage}`;
        }
        
        const fullDamageText = damageBreakdown + waterQualityNote;
        
        events.push(`Turn ${battleTurn}: ${attacker.side === 'player' ? 'Your' : 'Enemy'} ${attacker.name}→ ${attacker.side === 'player' ? 'Enemy' : 'Your'} ${target.name}${targetType} for ${fullDamageText} damage`);
        
        if (target.currentHealth <= 0) {
          // Add KO event
          const koText = target.type === 'fish' ? 'KO!' : 'Destroyed!';
          events.push(`Turn ${battleTurn}: ${attacker.side === 'player' ? 'Your' : 'Enemy'} ${attacker.name}→ ${koText} ${attacker.side === 'player' ? 'Enemy' : 'Your'} ${target.name}${targetType}`);
        }
      });

      // Apply environmental effects
      if (playerWaterQuality < 3) {
        alivePlayerPieces.filter(p => p.type === 'fish').forEach(piece => {
          const poisonDamage = Math.max(1, Math.floor(piece.stats.health * 0.1));
          piece.currentHealth = Math.max(0, piece.currentHealth - poisonDamage);
          if (piece.currentHealth <= 0) piece.isAlive = false;
        });
        events.push(`Turn ${battleTurn}: Poor Water Quality→ Your Fish (poison damage)`);
        addFloatingText('Poison!', 'player', 'text-purple-500');
      }

      if (opponentWaterQuality < 3) {
        aliveOpponentPieces.filter(p => p.type === 'fish').forEach(piece => {
          const poisonDamage = Math.max(1, Math.floor(piece.stats.health * 0.1));
          piece.currentHealth = Math.max(0, piece.currentHealth - poisonDamage);
          if (piece.currentHealth <= 0) piece.isAlive = false;
        });
        events.push(`Turn ${battleTurn}: Poor Water Quality→ Enemy Fish (poison damage)`);
        addFloatingText('Poison!', 'opponent', 'text-purple-500');
      }

      // Update battle state
      const currentPlayerHealth = playerBattlePieces.reduce((total, p) => total + p.currentHealth, 0);
      const currentOpponentHealth = opponentBattlePieces.reduce((total, p) => total + p.currentHealth, 0);

      setBattleState(prev => ({
        ...prev,
        playerHealth: currentPlayerHealth,
        opponentHealth: currentOpponentHealth,
        currentRound: battleTurn,
        battleEvents: [...events]
      }));

      battleTurn++;
      
      // Safety valve: if battle goes on too long (20 turns), force end with health comparison
      if (battleTurn > 20) {
        clearInterval(battleInterval);
        
        // Force end - compare remaining health
        const currentPlayerHealth = playerBattlePieces.reduce((total, p) => total + p.currentHealth, 0);
        const currentOpponentHealth = opponentBattlePieces.reduce((total, p) => total + p.currentHealth, 0);
        
        let playerWon;
        let isDraw = false;
        if (currentPlayerHealth === currentOpponentHealth) {
          isDraw = true;
          playerWon = false;
        } else {
          playerWon = currentPlayerHealth > currentOpponentHealth;
        }
        
        events.push(`Battle timeout! ${isDraw ? 'Draw!' : (playerWon ? 'Victory!' : 'Defeat!')} ${isDraw ? 'Equal health remaining' : 'Health comparison'}`);
        
        setBattleResult(isDraw ? 'draw' : (playerWon ? 'player' : 'opponent'));
        setBattleLog(events);
        
        setBattleState(prev => ({
          ...prev,
          winner: isDraw ? null : (playerWon ? 'player' : 'opponent'),
          battleActive: false,
          playerHealth: currentPlayerHealth,
          opponentHealth: currentOpponentHealth
        }));
      }
    }, 800); // 0.8 seconds per battle turn for good pacing
  };

  const getResultIcon = () => {
    switch (battleResult) {
      case 'player': return '🏆 Victory!';
      case 'opponent': return '💀 Defeat!';
      case 'draw': return '🤝 Draw!';
      default: return '';
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

  const getHealthPercentage = (current: number, max: number) => {
    return Math.max(0, (current / max) * 100);
  };

  const getHealthColor = (percentage: number) => {
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Sword size={24} />
              <h1 className="text-2xl font-bold">
                Battle Arena - Round {currentRound}/15
                {battleResult && (
                  <span className="ml-3 text-yellow-300">{getResultIcon()}</span>
                )}
              </h1>
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
        
        {/* Live Health Bars */}
        {battleStarted && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Your Tank</span>
                <span className="text-sm font-bold">{battleState.playerHealth}/{battleState.playerMaxHealth}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${getHealthColor(getHealthPercentage(battleState.playerHealth, battleState.playerMaxHealth))}`}
                  style={{ width: `${getHealthPercentage(battleState.playerHealth, battleState.playerMaxHealth)}%` }}
                />
              </div>
            </div>
            
            <div className="flex-1 ml-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Opponent Tank</span>
                <span className="text-sm font-bold">{battleState.opponentHealth}/{battleState.opponentMaxHealth}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${getHealthColor(getHealthPercentage(battleState.opponentHealth, battleState.opponentMaxHealth))}`}
                  style={{ width: `${getHealthPercentage(battleState.opponentHealth, battleState.opponentMaxHealth)}%` }}
                />
              </div>
            </div>
          </div>
        )}
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
      <div className="grid lg:grid-cols-2 gap-6 relative">
        {/* Floating Damage Text */}
        {floatingTexts.map(text => (
          <div
            key={text.id}
            className={`absolute pointer-events-none font-bold text-lg animate-bounce z-10 ${text.color}`}
            style={{
              left: text.side === 'player' ? `${text.x}%` : `${50 + text.x}%`,
              top: `${text.y}px`,
              animation: 'floatUp 2s ease-out forwards'
            }}
          >
            {text.text}
          </div>
        ))}
        
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
          <div className="bg-gray-100 rounded-lg p-4 max-h-64 overflow-y-auto">
            {battleLog.map((log, index) => (
              <div 
                key={index} 
                className={`text-sm mb-1 p-2 rounded ${
                  log.includes('Your') && log.includes('→') 
                    ? 'bg-blue-50 text-blue-800 border-l-4 border-blue-400' 
                    : log.includes('Enemy') && log.includes('→')
                    ? 'bg-red-50 text-red-800 border-l-4 border-red-400'
                    : log.includes('KO!')
                    ? 'bg-yellow-50 text-yellow-800 border-l-4 border-yellow-400 font-bold'
                    : 'text-gray-700'
                }`}
              >
                {log}
              </div>
            ))}
            {battleLog.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                Battle log will appear here...
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* CSS for floating text animation */}
      <style jsx>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0px);
          }
          100% {
            opacity: 0;
            transform: translateY(-50px);
          }
        }
      `}</style>
    </div>
  );
};