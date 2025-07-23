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
  lockedShopIndex: null
};

// Helper function for applying bonuses to pieces
const applyBonusesToPieces = (pieces: any[], allPieces: any[]) => {
  const GRID_WIDTH = 8;
  const GRID_HEIGHT = 6;
  
  // Create grid with piece occupancy
  const grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
  allPieces.forEach(piece => {
    if (piece.position) {
      piece.shape.forEach((offset: any) => {
        const x = piece.position.x + offset.x;
        const y = piece.position.y + offset.y;
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
    
    // Get all adjacent positions for ALL tiles this piece occupies
    const adjacentPositions: any[] = [];
    const checkedPositions = new Set<string>();
    
    piece.shape.forEach((shapeOffset: any) => {
      const pieceX = piece.position.x + shapeOffset.x;
      const pieceY = piece.position.y + shapeOffset.y;
      
      // Check all 4 directions from each tile of this piece
      const directions = [
        { x: pieceX - 1, y: pieceY },
        { x: pieceX + 1, y: pieceY },
        { x: pieceX, y: pieceY - 1 },
        { x: pieceX, y: pieceY + 1 }
      ];
      
      directions.forEach(pos => {
        const posKey = `${pos.x},${pos.y}`;
        if (!checkedPositions.has(posKey) && 
            pos.x >= 0 && pos.x < GRID_WIDTH && 
            pos.y >= 0 && pos.y < GRID_HEIGHT) {
          // Make sure this position isn't occupied by the same piece
          const isOwnTile = piece.shape.some((offset: any) => 
            piece.position.x + offset.x === pos.x && 
            piece.position.y + offset.y === pos.y
          );
          if (!isOwnTile) {
            adjacentPositions.push(pos);
            checkedPositions.add(posKey);
          }
        }
      });
    });
    
    adjacentPositions.forEach(pos => {
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
    });
    
    // Check for schooling bonuses
    if (piece.tags.includes('schooling')) {
      const schoolingCount = adjacentPositions.filter(pos => {
        const adjacentPiece = grid[pos.y][pos.x];
        return adjacentPiece && adjacentPiece.tags.includes('schooling') && adjacentPiece.id !== piece.id;
      }).length;
      
      if (schoolingCount > 0) {
        bonusAttack += schoolingCount;
        bonusSpeed += Math.floor(schoolingCount / 2);
      }
    }
    
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
  
  return {
    pieces: newPieces,
    remainingGold: gold,
    waterQuality
  };
};

export const useGame = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);

  const purchasePiece = useCallback((piece: GamePiece) => {
    setGameState(prev => {
      if (prev.gold < piece.cost) return prev;
      
      // Remove the purchased piece from shop
      const newShop = prev.shop.map(shopPiece => 
        shopPiece?.id === piece.id ? null : shopPiece
      );
      
      // Clear lock if we purchased the locked item
      const newLockedIndex = prev.lockedShopIndex !== null && prev.shop[prev.lockedShopIndex]?.id === piece.id 
        ? null 
        : prev.lockedShopIndex;
      
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
        phase: 'shop' as const
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
      
      if (existingPieceIndex >= 0) {
        // Update existing piece position (from inventory)
        newPieces = prev.playerTank.pieces.map((p, index) => 
          index === existingPieceIndex ? { ...p, position } : p
        );
      } else {
        // Add new piece to tank (from shop)
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
        // If this was a drag-and-drop purchase, remove from shop
        shop: existingPieceIndex < 0 ? prev.shop.map(shopPiece => 
          shopPiece?.id === piece.id ? null : shopPiece
        ) : prev.shop,
        // Deduct gold if this was a new purchase
        gold: existingPieceIndex < 0 ? prev.gold - piece.cost : prev.gold
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
    const rerollCost = 2;
    setGameState(prev => {
      if (prev.gold < rerollCost) return prev;
      
      // Generate new shop but preserve locked item
      const newShop = getRandomShop(5);
      if (prev.lockedShopIndex !== null && prev.shop[prev.lockedShopIndex]) {
        newShop[prev.lockedShopIndex] = prev.shop[prev.lockedShopIndex];
      }
      
      return {
        ...prev,
        gold: prev.gold - rerollCost,
        shop: newShop
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
      
      // Apply each consumable's effect
      consumables.forEach(consumable => {
        if (consumable.position) {
          const adjacentPositions = [
            { x: consumable.position.x - 1, y: consumable.position.y },
            { x: consumable.position.x + 1, y: consumable.position.y },
            { x: consumable.position.x, y: consumable.position.y - 1 },
            { x: consumable.position.x, y: consumable.position.y + 1 }
          ];
          
          battlePieces = battlePieces.map(p => {
            if (p.type === 'fish' && p.position && adjacentPositions.some(adj => 
              adj.x === p.position!.x && adj.y === p.position!.y
            )) {
              return {
                ...p,
                stats: {
                  ...p.stats,
                  attack: p.stats.attack + 1,
                  health: p.stats.health + 1,
                  maxHealth: p.stats.maxHealth + 1
                }
              };
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
      if (!playerWon && !isDraw && prev.lossStreak >= 1) {
        const lossBonus = Math.min(playerLossStreak * 2, 10); // Max 10 bonus gold
        goldReward += lossBonus;
      }
      
      if (!isDraw && prev.opponentLossStreak >= 1) {
        const lossBonus = Math.min(opponentLossStreak * 2, 10);
        opponentGoldReward += lossBonus;
      }
      
      // If this was the final round, we need to handle game completion
      if (isFinalRound) {
        // For now, we'll continue the game but this is where we'd handle
        // game completion, stats tracking, new opponent, etc.
        // TODO: Add game completion logic here
      }
      
      return {
        ...prev,
        phase: 'shop' as const,
        round: isFinalRound ? 1 : prev.round + 1, // Reset to round 1 after 15 rounds for now
        gold: prev.gold + goldReward,
        lossStreak: playerLossStreak,
        opponentLossStreak: opponentLossStreak,
        wins: newWins,
        losses: newLosses,
        opponentWins: newOpponentWins,
        opponentLosses: newOpponentLosses,
        opponentGold: prev.opponentGold + opponentGoldReward,
        shop: (() => {
          // Generate new shop but preserve locked item
          const newShop = getRandomShop(5);
          if (prev.lockedShopIndex !== null && prev.shop[prev.lockedShopIndex]) {
            newShop[prev.lockedShopIndex] = prev.shop[prev.lockedShopIndex];
          }
          return newShop;
        })(),
        opponentShop: getRandomShop(5),
        battleEvents: []
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
      
      return {
        ...prev,
        gold: prev.gold + sellValue,
        playerTank: {
          ...prev.playerTank,
          pieces: newPieces,
          grid: newGrid,
          waterQuality
        },
        selectedPiece: prev.selectedPiece?.id === pieceToSell.id ? null : prev.selectedPiece
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
    startBattle,
    completeBattle,
    selectPiece,
    cancelPlacement,
    sellPiece,
    toggleShopLock,
    clearShopLock
  };
};