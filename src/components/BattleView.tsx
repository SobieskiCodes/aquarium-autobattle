import React, { useState, useEffect } from 'react';
import { GamePiece, BattleEvent } from '../types/game';
import { TankGrid } from './TankGrid';
import { Swords, Trophy, Clock, ScrollText } from 'lucide-react';

interface BattleViewProps {
  playerPieces: GamePiece[];
  opponentPieces: GamePiece[];
  playerWaterQuality: number;
  opponentWaterQuality: number;
  onBattleComplete: (playerWon: boolean) => void;
}

interface BattleState {
  playerHealth: number;
  opponentHealth: number;
  maxPlayerHealth: number;
  maxOpponentHealth: number;
  currentRound: number;
  battleActive: boolean;
  winner: 'player' | 'opponent' | null;
  battleEvents: BattleEvent[];
}

export const BattleView: React.FC<BattleViewProps> = ({
  playerPieces,
  opponentPieces,
  playerWaterQuality,
  opponentWaterQuality,
  onBattleComplete
}) => {
  const [battleState, setBattleState] = useState<BattleState>({
    playerHealth: 0,
    opponentHealth: 0,
    maxPlayerHealth: 0,
    maxOpponentHealth: 0,
    currentRound: 1,
    battleActive: false,
    winner: null,
    battleEvents: []
  });

  const [floatingTexts, setFloatingTexts] = useState<Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    color: string;
    side: 'player' | 'opponent';
  }>>([]);

  // Initialize health values
  useEffect(() => {
    const playerMaxHealth = calculateTotalHealth(playerPieces);
    const opponentMaxHealth = calculateTotalHealth(opponentPieces);
    
    setBattleState(prev => ({
      ...prev,
      playerHealth: playerMaxHealth,
      opponentHealth: opponentMaxHealth,
      maxPlayerHealth: playerMaxHealth,
      maxOpponentHealth: opponentMaxHealth
    }));
  }, [playerPieces, opponentPieces]);

  const calculateTotalHealth = (pieces: GamePiece[]) => {
    return pieces.reduce((total, piece) => total + piece.stats.health, 0);
  };

  const calculateTotalAttack = (pieces: GamePiece[], waterQuality: number) => {
    let totalAttack = pieces.reduce((total, piece) => total + piece.stats.attack, 0);
    
    // Apply water quality modifier
    if (waterQuality < 3) totalAttack *= 0.7;
    else if (waterQuality > 7) totalAttack *= 1.2;
    
    return Math.floor(totalAttack);
  };

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
    setBattleState(prev => ({ ...prev, battleActive: true, currentRound: 1, battleEvents: [] }));
    simulateBattle();
  };

  const simulateBattle = () => {
    // Create battle copies of pieces with current health
    let playerBattlePieces = playerPieces.map(piece => ({
      ...piece,
      currentHealth: piece.stats.health,
      isAlive: true
    }));
    
    let opponentBattlePieces = opponentPieces.map(piece => ({
      ...piece,
      currentHealth: piece.stats.health,
      isAlive: true
    }));
    
    let round = 1;
    const events: BattleEvent[] = [];

    const battleInterval = setInterval(() => {
      // Get alive pieces
      const alivePlayerPieces = playerBattlePieces.filter(p => p.isAlive);
      const aliveOpponentPieces = opponentBattlePieces.filter(p => p.isAlive);
      
      // Check if battle should end
      if (alivePlayerPieces.length === 0 || aliveOpponentPieces.length === 0) {
        clearInterval(battleInterval);
        const playerWon = alivePlayerPieces.length > 0;
        
        setBattleState(prev => ({
          ...prev,
          winner: playerWon ? 'player' : 'opponent',
          battleActive: false,
          playerHealth: alivePlayerPieces.reduce((total, p) => total + p.currentHealth, 0),
          opponentHealth: aliveOpponentPieces.reduce((total, p) => total + p.currentHealth, 0)
        }));
        return;
      }
      
      // Sort pieces by speed for turn order
      const allPieces = [
        ...alivePlayerPieces.map(p => ({ ...p, side: 'player' as const })),
        ...aliveOpponentPieces.map(p => ({ ...p, side: 'opponent' as const }))
      ].filter(p => p.type === 'fish' || p.tags.includes('aggressive'))
       .sort((a, b) => b.stats.speed - a.stats.speed);
      
      // Each piece attacks in speed order
      allPieces.forEach((attacker, index) => {
        if (!attacker.isAlive) return;
        
        const targets = attacker.side === 'player' ? 
          opponentBattlePieces.filter(p => p.isAlive) : 
          playerBattlePieces.filter(p => p.isAlive);
          
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
        if (target.currentHealth <= 0) {
          target.isAlive = false;
        }
        
        // Create battle event
        events.push({
          type: 'attack',
          source: attacker.name,
          target: target.name,
          value: damage,
          round
        });
        
        // Add floating text
        addFloatingText(`-${damage}`, attacker.side === 'player' ? 'opponent' : 'player', 'text-red-500');
        
        if (!target.isAlive) {
          addFloatingText('KO!', attacker.side === 'player' ? 'opponent' : 'player', 'text-red-700');
        }
      });

      // Apply environmental effects
      if (playerWaterQuality < 3) {
        alivePlayerPieces.forEach(piece => {
          const poisonDamage = Math.max(1, Math.floor(piece.stats.health * 0.1));
          piece.currentHealth = Math.max(0, piece.currentHealth - poisonDamage);
          if (piece.currentHealth <= 0) piece.isAlive = false;
        });
        events.push({
          type: 'status',
          source: 'Poor Water Quality',
          target: 'Your Tank',
          value: 0,
          round
        });
        addFloatingText('Poison!', 'player', 'text-purple-500');
      }

      if (opponentWaterQuality < 3) {
        aliveOpponentPieces.forEach(piece => {
          const poisonDamage = Math.max(1, Math.floor(piece.stats.health * 0.1));
          piece.currentHealth = Math.max(0, piece.currentHealth - poisonDamage);
          if (piece.currentHealth <= 0) piece.isAlive = false;
        });
        events.push({
          type: 'attack',
          source: 'Poor Water Quality',
          target: 'Opponent Tank',
          value: 0,
          round
        });
        addFloatingText('Poison!', 'opponent', 'text-purple-500');
      }

      // Update battle state
      const currentPlayerHealth = alivePlayerPieces.reduce((total, p) => total + p.currentHealth, 0);
      const currentOpponentHealth = aliveOpponentPieces.reduce((total, p) => total + p.currentHealth, 0);

      setBattleState(prev => ({
        ...prev,
        playerHealth: currentPlayerHealth,
        opponentHealth: currentOpponentHealth,
        currentRound: round,
        battleEvents: [...events]
      }));

      round++;
      
      // Max 10 rounds to prevent infinite battles
      if (round > 10) {
        clearInterval(battleInterval);
        const playerWon = currentPlayerHealth > currentOpponentHealth;
        
        setBattleState(prev => ({
          ...prev,
          winner: playerWon ? 'player' : 'opponent',
          battleActive: false
        }));

        events.push({
          type: 'status',
          source: 'Time Limit',
          target: 'Battle',
          value: 0,
          round
        });

        setBattleState(prev => ({
          ...prev,
          battleEvents: [...events]
        }));
      }
    }, 1500); // 1.5 seconds per round
  };

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
      {/* Battle Header */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Swords size={24} />
            <h2 className="text-2xl font-bold">Battle Arena</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock size={20} />
              <span>Battle Round {battleState.currentRound}/8</span>
            </div>
            <div className="text-sm bg-white/20 px-3 py-1 rounded-lg">
              <div>You: {playerPieces.length} pieces</div>
              <div>Opponent: {opponentPieces.length} pieces</div>
            </div>
            {battleState.winner && (
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-lg">
                <Trophy size={20} />
                <span className="font-bold">
                  {battleState.winner === 'player' ? 'Victory!' : 'Defeat!'}
                </span>
              </div>
            )}
            {battleState.winner && (
              <button
                onClick={() => onBattleComplete(battleState.winner === 'player')}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors ml-4"
              >
                Continue to Next Round
              </button>
            )}
          </div>
        </div>

        {/* Health Bars */}
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Your Tank</span>
              <span>{battleState.playerHealth}/{battleState.maxPlayerHealth}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${getHealthColor(getHealthPercentage(battleState.playerHealth, battleState.maxPlayerHealth))}`}
                style={{ width: `${getHealthPercentage(battleState.playerHealth, battleState.maxPlayerHealth)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Opponent Tank</span>
              <span>{battleState.opponentHealth}/{battleState.maxOpponentHealth}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${getHealthColor(getHealthPercentage(battleState.opponentHealth, battleState.maxOpponentHealth))}`}
                style={{ width: `${getHealthPercentage(battleState.opponentHealth, battleState.maxOpponentHealth)}%` }}
              />
            </div>
          </div>
        </div>

        {!battleState.battleActive && !battleState.winner && (
          <button
            onClick={startBattle}
            className="mt-4 bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
          >
            Start Battle!
          </button>
        )}
      </div>

      {/* Stats Comparison */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Battle Stats Comparison</h3>
        <div className="grid grid-cols-2 gap-6">
          {/* Player Stats */}
          <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200 p-4">
            <h4 className="font-bold text-blue-900 mb-3 text-center">Your Tank</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {playerPieces.reduce((total, piece) => total + piece.stats.attack, 0)}
                </div>
                <div className="text-gray-600">Total Attack</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {playerPieces.reduce((total, piece) => total + piece.stats.health, 0)}
                </div>
                <div className="text-gray-600">Total Health</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(playerPieces.reduce((total, piece) => total + piece.stats.speed, 0) / Math.max(1, playerPieces.length))}
                </div>
                <div className="text-gray-600">Avg Speed</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600 flex justify-between">
              <span>Pieces: {playerPieces.length}</span>
              <span>Water Quality: {playerWaterQuality}/10</span>
            </div>
          </div>

          {/* Opponent Stats */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200 p-4">
            <h4 className="font-bold text-red-900 mb-3 text-center">Opponent Tank</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {opponentPieces.reduce((total, piece) => total + piece.stats.attack, 0)}
                </div>
                <div className="text-gray-600">Total Attack</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {opponentPieces.reduce((total, piece) => total + piece.stats.health, 0)}
                </div>
                <div className="text-gray-600">Total Health</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(opponentPieces.reduce((total, piece) => total + piece.stats.speed, 0) / Math.max(1, opponentPieces.length))}
                </div>
                <div className="text-gray-600">Avg Speed</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600 flex justify-between">
              <span>Pieces: {opponentPieces.length}</span>
              <span>Water Quality: {opponentWaterQuality}/10</span>
            </div>
          </div>
        </div>

        {/* Advantage Indicators */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-700 mb-1">Attack Advantage</div>
            {(() => {
              const playerAttack = playerPieces.reduce((total, piece) => total + piece.stats.attack, 0);
              const opponentAttack = opponentPieces.reduce((total, piece) => total + piece.stats.attack, 0);
              const diff = playerAttack - opponentAttack;
              if (diff > 0) {
                return <div className="text-green-600 font-bold">+{diff} You</div>;
              } else if (diff < 0) {
                return <div className="text-red-600 font-bold">{diff} Opponent</div>;
              } else {
                return <div className="text-gray-600 font-bold">Even</div>;
              }
            })()}
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700 mb-1">Health Advantage</div>
            {(() => {
              const playerHealth = playerPieces.reduce((total, piece) => total + piece.stats.health, 0);
              const opponentHealth = opponentPieces.reduce((total, piece) => total + piece.stats.health, 0);
              const diff = playerHealth - opponentHealth;
              if (diff > 0) {
                return <div className="text-green-600 font-bold">+{diff} You</div>;
              } else if (diff < 0) {
                return <div className="text-red-600 font-bold">{diff} Opponent</div>;
              } else {
                return <div className="text-gray-600 font-bold">Even</div>;
              }
            })()}
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700 mb-1">Speed Advantage</div>
            {(() => {
              const playerSpeed = Math.round(playerPieces.reduce((total, piece) => total + piece.stats.speed, 0) / Math.max(1, playerPieces.length));
              const opponentSpeed = Math.round(opponentPieces.reduce((total, piece) => total + piece.stats.speed, 0) / Math.max(1, opponentPieces.length));
              const diff = playerSpeed - opponentSpeed;
              if (diff > 0) {
                return <div className="text-green-600 font-bold">+{diff} You</div>;
              } else if (diff < 0) {
                return <div className="text-red-600 font-bold">{diff} Opponent</div>;
              } else {
                return <div className="text-gray-600 font-bold">Even</div>;
              }
            })()}
          </div>
        </div>
      </div>

      {/* Battle Grids */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Player Tank */}
        <div className="relative">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Your Tank</h3>
          <TankGrid 
            pieces={playerPieces} 
            isInteractive={false}
            waterQuality={playerWaterQuality}
          />
          
          {/* Floating damage texts for player side */}
          {floatingTexts.filter(text => text.side === 'player').map(text => (
            <div
              key={text.id}
              className={`absolute pointer-events-none font-bold text-xl ${text.color} animate-float`}
              style={{ 
                left: `${text.x}%`, 
                top: `${text.y}px`,
              }}
            >
              {text.text}
            </div>
          ))}
        </div>

        {/* Opponent Tank */}
        <div className="relative">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Opponent Tank</h3>
          <TankGrid 
            pieces={opponentPieces} 
            isInteractive={false}
            waterQuality={opponentWaterQuality}
          />
          
          {/* Floating damage texts for opponent side */}
          {floatingTexts.filter(text => text.side === 'opponent').map(text => (
            <div
              key={text.id}
              className={`absolute pointer-events-none font-bold text-xl ${text.color} animate-float`}
              style={{ 
                left: `${text.x}%`, 
                top: `${text.y}px`,
              }}
            >
              {text.text}
            </div>
          ))}
        </div>
      </div>

      {/* Battle Log */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ScrollText size={20} className="text-gray-600" />
          <h3 className="font-bold text-gray-900">Battle Log</h3>
        </div>
        
        {battleState.battleEvents.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {battleState.battleEvents.map((event, index) => (
              <div 
                key={index} 
                className={`text-sm p-2 rounded ${
                  event.type === 'attack' 
                    ? 'bg-red-50 border-l-4 border-red-400' 
                    : event.type === 'status'
                    ? 'bg-purple-50 border-l-4 border-purple-400'
                    : 'bg-blue-50 border-l-4 border-blue-400'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    Round {event.round}: {event.source}
                    {event.target && ` → ${event.target}`}
                  </span>
                  {event.value > 0 && (
                    <span className={`font-bold ${
                      event.type === 'attack' ? 'text-red-600' : 'text-purple-600'
                    }`}>
                      -{event.value} HP
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {battleState.winner && (
              <div className={`text-sm p-3 rounded font-bold text-center ${
                battleState.winner === 'player' 
                  ? 'bg-green-100 text-green-800 border border-green-300' 
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                🏆 {battleState.winner === 'player' ? 'VICTORY!' : 'DEFEAT!'} 
                {battleState.winner === 'player' ? ' Your tank dominated the battlefield!' : ' Better luck next time!'}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>Battle log will appear here once combat begins...</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          50% { opacity: 1; transform: translateY(-20px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-40px) scale(0.9); }
        }
        
        .animate-float {
          animation: float 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};