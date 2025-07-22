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
  opponentShop: getRandomShop()
};

// AI opponent logic
const simulateOpponentTurn = (opponentGold: number, round: number, currentPieces: GamePiece[]) => {
  const shop = getRandomShop();
  let gold = opponentGold;
  const newPieces: GamePiece[] = [...currentPieces];
  
  // AI strategy based on round
  const maxPieces = Math.min(6, 2 + round); // Start with 2, add 1 per round, max 6
  const targetSpending = Math.min(gold, round * 3 + 5); // Spend more as rounds progress
  
  // Filter affordable pieces from shop
  const affordablePieces = shop.filter(piece => piece && piece.cost <= gold);
  
  // AI preferences (weighted by round)
  const getAIPriority = (piece: GamePiece) => {
    let priority = 0;
    
    // Early game: prefer cheap, efficient pieces
    if (round <= 3) {
      priority += (10 - piece.cost); // Prefer cheaper pieces
      priority += piece.stats.attack + piece.stats.health; // Basic stats
    }
    // Mid game: prefer synergies and utility
    else if (round <= 6) {
      priority += piece.stats.attack * 2 + piece.stats.health; // Favor attack
      if (piece.tags.includes('schooling')) priority += 5;
      if (piece.type === 'plant' || piece.type === 'equipment') priority += 3;
    }
    // Late game: prefer high-value pieces
    else {
      priority += piece.stats.attack * 3 + piece.stats.health * 2;
      if (piece.rarity === 'rare' || piece.rarity === 'epic') priority += 8;
    }
    
    return priority;
  };
  
  // Sort by AI priority
  affordablePieces.sort((a, b) => getAIPriority(b!) - getAIPriority(a!));
  
  // Buy pieces until we hit our limits
  for (const piece of affordablePieces) {
    if (!piece || newPieces.length >= maxPieces || gold < piece.cost) continue;
    
    // Add piece with random position
    const availablePositions: Position[] = [];
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 8; x++) {
        // Check if piece can fit at this position
        const canPlace = piece.shape.every(offset => {
          const newX = x + offset.x;
          const newY = y + offset.y;
          return newX >= 0 && newX < 8 && newY >= 0 && newY < 6;
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
      
      return {
        ...prev,
        gold: prev.gold - piece.cost,
        shop: newShop,
        selectedPiece: piece,
        phase: 'placement' as const
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

      // Add piece to tank (including consumables)
      const newPiece = { ...piece, position };
      const newPieces = [...prev.playerTank.pieces, newPiece];
      
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
        phase: 'shop' as const
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
      
      return {
        ...prev,
        gold: prev.gold - rerollCost,
        shop: getRandomShop(5)
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

  const completeBattle = useCallback((playerWon: boolean) => {
    setGameState(prev => {
      // Calculate loss streak bonuses
      const playerLossStreak = playerWon ? 0 : prev.lossStreak + 1;
      const opponentLossStreak = playerWon ? prev.opponentLossStreak + 1 : 0;
      
      // Update win/loss records
      const newWins = playerWon ? prev.wins + 1 : prev.wins;
      const newLosses = playerWon ? prev.losses : prev.losses + 1;
      const newOpponentWins = playerWon ? prev.opponentWins : prev.opponentWins + 1;
      const newOpponentLosses = playerWon ? prev.opponentLosses + 1 : prev.opponentLosses;
      
      // Base rewards
      let goldReward = playerWon ? 5 + prev.round : 3;
      let opponentGoldReward = playerWon ? 3 : 5 + prev.round;
      
      // Loss streak bonuses (exponential catch-up)
      if (!playerWon && playerLossStreak >= 2) {
        const lossBonus = Math.min(playerLossStreak * 2, 10); // Max 10 bonus gold
        goldReward += lossBonus;
      }
      
      if (playerWon && opponentLossStreak >= 2) {
        const lossBonus = Math.min(opponentLossStreak * 2, 10);
        opponentGoldReward += lossBonus;
      }
      
      return {
        ...prev,
        phase: 'shop' as const,
        round: prev.round + 1,
        gold: prev.gold + goldReward,
        lossStreak: playerLossStreak,
        opponentLossStreak: opponentLossStreak,
        wins: newWins,
        losses: newLosses,
        opponentWins: newOpponentWins,
        opponentLosses: newOpponentLosses,
        opponentGold: prev.opponentGold + opponentGoldReward,
        shop: getRandomShop(5),
        opponentShop: getRandomShop(5),
        battleEvents: []
      };
    });
  }, []);

  const selectPiece = useCallback((piece: GamePiece) => {
    setGameState(prev => ({
      ...prev,
      selectedPiece: prev.selectedPiece?.id === piece.id ? null : piece
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
    selectPiece
  };
};