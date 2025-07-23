import { useState, useCallback } from 'react';
import { GameState, GamePiece, Position } from '../types/game';
import { getRandomShop, PIECE_LIBRARY, getRarityWeight } from '../data/pieces';

const INITIAL_STATE: GameState = {
  phase: 'shop',
  round: 1,
  gold: 10,
  lossStreak: 0,
  opponentLossStreak: 0,
  wins: 0,
  losses: 0,
  opponentWins: 0,
  opponentLosses: 0,
  playerTank: {
    id: 'player',
    pieces: [],
    waterQuality: 5,
    temperature: 25,
    grid: Array(6).fill(null).map(() => Array(8).fill(null))
  },
  opponentTank: {
    id: 'opponent',
    pieces: [],
    waterQuality: 5,
    temperature: 25,
    grid: Array(6).fill(null).map(() => Array(8).fill(null))
  },
  shop: getRandomShop(),
  battleEvents: [],
  selectedPiece: null,
  opponentGold: 10,
  opponentShop: getRandomShop(),
  lockedShopIndex: null,
  goldHistory: [
    {
      id: 'initial',
      round: 1,
      type: 'round_start',
      amount: 10,
      description: 'Starting gold',
      timestamp: Date.now()
    }
  ],
  rerollsThisRound: 0
};

// AI opponent logic
const simulateOpponentTurn = (opponentGold: number, round: number, currentPieces: GamePiece[]) => {
  const shop = getRandomShop();
  let gold = opponentGold;
  const newPieces: GamePiece[] = [...currentPieces];
  
  // Improved AI reroll strategy - more conservative, especially after losses
  let currentShop = shop;
  const rerollCost = 2;
  let rerollsUsed = 0;
  
  // Calculate max rerolls based on gold and game state
  // After losses, be more conservative with rerolls
  const baseMaxRerolls = Math.min(Math.floor(gold / 6), 2); // Don't spend more than 1/3 gold on rerolls
  const maxRerolls = round <= 3 ? Math.min(baseMaxRerolls, 1) : baseMaxRerolls; // Early game: max 1 reroll
  
  while (rerollsUsed < maxRerolls && gold >= rerollCost) {
    const affordablePieces = currentShop.filter(piece => piece && piece.cost <= (gold - rerollCost));
    
    // More sophisticated evaluation of shop quality
    const evaluateShopQuality = (pieces: (GamePiece | null)[]) => {
      const validPieces = pieces.filter(piece => piece && piece.cost <= gold);
      if (validPieces.length === 0) return 0;
      
      let qualityScore = 0;
      validPieces.forEach(piece => {
        if (!piece) return;
        
        // Base efficiency score
        const efficiency = (piece.stats.attack + piece.stats.health) / piece.cost;
        qualityScore += efficiency;
        
        // Rarity bonus
        if (piece.rarity === 'rare') qualityScore += 2;
        if (piece.rarity === 'epic') qualityScore += 4;
        if (piece.rarity === 'legendary') qualityScore += 6;
        
        // Synergy bonus with existing pieces
        const existingTags = newPieces.flatMap(p => p.tags);
        piece.tags.forEach(tag => {
          if (existingTags.includes(tag)) qualityScore += 1;
        });
      });
      
      return qualityScore / validPieces.length; // Average quality
    };
    
    const currentQuality = evaluateShopQuality(currentShop);
    
    // Only reroll if shop quality is below threshold AND we have enough gold left to buy
    const qualityThreshold = round <= 3 ? 2.5 : round <= 6 ? 3.0 : 3.5;
    const hasEnoughGoldAfterReroll = (gold - rerollCost) >= Math.min(...currentShop.filter(p => p).map(p => p!.cost));
    
    if (currentQuality < qualityThreshold && hasEnoughGoldAfterReroll) {
      const newShop = getRandomShop();
      const newQuality = evaluateShopQuality(newShop);
      
      // Only actually reroll if the new shop would likely be better
      if (newQuality > currentQuality * 1.1) { // At least 10% better
        currentShop = newShop;
        gold -= rerollCost;
        rerollsUsed++;
      } else {
        break; // Don't reroll if new shop isn't significantly better
      }
    } else {
      break; // Shop is good enough or we don't have enough gold
    }
  }
  
  // Now buy pieces with remaining gold
  const affordablePieces = currentShop.filter(piece => piece && piece.cost <= gold);
  
  const goodPieces = affordablePieces.filter(piece => {
      if (!piece) return false;
      // More nuanced evaluation of what makes a piece "good"
      const efficiency = (piece.stats.attack + piece.stats.health) / piece.cost;
      const isRare = piece.rarity === 'rare' || piece.rarity === 'epic' || piece.rarity === 'legendary';
      const hasGoodEfficiency = efficiency > (round <= 3 ? 1.8 : round <= 6 ? 2.2 : 2.5);
      
      // Check for synergies
      const existingTags = newPieces.flatMap(p => p.tags);
      const hasSynergy = piece.tags.some(tag => existingTags.includes(tag));
      
      return isRare || hasGoodEfficiency || hasSynergy;
    });
    
  // AI strategy based on round
  const maxPieces = Math.min(48, 4 + Math.floor(round * 1.5)); // Scale up to full board (48 slots)
  
  // More aggressive spending, especially after losses
  const minSpending = Math.max(6, Math.min(gold * 0.7, round * 2)); // Spend at least 70% of gold or round*2, whichever is higher
  const targetSpending = Math.min(gold, minSpending);
  
  // Filter affordable pieces from shop
  const finalAffordablePieces = currentShop.filter(piece => piece && piece.cost <= gold);
  
  // AI preferences (weighted by round)
  const getAIPriority = (piece: GamePiece) => {
    let priority = 0;
    
    // Early game: prefer cheap, efficient pieces
    if (round <= 3) {
      priority += (10 - piece.cost); // Prefer cheaper pieces
      priority += piece.stats.attack + piece.stats.health; // Basic stats
    }
    // Mid game: prefer synergies and utility
    else if (round <= 8) {
      priority += piece.stats.attack * 2 + piece.stats.health; // Favor attack
      if (piece.tags.includes('schooling')) priority += 5;
      if (piece.type === 'plant' || piece.type === 'equipment') priority += 3;
      if (piece.rarity === 'rare') priority += 4;
    }
    // Late game: prefer high-value pieces
    else {
      priority += piece.stats.attack * 3 + piece.stats.health * 2;
      if (piece.rarity === 'rare') priority += 6;
      if (piece.rarity === 'epic' || piece.rarity === 'legendary') priority += 10;
      if (piece.cost >= 6) priority += 3; // Prefer expensive pieces late game
    }
    
    // Bonus for synergies with existing pieces
    const existingTags = newPieces.flatMap(p => p.tags);
    piece.tags.forEach(tag => {
      if (existingTags.includes(tag)) priority += 2;
    });
    
    return priority;
  };
  
  // Sort by AI priority
  finalAffordablePieces.sort((a, b) => getAIPriority(b!) - getAIPriority(a!));
  
  // Buy pieces until we hit our limits or target spending
  let totalSpent = rerollsUsed * rerollCost;
  for (const piece of finalAffordablePieces) {
    if (!piece || gold < piece.cost || newPieces.length >= maxPieces) continue;
    
    // Always try to spend at least the minimum amount
    if (totalSpent >= targetSpending && totalSpent >= minSpending) continue;
    
    // Find available positions for this piece
    const availablePositions: Position[] = [];
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 8; x++) {
        const canPlace = piece.shape.every(offset => {
          const px = x + offset.x;
          const py = y + offset.y;
          return px >= 0 && px < 8 && py >= 0 && py < 6 && 
                 !newPieces.some(p => p.position && 
                   p.shape.some(pOffset => 
                     p.position!.x + pOffset.x === px && 
                     p.position!.y + pOffset.y === py
                   )
                 );
        });
        
        if (canPlace) {
          availablePositions.push({ x, y });
        }
      }
    }
    
    if (availablePositions.length > 0) {
      const randomPos = availablePositions[Math.floor(Math.random() * availablePositions.length)];
      newPieces.push({
        ...piece,
        id: `opp-${piece.id}-${Math.random().toString(36).substr(2, 9)}`,
        position: randomPos
      });
      gold -= piece.cost;
      totalSpent += piece.cost;
    }
  }
  
  // Calculate water quality for opponent
  let waterQuality = 5;
  const plantsAndFilters = newPieces.filter(p => 
    p.tags.includes('plant') || p.tags.includes('filtration')
  ).length;
  waterQuality += plantsAndFilters;
  
  const fishCount = newPieces.filter(p => p.type === 'fish').length;
  if (fishCount > 4) waterQuality -= (fishCount - 4);
  
  waterQuality = Math.max(0, Math.min(10, waterQuality));
  
  // Process opponent's consumables (same logic as player)
  let battlePieces = [...newPieces];
  const consumables = battlePieces.filter(p => p.type === 'consumable');
  
  // Helper function to parse consumable effects

  // Apply each consumable's effect to adjacent fish
  consumables.forEach(consumable => {
    if (consumable.position) {
      // Get all adjacent positions for all tiles of the consumable
      const adjacentPositions: Position[] = [];
      const checkedPositions = new Set<string>();
      
      consumable.shape.forEach(shapeOffset => {
        const consumableX = consumable.position!.x + shapeOffset.x;
        const consumableY = consumable.position!.y + shapeOffset.y;
        
        // Check all 4 directions from each tile of this consumable
        const directions = [
          { x: consumableX - 1, y: consumableY },
          { x: consumableX + 1, y: consumableY },
          { x: consumableX, y: consumableY - 1 },
          { x: consumableX, y: consumableY + 1 }
        ];
        
        directions.forEach(pos => {
          const posKey = `${pos.x},${pos.y}`;
          if (!checkedPositions.has(posKey) && 
              pos.x >= 0 && pos.x < 8 && 
              pos.y >= 0 && pos.y < 6) {
            // Make sure this position isn't occupied by the same consumable
            const isOwnTile = consumable.shape.some(offset => 
              consumable.position!.x + offset.x === pos.x && 
              consumable.position!.y + offset.y === pos.y
            );
            if (!isOwnTile) {
              adjacentPositions.push(pos);
              checkedPositions.add(posKey);
            }
          }
        });
      });
      
      battlePieces = battlePieces.map(p => {
        if (p.type === 'fish' && p.position) {
          // Check if any tile of this fish is adjacent to any tile of the consumable
          const isAdjacent = p.shape.some(fishOffset => {
            const fishX = p.position!.x + fishOffset.x;
            const fishY = p.position!.y + fishOffset.y;
            return adjacentPositions.some(adj => adj.x === fishX && adj.y === fishY);
          });
          
          if (isAdjacent) {
            // Use the consumable's bonus fields directly
            const attackBonus = consumable.attackBonus || 0;
            const healthBonus = consumable.healthBonus || 0;
            const speedBonus = consumable.speedBonus || 0;

            // Create consumed effect record
            const consumedEffect: ConsumedEffect = {
              consumableId: consumable.id,
              consumableName: consumable.name,
              effect: `${attackBonus > 0 ? `+${attackBonus} ATK ` : ''}${healthBonus > 0 ? `+${healthBonus} HP ` : ''}${speedBonus > 0 ? `+${speedBonus} SPD ` : ''}(consumed)`.trim(),
              appliedAt: Date.now()
            };
            
            const enhancedPiece = p as EnhancedGamePiece;
            const existingEffects = enhancedPiece.consumedEffects || [];
            
            return {
              ...p,
              originalStats: enhancedPiece.originalStats || {
                attack: p.stats.attack,
                health: p.stats.health,
                speed: p.stats.speed,
                maxHealth: p.stats.maxHealth
              },
              consumedEffects: [...existingEffects, consumedEffect],
              stats: {
                ...p.stats,
                attack: p.stats.attack + attackBonus,
                health: p.stats.health + healthBonus,
                maxHealth: p.stats.maxHealth + healthBonus
                speed: p.stats.speed + speedBonus
              }
            } as EnhancedGamePiece;
          }
        }
        return p;
      });
    }
  });
  
  // Remove consumables after applying effects
  battlePieces = battlePieces.filter(p => p.type !== 'consumable');
  
  return {
    pieces: battlePieces,
    remainingGold: gold,
    waterQuality
  };
};

export const useGame = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);

  // Helper function to add gold transaction
  const addGoldTransaction = (
    type: GoldTransaction['type'],
    amount: number,
    description: string,
    round: number,
    pieceId?: string,
    pieceName?: string
  ): GoldTransaction => {
    return {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      round,
      type,
      amount,
      description,
      timestamp: Date.now(),
      pieceId,
      pieceName
    };
  };

  // Calculate interest based on current gold
  const calculateInterest = (currentGold: number): number => {
    // Interest: 1 gold per 10 gold held, max 5 interest per round
    return Math.min(Math.floor(currentGold / 10), 5);
  };

  const purchasePiece = useCallback((piece: GamePiece) => {
    setGameState(prev => {
      if (prev.gold < piece.cost) return prev;
      
      // Remove the purchased piece from shop
      const newShop = prev.shop.map(shopPiece => 
        shopPiece?.id === piece.id ? null : shopPiece
      );
      
      // Clear lock if we purchased the locked item
      const purchasedIndex = prev.shop.findIndex(shopPiece => shopPiece?.id === piece.id);
      const newLockedIndex = prev.lockedShopIndex === purchasedIndex ? null : prev.lockedShopIndex;
      
      // Add purchase transaction
      const transaction = addGoldTransaction(
        'purchase',
        -piece.cost,
        `Purchased ${piece.name} for ${piece.cost}g`,
        prev.round,
        piece.id,
        piece.name
      );
      
      return {
        ...prev,
        gold: prev.gold - piece.cost,
        shop: newShop,
        lockedShopIndex: newLockedIndex,
        playerTank: {
          ...prev.playerTank,
          pieces: [...prev.playerTank.pieces, piece]
        },
        selectedPiece: null,
        phase: 'shop' as const,
        goldHistory: [...prev.goldHistory, transaction]
      };
    });
  }, []);

  const placePiece = useCallback((piece: GamePiece, position: Position) => {
    setGameState(prev => {
      // Check if position is valid
      const canPlace = piece.shape.every(offset => {
        const x = position.x + offset.x;
        const y = position.y + offset.y;
        return x >= 0 && x < 8 && y >= 0 && y < 6 && !prev.playerTank.grid[y][x];
      });

      if (!canPlace) return prev;

      // Check if piece is already in tank (from inventory) or is new (from shop)
      const existingPieceIndex = prev.playerTank.pieces.findIndex(p => p.id === piece.id);
      let newPieces;
      let newGoldHistory = prev.goldHistory;
      let newGold = prev.gold;
      let newShop = prev.shop;
      let newLockedIndex = prev.lockedShopIndex;
      
      if (existingPieceIndex >= 0) {
        // Update existing piece position (from inventory)
        newPieces = prev.playerTank.pieces.map((p, index) => 
          index === existingPieceIndex ? { ...p, position } : p
        );
      } else {
        // This is a new piece being placed from shop via drag-and-drop
        // We need to purchase it first
        if (prev.gold < piece.cost) return prev; // Can't afford it
        
        // Add purchase transaction
        const transaction = addGoldTransaction(
          'purchase',
          -piece.cost,
          `Purchased ${piece.name} for ${piece.cost}g`,
          prev.round,
          piece.id,
          piece.name
        );
        
        newGoldHistory = [...prev.goldHistory, transaction];
        newGold = prev.gold - piece.cost;
        
        // Remove from shop
        const purchasedIndex = prev.shop.findIndex(shopPiece => shopPiece?.id === piece.id);
        newShop = prev.shop.map(shopPiece => 
          shopPiece?.id === piece.id ? null : shopPiece
        );
        
        // Clear lock if we purchased the locked item via drag-and-drop
        newLockedIndex = prev.lockedShopIndex === purchasedIndex ? null : prev.lockedShopIndex;
        
        const newPiece = { ...piece, position };
        newPieces = [...prev.playerTank.pieces, newPiece];
      }
      
      const newGrid = prev.playerTank.grid.map(row => [...row]);
      
      // Mark grid cells as occupied
      piece.shape.forEach(offset => {
        const x = position.x + offset.x;
        const y = position.y + offset.y;
        newGrid[y][x] = piece.id;
      });

      // Calculate new water quality
      let waterQuality = 5;
      const allPieces = newPieces;
      
      // Plants and filters improve water quality
      const plantsAndFilters = allPieces.filter(p => 
        p.tags.includes('plant') || p.tags.includes('filtration')
      ).length;
      waterQuality += plantsAndFilters;
      
      // Too many fish reduce water quality
      const fishCount = allPieces.filter(p => p.type === 'fish').length;
      if (fishCount > 4) waterQuality -= (fishCount - 4);
      
      waterQuality = Math.max(0, Math.min(10, waterQuality));

      return {
        ...prev,
        playerTank: {
          ...prev.playerTank,
          pieces: newPieces,
          grid: newGrid,
          waterQuality
        },
        selectedPiece: null,
        phase: 'shop' as const,
        shop: newShop,
        lockedShopIndex: newLockedIndex,
        gold: newGold,
        goldHistory: newGoldHistory
      };
    });
  }, []);

  const movePiece = useCallback((piece: GamePiece, newPosition: Position) => {
    setGameState(prev => {
      if (prev.phase !== 'shop') return prev;
      
      // Remove piece from current position
      const newGrid = prev.playerTank.grid.map(row => [...row]);
      
      // Clear old position
      if (piece.position) {
        piece.shape.forEach(offset => {
          const x = piece.position!.x + offset.x;
          const y = piece.position!.y + offset.y;
          if (x >= 0 && x < 8 && y >= 0 && y < 6) {
            newGrid[y][x] = null;
          }
        });
      }
      
      // Check if new position is valid
      const canPlace = piece.shape.every(offset => {
        const x = newPosition.x + offset.x;
        const y = newPosition.y + offset.y;
        return x >= 0 && x < 8 && y >= 0 && y < 6 && !newGrid[y][x];
      });

      if (!canPlace) return prev;

      // Place at new position
      piece.shape.forEach(offset => {
        const x = newPosition.x + offset.x;
        const y = newPosition.y + offset.y;
        newGrid[y][x] = piece.id;
      });

      // Update piece position
      const newPieces = prev.playerTank.pieces.map(p => 
        p.id === piece.id ? { ...p, position: newPosition } : p
      );

      return {
        ...prev,
        playerTank: {
          ...prev.playerTank,
          pieces: newPieces,
          grid: newGrid
        },
        selectedPiece: null
      };
    });
  }, []);

  const rerollShop = useCallback(() => {
    setGameState(prev => {
      // Calculate escalating reroll cost: 2g for first 5, then +1g for each additional
      const rerollCost = prev.rerollsThisRound < 5 ? 2 : 2 + (prev.rerollsThisRound - 4);
      
      if (prev.gold < rerollCost) return prev;
      
      // Generate new shop but preserve locked item
      const newShop = getRandomShop(5);
      if (prev.lockedShopIndex !== null && prev.shop[prev.lockedShopIndex]) {
        newShop[prev.lockedShopIndex] = prev.shop[prev.lockedShopIndex];
      }
      
      // Add reroll transaction
      const transaction = addGoldTransaction(
        'reroll',
        -rerollCost,
        `Shop reroll #${prev.rerollsThisRound + 1}`,
        prev.round
      );
      
      return {
        ...prev,
        gold: prev.gold - rerollCost,
        shop: newShop,
        goldHistory: [...prev.goldHistory, transaction],
        rerollsThisRound: prev.rerollsThisRound + 1
      };
    });
  }, []);

  const startBattle = useCallback(() => {
    setGameState(prev => {
      // Simulate opponent's turn first
      const opponentResult = simulateOpponentTurn(
        prev.opponentGold, 
        prev.round, 
        prev.opponentTank.pieces
      );
      
      // Apply consumable effects before battle
      let battlePieces = [...prev.playerTank.pieces];
      const consumables = battlePieces.filter(p => p.type === 'consumable');
      
      // Helper function to parse consumable effects

      // Apply each consumable's effect
      consumables.forEach(consumable => {
        if (consumable.position) {
          // Get all adjacent positions for all tiles of the consumable
          const adjacentPositions: Position[] = [];
          const checkedPositions = new Set<string>();
          
          consumable.shape.forEach(shapeOffset => {
            const consumableX = consumable.position!.x + shapeOffset.x;
            const consumableY = consumable.position!.y + shapeOffset.y;
            
            // Check all 4 directions from each tile of this consumable
            const directions = [
              { x: consumableX - 1, y: consumableY },
              { x: consumableX + 1, y: consumableY },
              { x: consumableX, y: consumableY - 1 },
              { x: consumableX, y: consumableY + 1 }
            ];
            
            directions.forEach(pos => {
              const posKey = `${pos.x},${pos.y}`;
              if (!checkedPositions.has(posKey) && 
                  pos.x >= 0 && pos.x < 8 && 
                  pos.y >= 0 && pos.y < 6) {
                // Make sure this position isn't occupied by the same consumable
                const isOwnTile = consumable.shape.some(offset => 
                  consumable.position!.x + offset.x === pos.x && 
                  consumable.position!.y + offset.y === pos.y
                );
                if (!isOwnTile) {
                  maxHealth: p.stats.maxHealth + healthBonus,
                  checkedPositions.add(posKey);
                }
              }
            });
          });
          
          battlePieces = battlePieces.map(p => {
            if (p.type === 'fish' && p.position) {
              // Check if any tile of this fish is adjacent to any tile of the consumable
              const isAdjacent = p.shape.some(fishOffset => {
                const fishX = p.position!.x + fishOffset.x;
                const fishY = p.position!.y + fishOffset.y;
                return adjacentPositions.some(adj => adj.x === fishX && adj.y === fishY);
              });
              
              if (isAdjacent) {
                // Use the consumable's bonus fields directly
                const attackBonus = consumable.attackBonus || 0;
                const healthBonus = consumable.healthBonus || 0;
                const speedBonus = consumable.speedBonus || 0;

                // Create consumed effect record
                const consumedEffect: ConsumedEffect = {
                  consumableId: consumable.id,
                  consumableName: consumable.name,
                  effect: `${attackBonus > 0 ? `+${attackBonus} ATK ` : ''}${healthBonus > 0 ? `+${healthBonus} HP ` : ''}${speedBonus > 0 ? `+${speedBonus} SPD ` : ''}(consumed)`.trim(),
                  appliedAt: Date.now()
                };
                
                const enhancedPiece = p as EnhancedGamePiece;
                const existingEffects = enhancedPiece.consumedEffects || [];
                
                return {
                  ...p,
                  originalStats: enhancedPiece.originalStats || {
                    attack: p.stats.attack,
                    health: p.stats.health,
                    speed: p.stats.speed,
                    maxHealth: p.stats.maxHealth
                  },
                  consumedEffects: [...existingEffects, consumedEffect],
                  stats: {
                    ...p.stats,
                    attack: p.stats.attack + attackBonus,
                    health: p.stats.health + healthBonus,
                    maxHealth: p.stats.maxHealth + healthBonus,
                    speed: p.stats.speed + speedBonus
                  }
                } as EnhancedGamePiece;
              }
            }
            return p;
          });
        }
      });
      
      // Remove consumables after applying effects
      battlePieces = battlePieces.filter(p => p.type !== 'consumable');
      
      // Update grid to remove consumables
      const newGrid = Array(6).fill(null).map(() => Array(8).fill(null));
      battlePieces.forEach(piece => {
        if (piece.position) {
          piece.shape.forEach(offset => {
            const x = piece.position!.x + offset.x;
            const y = piece.position!.y + offset.y;
            if (x >= 0 && x < 8 && y >= 0 && y < 6) {
              newGrid[y][x] = piece.id;
            }
          });
        }
      });

      return {
        ...prev,
        phase: 'battle' as const,
        playerTank: {
          ...prev.playerTank,
          pieces: battlePieces,
          grid: newGrid
        },
        opponentTank: {
          ...prev.opponentTank,
          pieces: opponentResult.pieces,
          waterQuality: opponentResult.waterQuality
        },
        opponentGold: opponentResult.remainingGold
      };
    });
  }, []);

  const completeBattle = useCallback((result: 'player' | 'opponent' | 'draw') => {
    setGameState(prev => {
      // Check if this is the final round (15)
      const isFinalRound = prev.round >= 15;
      
      const isDraw = result === 'draw';
      const playerWon = result === 'player';
      
      // Calculate loss streak bonuses
      const playerLossStreak = (playerWon || isDraw) ? 0 : prev.lossStreak + 1;
      const opponentLossStreak = (!playerWon && !isDraw) ? prev.opponentLossStreak + 1 : 0;
      
      // Update win/loss records
      const newWins = playerWon ? prev.wins + 1 : prev.wins;
      const newLosses = (playerWon || isDraw) ? prev.losses : prev.losses + 1;
      const newOpponentWins = (!playerWon && !isDraw) ? prev.opponentWins + 1 : prev.opponentWins;
      const newOpponentLosses = (playerWon && !isDraw) ? prev.opponentLosses + 1 : prev.opponentLosses;
      
      // Base rewards - draws give both players moderate gold
      let goldReward, opponentGoldReward;
      if (isDraw) {
        goldReward = 4 + Math.floor(prev.round / 2); // Draw reward
        opponentGoldReward = 4 + Math.floor(prev.round / 2); // Same for opponent
      } else if (playerWon) {
        goldReward = 5 + prev.round;
        opponentGoldReward = 3;
      } else {
        goldReward = 3;
        opponentGoldReward = 5 + prev.round;
      }
      
      // Loss streak bonuses (exponential catch-up)
      let lossStreakBonus = 0;
      if (!playerWon && !isDraw && prev.lossStreak >= 1) {
        lossStreakBonus = Math.min(playerLossStreak * 2, 10); // Max 10 bonus gold
        goldReward += lossStreakBonus;
      }
      
      if (!isDraw && prev.opponentLossStreak >= 1) {
        const lossBonus = Math.min(opponentLossStreak * 2, 10);
        opponentGoldReward += lossBonus;
      }
      
      // Calculate interest for next round
      const currentGoldAfterReward = prev.gold + goldReward;
      const interestAmount = calculateInterest(currentGoldAfterReward);
      const totalGoldGain = goldReward + interestAmount;
      
      // Create transactions
      const transactions: GoldTransaction[] = [];
      
      // Battle reward transaction
      const battleRewardDesc = isDraw ? 'Draw reward' : playerWon ? 'Victory reward' : 'Defeat consolation';
      transactions.push(addGoldTransaction(
        'battle_reward',
        goldReward,
        battleRewardDesc,
        prev.round
      ));
      
      // Loss streak bonus transaction
      if (lossStreakBonus > 0) {
        transactions.push(addGoldTransaction(
          'loss_streak_bonus',
          lossStreakBonus,
          `Loss streak bonus (${playerLossStreak} losses)`,
          prev.round
        ));
      }
      
      // Interest transaction
      if (interestAmount > 0) {
        transactions.push(addGoldTransaction(
          'interest',
          interestAmount,
          `Interest on ${currentGoldAfterReward}g (${Math.floor(currentGoldAfterReward / 10)} × 1g)`,
          prev.round
        ));
      }
      
      // Round start transaction for next round
      const nextRound = isFinalRound ? 1 : prev.round + 1;
      transactions.push(addGoldTransaction(
        'round_start',
        0,
        `Round ${nextRound} begins`,
        nextRound
      ));
      
      // If this was the final round, we need to handle game completion
      if (isFinalRound) {
        // Complete reset after round 15 - start fresh campaign
        return {
          ...INITIAL_STATE,
          round: 1,
          gold: 10,
          wins: 0,
          losses: 0,
          opponentWins: 0,
          opponentLosses: 0,
          lossStreak: 0,
          opponentLossStreak: 0,
          playerTank: {
            id: 'player',
            pieces: [],
            waterQuality: 5,
            temperature: 25,
            grid: Array(6).fill(null).map(() => Array(8).fill(null))
          },
          opponentTank: {
            id: 'opponent',
            pieces: [],
            waterQuality: 5,
            temperature: 25,
            grid: Array(6).fill(null).map(() => Array(8).fill(null))
          },
          shop: getRandomShop(),
          opponentShop: getRandomShop(),
          battleEvents: [],
          selectedPiece: null,
          lockedShopIndex: null,
          rerollsThisRound: 0,
          goldHistory: [
            {
              id: 'campaign-complete',
              round: 1,
              type: 'round_start',
              amount: 10,
              description: 'New campaign started - Starting gold',
              timestamp: Date.now()
            }
          ]
        };
      }
      
      return {
        ...prev,
        phase: 'shop' as const,
        round: prev.round + 1,
        gold: currentGoldAfterReward + interestAmount,
        lossStreak: playerLossStreak,
        opponentLossStreak: opponentLossStreak,
        wins: newWins,
        losses: newLosses,
        opponentWins: newOpponentWins,
        opponentLosses: newOpponentLosses,
        opponentGold: prev.opponentGold + opponentGoldReward,
        rerollsThisRound: 0, // Reset reroll count for new round
        shop: (() => {
          // Generate new shop but preserve locked item
          const newShop = getRandomShop(5);
          if (prev.lockedShopIndex !== null && prev.shop[prev.lockedShopIndex]) {
            newShop[prev.lockedShopIndex] = prev.shop[prev.lockedShopIndex];
          }
          return newShop;
        })(),
        opponentShop: getRandomShop(5),
        battleEvents: [],
        goldHistory: [...prev.goldHistory, ...transactions]
      };
    });
  }, []);

  const selectPiece = useCallback((piece: GamePiece) => {
    setGameState(prev => ({
      ...prev,
      selectedPiece: prev.selectedPiece?.id === piece.id ? null : piece,
      phase: prev.selectedPiece?.id === piece.id ? 'shop' as const : prev.phase
    }));
  }, []);

  const cancelPlacement = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      selectedPiece: null,
      phase: 'shop' as const,
      // Refund the gold since we're canceling the purchase
      gold: prev.selectedPiece && !prev.selectedPiece.position ? prev.gold + prev.selectedPiece.cost : prev.gold,
      // Put the piece back in the shop if it was a new purchase
      shop: prev.selectedPiece && !prev.selectedPiece.position 
        ? (() => {
            const shopCopy = [...prev.shop];
            const firstEmptyIndex = shopCopy.findIndex(piece => piece === null);
            if (firstEmptyIndex !== -1) {
              shopCopy[firstEmptyIndex] = prev.selectedPiece;
            }
            return shopCopy;
          })()
        : prev.shop
    }));
  }, []);

  const sellPiece = useCallback((pieceToSell: GamePiece) => {
    setGameState(prev => {
      const sellValue = Math.floor(pieceToSell.cost * 0.75);
      
      // Remove piece from tank
      const newPieces = prev.playerTank.pieces.filter(p => p.id !== pieceToSell.id);
      
      // Clear piece from grid
      const newGrid = prev.playerTank.grid.map(row => [...row]);
      if (pieceToSell.position) {
        pieceToSell.shape.forEach(offset => {
          const x = pieceToSell.position!.x + offset.x;
          const y = pieceToSell.position!.y + offset.y;
          if (x >= 0 && x < 8 && y >= 0 && y < 6) {
            newGrid[y][x] = null;
          }
        });
      }
      
      // Recalculate water quality
      let waterQuality = 5;
      const plantsAndFilters = newPieces.filter(p => 
        p.tags.includes('plant') || p.tags.includes('filtration')
      ).length;
      waterQuality += plantsAndFilters;
      
      const fishCount = newPieces.filter(p => p.type === 'fish').length;
      if (fishCount > 4) waterQuality -= (fishCount - 4);
      
      waterQuality = Math.max(0, Math.min(10, waterQuality));
      
      // Add sell transaction
      const transaction = addGoldTransaction(
        'sell',
        sellValue,
        `Sold ${pieceToSell.name} for ${sellValue}g (was ${pieceToSell.cost}g)`,
        prev.round,
        pieceToSell.id,
        pieceToSell.name
      );
      
      return {
        ...prev,
        gold: prev.gold + sellValue,
        playerTank: {
          ...prev.playerTank,
          pieces: newPieces,
          grid: newGrid,
          waterQuality
        },
        selectedPiece: prev.selectedPiece?.id === pieceToSell.id ? null : prev.selectedPiece,
        goldHistory: [...prev.goldHistory, transaction]
      };
    });
  }, []);

  const toggleShopLock = useCallback((index: number) => {
    setGameState(prev => ({
      ...prev,
      lockedShopIndex: prev.lockedShopIndex === index ? null : index
    }));
  }, []);

  const clearShopLock = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      lockedShopIndex: null
    }));
  }, []);

  return {
    gameState,
    purchasePiece,
    placePiece,
    movePiece,
    rerollShop,
    enterBattlePrep: startBattle,
    completeBattle,
    selectPiece,
    cancelPlacement,
    sellPiece,
    toggleShopLock,
    clearShopLock
  };
};