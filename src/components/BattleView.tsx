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
    // Apply bonuses to pieces before calculating health
    const enhancedPlayerPieces = applyBonusesToPieces(playerPieces);
    const enhancedOpponentPieces = applyBonusesToPieces(opponentPieces);
    
    const playerMaxHealth = calculateTotalHealth(enhancedPlayerPieces);
    const opponentMaxHealth = calculateTotalHealth(enhancedOpponentPieces);
    
    setBattleState(prev => ({
      ...prev,
      playerHealth: playerMaxHealth,
      opponentHealth: opponentMaxHealth,
      maxPlayerHealth: playerMaxHealth,
      maxOpponentHealth: opponentMaxHealth
    }));
  }, [playerPieces, opponentPieces]);

  // Apply all active bonuses to pieces
  const applyBonusesToPieces = (pieces: GamePiece[]) => {
    const GRID_WIDTH = 8;
    const GRID_HEIGHT = 6;
    
    // Create grid with piece occupancy
    const grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
    pieces.forEach(piece => {
      if (piece.position) {
        piece.shape.forEach(offset => {
          const x = piece.position!.x + offset.x;
          const y = piece.position!.y + offset.y;
          if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
            grid[y][x] = piece;
          }
        });
      }
    });

    return pieces.map(piece => {
      if (!piece.position) return piece;
      
      let bonusAttack = 0;
      let bonusHealth = 0;
      let bonusSpeed = 0;
      
      // Check adjacent cells for bonus sources
      const adjacentPositions = [
        { x: piece.position.x - 1, y: piece.position.y },
        { x: piece.position.x + 1, y: piece.position.y },
        { x: piece.position.x, y: piece.position.y - 1 },
        { x: piece.position.x, y: piece.position.y + 1 }
      ];
      
      adjacentPositions.forEach(pos => {
        if (pos.x >= 0 && pos.x < GRID_WIDTH && pos.y >= 0 && pos.y < GRID_HEIGHT) {
          const adjacentPiece = grid[pos.y][pos.x];
          if (adjacentPiece && adjacentPiece.id !== piece.id) {
            // Java Fern bonus
            if (adjacentPiece.id.includes('java-fern')) {
              bonusAttack += 1;
              bonusHealth += 1;
            }
            // Anubias bonus
            if (adjacentPiece.id.includes('anubias')) {
              bonusHealth += 1;
            }
            // Consumable bonus (if piece is fish)
            if (adjacentPiece.type === 'consumable' && piece.type === 'fish') {
              bonusAttack += 1;
              bonusHealth += 1;
            }
          }
        }
      });
      
      // Check for schooling bonuses
      if (piece.tags.includes('schooling')) {
        const schoolingCount = adjacentPositions.filter(pos => {
          if (pos.x >= 0 && pos.x < GRID_WIDTH && pos.y >= 0 && pos.y < GRID_HEIGHT) {
            const adjacentPiece = grid[pos.y][pos.x];
            return adjacentPiece && adjacentPiece.tags.includes('schooling') && adjacentPiece.id !== piece.id;
          }
          return false;
        }).length;
        
        if (schoolingCount > 0) {
          if (piece.id.includes('neon-tetra')) {
            bonusAttack += schoolingCount;
            if (schoolingCount >= 3) {
              bonusSpeed += piece.stats.speed; // Double speed
            }
          } else if (piece.id.includes('cardinal-tetra')) {
            bonusAttack += schoolingCount * 2;
          }
        }
      }
      
      // Apply bonuses to piece stats
      return {
        ...piece,
        stats: {
          ...piece.stats,
          attack: piece.stats.attack + bonusAttack,
          health: piece.stats.health + bonusHealth,
          maxHealth: piece.stats.maxHealth + bonusHealth,
          speed: piece.stats.speed + bonusSpeed
        }
      };
    });
  };
  const calculateTotalHealth = (pieces: GamePiece[]) => {
    // Include fish, plants, and equipment health in the total pool
    return pieces.filter(piece => 
      piece.type === 'fish' || piece.type === 'plant' || piece.type === 'equipment'
    ).reduce((total, piece) => total + piece.stats.health, 0);
  };

  const calculateTotalAttack = (pieces: GamePiece[], waterQuality: number) => {
    let totalAttack = pieces.filter(piece => piece.type === 'fish').reduce((total, piece) => total + piece.stats.attack, 0);
    
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
    // Apply bonuses first, then create battle copies
    const enhancedPlayerPieces = applyBonusesToPieces(playerPieces);
    const enhancedOpponentPieces = applyBonusesToPieces(opponentPieces);
    
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
    
    let round = 1;
    const events: BattleEvent[] = [];

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
      
      // Battle ends when one side has no fish AND no structures, OR when both sides have no fish
      const playerHasUnits = alivePlayerFish.length > 0 || alivePlayerStructures.length > 0;
      const opponentHasUnits = aliveOpponentFish.length > 0 || aliveOpponentStructures.length > 0;
      
      console.log(`Round ${round}: Player units: ${playerHasUnits} (${alivePlayerFish.length} fish, ${alivePlayerStructures.length} structures), Opponent units: ${opponentHasUnits} (${aliveOpponentFish.length} fish, ${aliveOpponentStructures.length} structures)`);
      
      if (!playerHasUnits || !opponentHasUnits || (alivePlayerFish.length === 0 && aliveOpponentFish.length === 0)) {
        clearInterval(battleInterval);
        
        // Determine winner: check for draw first, then compare health
        let playerWon;
        let isDraw = false;
        if (alivePlayerFish.length === 0 && aliveOpponentFish.length === 0) {
          const playerTotalHealth = alivePlayerPieces.reduce((total, p) => total + p.currentHealth, 0);
          const opponentTotalHealth = aliveOpponentPieces.reduce((total, p) => total + p.currentHealth, 0);
          if (playerTotalHealth === opponentTotalHealth) {
            isDraw = true;
            playerWon = false; // Will be overridden by draw logic
          } else {
            playerWon = playerTotalHealth > opponentTotalHealth;
          }
        } else if (!playerHasUnits && !opponentHasUnits) {
          // Both sides have no units left - it's a draw
          isDraw = true;
          playerWon = false;
        } else {
          playerWon = playerHasUnits && !opponentHasUnits;
        }
        
        setBattleState(prev => ({
          ...prev,
          winner: isDraw ? null : (playerWon ? 'player' : 'opponent'),
          battleActive: false,
          playerHealth: alivePlayerPieces.reduce((total, p) => total + p.currentHealth, 0),
          opponentHealth: aliveOpponentPieces.reduce((total, p) => total + p.currentHealth, 0)
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
          const originalDamage = Math.floor(baseDamage / 0.7);
          waterQualityNote = ` → ${damage} (-30% water quality)`;
        } else if (waterQuality > 7) {
          const originalDamage = Math.floor(baseDamage / 1.2);
          waterQualityNote = ` → ${damage} (+20% water quality)`;
        } else if (damage !== baseDamage) {
          waterQualityNote = ` → ${damage}`;
        }
        
        const fullDamageText = damageBreakdown + waterQualityNote;
        
        events.push({
          type: 'attack',
          source: `${attacker.side === 'player' ? 'Your' : 'Enemy'} ${attacker.name}`,
          target: `${attacker.side === 'player' ? 'Enemy' : 'Your'} ${target.name}${targetType} for ${fullDamageText} damage`,
          value: damage,
          round
        });
        
        if (target.currentHealth <= 0) {
          // Add KO event
          const koText = target.type === 'fish' ? 'KO!' : 'Destroyed!';
          events.push({
            type: 'attack',
            source: `${attacker.side === 'player' ? 'Your' : 'Enemy'} ${attacker.name}`,
            target: `${koText} ${attacker.side === 'player' ? 'Enemy' : 'Your'} ${target.name}${targetType}`,
            value: 0,
            round
          });
        }
        
        // Add floating text
        addFloatingText(`-${damage}`, attacker.side === 'player' ? 'opponent' : 'player', 'text-red-500');
        
        if (!target.isAlive) {
          const koText = target.type === 'fish' ? 'KO!' : 'Destroyed!';
          addFloatingText(koText, attacker.side === 'player' ? 'opponent' : 'player', 'text-red-700');
        }
      });

      // Apply environmental effects
      if (playerWaterQuality < 3) {
        alivePlayerPieces.filter(p => p.type === 'fish').forEach(piece => {
          const poisonDamage = Math.max(1, Math.floor(piece.stats.health * 0.1));
          piece.currentHealth = Math.max(0, piece.currentHealth - poisonDamage);
          if (piece.currentHealth <= 0) piece.isAlive = false;
        });
        events.push({
          type: 'status',
          source: 'Poor Water Quality',
          target: 'Your Fish',
          value: 0,
          round
        });
        addFloatingText('Poison!', 'player', 'text-purple-500');
      }

      if (opponentWaterQuality < 3) {
        aliveOpponentPieces.filter(p => p.type === 'fish').forEach(piece => {
          const poisonDamage = Math.max(1, Math.floor(piece.stats.health * 0.1));
          piece.currentHealth = Math.max(0, piece.currentHealth - poisonDamage);
          if (piece.currentHealth <= 0) piece.isAlive = false;
        });
        events.push({
          type: 'status',
          source: 'Poor Water Quality',
          target: 'Enemy Fish',
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
        // Check for draw in timeout scenario
        let playerWon;
        let isDraw = false;
        if (currentPlayerHealth === currentOpponentHealth) {
          isDraw = true;
          playerWon = false;
        } else {
          playerWon = currentPlayerHealth > currentOpponentHealth;
        }
        
        setBattleState(prev => ({
          ...prev,
          winner: isDraw ? null : (playerWon ? 'player' : 'opponent'),
          battleActive: false
        }));

        events.push({
          type: 'status',
          source: 'Time Limit',
          target: isDraw ? 'Draw! Battle Ended' : 'Battle Ended',
          value: 0,
          round
        });

        setBattleState(prev => ({
          ...prev,
          battleEvents: [...events]
        }));
        
        // Call onBattleComplete with the correct result
        setTimeout(() => {
          if (isDraw) {
            onBattleComplete('draw');
          } else {
            onBattleComplete(playerWon ? 'player' : 'opponent');
          }
        }, 100);
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
            {!battleState.battleActive && battleState.winner !== null && (
              <button
                onClick={() => {
                  if (battleState.winner === null) {
                    onBattleComplete('draw');
                  } else {
                    onBattleComplete(battleState.winner);
                  }
                }}
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

        {!battleState.battleActive && battleState.winner === null && battleState.currentRound === 1 && (
          <button
            onClick={startBattle}
            className="mt-4 bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
          >
            Start Battle!
          </button>
        )}
      </div>

      {/* Stats Comparison */}
      <div className="bg-white rounded-lg shadow-lg p-4 relative group">
        <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Battle Stats Comparison</h3>
        
        {/* Detailed breakdown tooltip */}
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 text-white p-4 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
          <div className="text-sm font-bold mb-2">Detailed Battle Breakdown:</div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="font-bold text-blue-400 mb-2">Your Tank:</div>
              <div className="space-y-1 text-xs">
                {(() => {
                  const fishPieces = playerPieces.filter(piece => piece.type === 'fish');
                  const enhancedPieces = applyBonusesToPieces(fishPieces);
                  return enhancedPieces.map(piece => {
                    const originalPiece = fishPieces.find(p => p.id === piece.id);
                    const attackBonus = piece.stats.attack - originalPiece!.stats.attack;
                    const healthBonus = piece.stats.health - originalPiece!.stats.health;
                    const speedBonus = piece.stats.speed - originalPiece!.stats.speed;
                    
                    return (
                      <div key={piece.id} className="flex justify-between">
                        <span>{piece.name}:</span>
                        <span>
                          <span className="text-red-400">{originalPiece!.stats.attack}</span>
                          {attackBonus > 0 && <span className="text-green-400">(+{attackBonus})</span>}
                          {' / '}
                          <span className="text-green-400">{originalPiece!.stats.health}</span>
                          {healthBonus > 0 && <span className="text-green-400">(+{healthBonus})</span>}
                          {' / '}
                          <span className="text-blue-400">{originalPiece!.stats.speed}</span>
                          {speedBonus > 0 && <span className="text-cyan-400">(+{speedBonus})</span>}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            <div>
              <div className="font-bold text-red-400 mb-2">Opponent Tank:</div>
              <div className="space-y-1 text-xs">
                {(() => {
                  const fishPieces = opponentPieces.filter(piece => piece.type === 'fish');
                  const enhancedPieces = applyBonusesToPieces(fishPieces);
                  return enhancedPieces.map(piece => {
                    const originalPiece = fishPieces.find(p => p.id === piece.id);
                    const attackBonus = piece.stats.attack - originalPiece!.stats.attack;
                    const healthBonus = piece.stats.health - originalPiece!.stats.health;
                    const speedBonus = piece.stats.speed - originalPiece!.stats.speed;
                    
                    return (
                      <div key={piece.id} className="flex justify-between">
                        <span>{piece.name}:</span>
                        <span>
                          <span className="text-red-400">{originalPiece!.stats.attack}</span>
                          {attackBonus > 0 && <span className="text-green-400">(+{attackBonus})</span>}
                          {' / '}
                          <span className="text-green-400">{originalPiece!.stats.health}</span>
                          {healthBonus > 0 && <span className="text-green-400">(+{healthBonus})</span>}
                          {' / '}
                          <span className="text-blue-400">{originalPiece!.stats.speed}</span>
                          {speedBonus > 0 && <span className="text-cyan-400">(+{speedBonus})</span>}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Player Stats */}
          <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200 p-3">
            <h4 className="font-bold text-blue-900 mb-3 text-center">Your Tank</h4>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-700 mb-2">Attack</div>
                {(() => {
                  const enhancedPlayerPieces = applyBonusesToPieces(playerPieces);
                  const baseAttack = playerPieces.filter(piece => piece.type === 'fish').reduce((total, piece) => total + piece.stats.attack, 0);
                  const totalAttack = enhancedPlayerPieces.filter(piece => piece.type === 'fish').reduce((total, piece) => total + piece.stats.attack, 0);
                  const bonusAttack = totalAttack - baseAttack;
                  
                  // Calculate final attack with water quality
                  let finalAttack = totalAttack;
                  let waterQualityBonus = 0;
                  if (playerWaterQuality < 3) {
                    finalAttack = Math.max(1, Math.floor(totalAttack * 0.7));
                    waterQualityBonus = finalAttack - totalAttack;
                  } else if (playerWaterQuality > 7) {
                    finalAttack = Math.max(1, Math.floor(totalAttack * 1.2));
                    waterQualityBonus = finalAttack - totalAttack;
                  }
                  
                  return (
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-gray-700">
                        Base: {baseAttack}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        Bonus: {bonusAttack > 0 ? `+${bonusAttack}` : '0'}
                      </div>
                      <div className="text-xl font-bold text-red-600">
                        Total: {finalAttack}
                        {waterQualityBonus !== 0 && (
                          <div className={`text-xs ${waterQualityBonus > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ({waterQualityBonus > 0 ? '+' : ''}{waterQualityBonus} water)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-700 mb-2">Health</div>
                {(() => {
                  const enhancedPlayerPieces = applyBonusesToPieces(playerPieces);
                  const baseHealth = playerPieces.filter(piece => 
                    piece.type === 'fish' || piece.type === 'plant' || piece.type === 'equipment'
                  ).reduce((total, piece) => total + piece.stats.health, 0);
                  const totalHealth = enhancedPlayerPieces.filter(piece => 
                    piece.type === 'fish' || piece.type === 'plant' || piece.type === 'equipment'
                  ).reduce((total, piece) => total + piece.stats.health, 0);
                  const bonusHealth = totalHealth - baseHealth;
                  
                  return (
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-gray-700">
                        Base: {baseHealth}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        Bonus: {bonusHealth > 0 ? `+${bonusHealth}` : '0'}
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        Total: {totalHealth}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-700 mb-2">Speed</div>
                {(() => {
                  const enhancedPlayerPieces = applyBonusesToPieces(playerPieces);
                  const playerFish = playerPieces.filter(piece => piece.type === 'fish');
                  const enhancedPlayerFish = enhancedPlayerPieces.filter(piece => piece.type === 'fish');
                  
                  if (playerFish.length === 0) return (
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-gray-700">Base: 0</div>
                      <div className="text-lg font-bold text-green-600">Bonus: 0</div>
                      <div className="text-xl font-bold text-blue-600">Total: 0</div>
                    </div>
                  );
                  
                  const baseSpeed = Math.round(playerFish.reduce((total, piece) => total + piece.stats.speed, 0) / playerFish.length);
                  const totalSpeed = Math.round(enhancedPlayerFish.reduce((total, piece) => total + piece.stats.speed, 0) / enhancedPlayerFish.length);
                  const bonusSpeed = totalSpeed - baseSpeed;
                  
                  return (
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-gray-700">
                        Base: {baseSpeed}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        Bonus: {bonusSpeed > 0 ? `+${bonusSpeed}` : '0'}
                      </div>
                      <div className="text-xl font-bold text-blue-600">
                        Total: {totalSpeed}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              <div className="flex justify-between mb-1">
                <span>Fish: {playerPieces.filter(piece => piece.type === 'fish').length} | Plants/Equipment: {playerPieces.filter(piece => piece.type === 'plant' || piece.type === 'equipment').length}</span>
                <span className={`font-bold ${
                  playerWaterQuality < 3 ? 'text-red-600' : 
                  playerWaterQuality > 7 ? 'text-green-600' : 
                  'text-gray-600'
                }`}>
                  Water Quality: {playerWaterQuality}/10
                </span>
              </div>
              {playerWaterQuality < 3 && (
                <div className="text-red-600 font-medium text-center">
                  ⚠️ Poor water quality: -30% attack damage & poison damage each round
                </div>
              )}
              {playerWaterQuality > 7 && (
                <div className="text-green-600 font-medium text-center">
                  ✨ Excellent water quality: +20% attack damage
                </div>
              )}
            </div>
          </div>

          {/* Opponent Stats */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200 p-3">
            <h4 className="font-bold text-red-900 mb-3 text-center">Opponent Tank</h4>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-700 mb-2">Attack</div>
                {(() => {
                  const enhancedOpponentPieces = applyBonusesToPieces(opponentPieces);
                  const baseAttack = opponentPieces.filter(piece => piece.type === 'fish').reduce((total, piece) => total + piece.stats.attack, 0);
                  const totalAttack = enhancedOpponentPieces.filter(piece => piece.type === 'fish').reduce((total, piece) => total + piece.stats.attack, 0);
                  const bonusAttack = totalAttack - baseAttack;
                  
                  // Calculate final attack with water quality
                  let finalAttack = totalAttack;
                  let waterQualityBonus = 0;
                  if (opponentWaterQuality < 3) {
                    finalAttack = Math.max(1, Math.floor(totalAttack * 0.7));
                    waterQualityBonus = finalAttack - totalAttack;
                  } else if (opponentWaterQuality > 7) {
                    finalAttack = Math.max(1, Math.floor(totalAttack * 1.2));
                    waterQualityBonus = finalAttack - totalAttack;
                  }
                  
                  return (
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-gray-700">
                        Base: {baseAttack}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        Bonus: {bonusAttack > 0 ? `+${bonusAttack}` : '0'}
                      </div>
                      <div className="text-xl font-bold text-red-600">
                        Total: {finalAttack}
                        {waterQualityBonus !== 0 && (
                          <div className={`text-xs ${waterQualityBonus > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ({waterQualityBonus > 0 ? '+' : ''}{waterQualityBonus} water)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-700 mb-2">Health</div>
                {(() => {
                  const enhancedOpponentPieces = applyBonusesToPieces(opponentPieces);
                  const baseHealth = opponentPieces.filter(piece => 
                    piece.type === 'fish' || piece.type === 'plant' || piece.type === 'equipment'
                  ).reduce((total, piece) => total + piece.stats.health, 0);
                  const totalHealth = enhancedOpponentPieces.filter(piece => 
                    piece.type === 'fish' || piece.type === 'plant' || piece.type === 'equipment'
                  ).reduce((total, piece) => total + piece.stats.health, 0);
                  const bonusHealth = totalHealth - baseHealth;
                  
                  return (
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-gray-700">
                        Base: {baseHealth}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        Bonus: {bonusHealth > 0 ? `+${bonusHealth}` : '0'}
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        Total: {totalHealth}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-700 mb-2">Speed</div>
                {(() => {
                  const enhancedOpponentPieces = applyBonusesToPieces(opponentPieces);
                  const opponentFish = opponentPieces.filter(piece => piece.type === 'fish');
                  const enhancedOpponentFish = enhancedOpponentPieces.filter(piece => piece.type === 'fish');
                  
                  if (opponentFish.length === 0) return (
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-gray-700">Base: 0</div>
                      <div className="text-lg font-bold text-green-600">Bonus: 0</div>
                      <div className="text-xl font-bold text-blue-600">Total: 0</div>
                    </div>
                  );
                  
                  const baseSpeed = Math.round(opponentFish.reduce((total, piece) => total + piece.stats.speed, 0) / opponentFish.length);
                  const totalSpeed = Math.round(enhancedOpponentFish.reduce((total, piece) => total + piece.stats.speed, 0) / enhancedOpponentFish.length);
                  const bonusSpeed = totalSpeed - baseSpeed;
                  
                  return (
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-gray-700">
                        Base: {baseSpeed}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        Bonus: {bonusSpeed > 0 ? `+${bonusSpeed}` : '0'}
                      </div>
                      <div className="text-xl font-bold text-blue-600">
                        Total: {totalSpeed}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              <div className="flex justify-between mb-1">
                <span>Fish: {opponentPieces.filter(piece => piece.type === 'fish').length} | Plants/Equipment: {opponentPieces.filter(piece => piece.type === 'plant' || piece.type === 'equipment').length}</span>
                <span className={`font-bold ${
                  opponentWaterQuality < 3 ? 'text-red-600' : 
                  opponentWaterQuality > 7 ? 'text-green-600' : 
                  'text-gray-600'
                }`}>
                  Water Quality: {opponentWaterQuality}/10
                </span>
              </div>
              {opponentWaterQuality < 3 && (
                <div className="text-red-600 font-medium text-center">
                  ⚠️ Poor water quality: -30% attack damage & poison damage each round
                </div>
              )}
              {opponentWaterQuality > 7 && (
                <div className="text-green-600 font-medium text-center">
                  ✨ Excellent water quality: +20% attack damage
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Advantage Indicators */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-700 mb-1">Attack Advantage</div>
            {(() => {
              const enhancedPlayerPieces = applyBonusesToPieces(playerPieces);
              const enhancedOpponentPieces = applyBonusesToPieces(opponentPieces);
              
              // Calculate total attack including water quality
              let playerAttack = enhancedPlayerPieces.filter(piece => piece.type === 'fish').reduce((total, piece) => total + piece.stats.attack, 0);
              let opponentAttack = enhancedOpponentPieces.filter(piece => piece.type === 'fish').reduce((total, piece) => total + piece.stats.attack, 0);
              
              // Apply water quality modifiers
              if (playerWaterQuality < 3) {
                playerAttack = Math.max(1, Math.floor(playerAttack * 0.7));
              } else if (playerWaterQuality > 7) {
                playerAttack = Math.floor(playerAttack * 1.2);
              }
              
              if (opponentWaterQuality < 3) {
                opponentAttack = Math.max(1, Math.floor(opponentAttack * 0.7));
              } else if (opponentWaterQuality > 7) {
                opponentAttack = Math.floor(opponentAttack * 1.2);
              }
              
              const diff = playerAttack - opponentAttack;
              if (diff > 0) {
                return <div className="text-green-600 font-bold">+{diff} You</div>;
              } else if (diff < 0) {
                return <div className="text-red-600 font-bold">{Math.abs(diff)} Opponent</div>;
              } else {
                return <div className="text-gray-600 font-bold">Even</div>;
              }
            })()}
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700 mb-1">Health Advantage</div>
            {(() => {
              const enhancedPlayerPieces = applyBonusesToPieces(playerPieces);
              const enhancedOpponentPieces = applyBonusesToPieces(opponentPieces);
              const playerHealth = enhancedPlayerPieces.filter(piece => 
                piece.type === 'fish' || piece.type === 'plant' || piece.type === 'equipment'
              ).reduce((total, piece) => total + piece.stats.health, 0);
              const opponentHealth = enhancedOpponentPieces.filter(piece => 
                piece.type === 'fish' || piece.type === 'plant' || piece.type === 'equipment'
              ).reduce((total, piece) => total + piece.stats.health, 0);
              const diff = playerHealth - opponentHealth;
              if (diff > 0) {
                return <div className="text-green-600 font-bold">+{diff} You</div>;
              } else if (diff < 0) {
                return <div className="text-red-600 font-bold">{Math.abs(diff)} Opponent</div>;
              } else {
                return <div className="text-gray-600 font-bold">Even</div>;
              }
            })()}
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700 mb-1">Speed Advantage</div>
            {(() => {
              const enhancedPlayerPieces = applyBonusesToPieces(playerPieces);
              const enhancedOpponentPieces = applyBonusesToPieces(opponentPieces);
              const playerFish = enhancedPlayerPieces.filter(piece => piece.type === 'fish');
              const opponentFish = enhancedOpponentPieces.filter(piece => piece.type === 'fish');
              const playerSpeed = playerFish.length > 0 ? Math.round(playerFish.reduce((total, piece) => total + piece.stats.speed, 0) / playerFish.length) : 0;
              const opponentSpeed = opponentFish.length > 0 ? Math.round(opponentFish.reduce((total, piece) => total + piece.stats.speed, 0) / opponentFish.length) : 0;
              const diff = playerSpeed - opponentSpeed;
              if (diff > 0) {
                return <div className="text-green-600 font-bold">+{diff} You</div>;
              } else if (diff < 0) {
                return <div className="text-red-600 font-bold">{Math.abs(diff)} Opponent</div>;
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
            highlightedPieceId={null}
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
            highlightedPieceId={null}
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
                className={`text-sm p-2 rounded border-l-4 ${(() => {
                  // Color code based on what happened to whom
                  const isPlayerAction = event.source.includes('Your');
                  const isEnemyTarget = event.target?.includes('Enemy');
                  const isPlayerTarget = event.target?.includes('Your');
                  const isKO = event.target?.includes('KO!') || event.target?.includes('Destroyed!');
                  
                  if (event.type === 'status') {
                    return 'bg-purple-50 border-purple-400';
                  }
                  
                  // Good events (your fish attacking/killing enemies)
                  if (isPlayerAction && isEnemyTarget) {
                    return isKO 
                      ? 'bg-green-100 border-green-500 text-green-800' 
                      : 'bg-green-50 border-green-400 text-green-700';
                  }
                  
                  // Bad events (enemy fish attacking/killing yours)
                  if (!isPlayerAction && isPlayerTarget) {
                    return isKO 
                      ? 'bg-red-100 border-red-500 text-red-800' 
                      : 'bg-red-50 border-red-400 text-red-700';
                  }
                  
                  // Neutral/default
                  return 'bg-gray-50 border-gray-400';
                })()}`}
              >
                <div>
                  <span className="font-medium">
                    Round {event.round}: {event.source}
                  </span>
                  {event.value > 0 && (
                    <span className="font-bold text-current opacity-80">
                      → {event.target}
                    </span>
                  )}
                  {event.value === 0 && event.target && (
                    <span className="font-bold text-current opacity-80">
                      → {event.target}
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {!battleState.battleActive && (
              <div className={`text-sm p-3 rounded font-bold text-center ${
                battleState.winner === null
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  : battleState.winner === 'player' 
                  ? 'bg-green-100 text-green-800 border border-green-300' 
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                {battleState.winner === null ? '🤝 DRAW!' : '🏆'} 
                {battleState.winner === null ? ' Both tanks fought valiantly!' :
                 battleState.winner === 'player' ? ' VICTORY! Your tank dominated the battlefield!' : 
                 ' DEFEAT! Better luck next time!'}
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