import { GamePiece } from '../types/game';

export interface ConsumedEffect {
  consumableId: string;
  consumableName: string;
  effect: string;
  appliedAt: number; // timestamp
  attackBonus?: number;
  healthBonus?: number;
  speedBonus?: number;
}

export interface EnhancedGamePiece extends GamePiece {
  consumedEffects?: ConsumedEffect[];
  originalStats?: {
    attack: number;
    health: number;
    speed: number;
    maxHealth: number;
  };
}

export interface TankAnalysis {
  totalAttack: number;
  baseAttack: number;
  bonusAttack: number;
  totalHealth: number;
  baseHealth: number;
  bonusHealth: number;
  averageSpeed: number;
  baseAverageSpeed: number;
  bonusAverageSpeed: number;
  fishCount: number;
  totalPieces: number;
  enhancedPieces: GamePiece[];
  pieceBreakdown: Array<{
    piece: EnhancedGamePiece;
    originalStats: { attack: number; health: number; speed: number };
    bonuses: { attack: number; health: number; speed: number };
    activeBonuses: Array<{ source: string; effect: string; color: string; type: 'adjacency' | 'consumable' | 'ability' }>;
    consumedItems: ConsumedEffect[];
  }>;
}

const GRID_WIDTH = 8;
const GRID_HEIGHT = 6;

// Helper function for applying bonuses to pieces
export const applyBonusesToPieces = (pieces: GamePiece[], allPieces: GamePiece[]): EnhancedGamePiece[] => {
  // Create grid with piece occupancy
  const grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
  allPieces.forEach(piece => {
    if (piece.position) {
      piece.shape.forEach((offset: any) => {
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
    
    // Store original stats if not already stored
    const originalStats = (piece as EnhancedGamePiece).originalStats || {
      attack: piece.stats.attack,
      health: piece.stats.health,
      speed: piece.stats.speed,
      maxHealth: piece.stats.maxHealth
    };
    
    let bonusAttack = 0;
    let bonusHealth = 0;
    let bonusSpeed = 0;
    
    // Get all adjacent positions for ALL tiles this piece occupies
    const adjacentPositions: any[] = [];
    const checkedPositions = new Set<string>();
    
    piece.shape.forEach((shapeOffset: any) => {
      const pieceX = piece.position!.x + shapeOffset.x;
      const pieceY = piece.position!.y + shapeOffset.y;
      
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
            piece.position!.x + offset.x === pos.x && 
            piece.position!.y + offset.y === pos.y
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
        // Check for sponge filter amplification first
        const hasSpongeFilter = allPieces.some(p => 
          p.id.includes('sponge-filter') && p.position &&
          // Check if sponge filter is adjacent to the plant providing the bonus
          p.shape.some(filterOffset => {
            const filterX = p.position!.x + filterOffset.x;
            const filterY = p.position!.y + filterOffset.y;
            return adjacentPiece.shape.some(plantOffset => {
              const plantX = adjacentPiece.position!.x + plantOffset.x;
              const plantY = adjacentPiece.position!.y + plantOffset.y;
              const dx = Math.abs(filterX - plantX);
              const dy = Math.abs(filterY - plantY);
              return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
            });
          })
        );
        
        // Java Fern bonus
        if (adjacentPiece.id.includes('java-fern')) {
          const bonus = hasSpongeFilter ? 2 : 1; // Amplified by sponge filter
          bonusAttack += bonus;
          bonusHealth += bonus;
        }
        // Anubias bonus
        if (adjacentPiece.id.includes('anubias')) {
          const bonus = hasSpongeFilter ? 2 : 1; // Amplified by sponge filter
          bonusHealth += bonus;
        }
      }
    });
    
    // Apply consumable bonuses (stacking) - do this after other bonuses
    adjacentPositions.forEach(pos => {
      const adjacentPiece = grid[pos.y][pos.x];
      if (adjacentPiece && adjacentPiece.id !== piece.id && adjacentPiece.type === 'consumable' && piece.type === 'fish') {
        const attackBonus = adjacentPiece.attackBonus || 0;
        const healthBonus = adjacentPiece.healthBonus || 0;
        const speedBonus = adjacentPiece.speedBonus || 0;
        
        bonusAttack += attackBonus;
        bonusHealth += healthBonus;
        bonusSpeed += speedBonus;
      }
    });
    
    // Check for schooling bonuses
    if (piece.tags.includes('schooling')) {
      const schoolingCount = adjacentPositions.filter(pos => {
        const adjacentPiece = grid[pos.y][pos.x];
        return adjacentPiece && adjacentPiece.tags.includes('schooling') && adjacentPiece.id !== piece.id;
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
    
    // Create a deep copy of the piece to avoid mutating the original
    const enhancedPiece: EnhancedGamePiece = {
      ...piece,
      originalStats,
      consumedEffects: (piece as EnhancedGamePiece).consumedEffects || [],
      stats: {
        attack: piece.stats.attack + bonusAttack,
        health: piece.stats.health + bonusHealth,
        maxHealth: piece.stats.maxHealth + bonusHealth,
        speed: piece.stats.speed + bonusSpeed
      }
    };
    
    return enhancedPiece;
  });
};

// Calculate bonuses for a specific piece (used for tooltips)
export const calculatePieceBonuses = (piece: GamePiece, allPieces: GamePiece[]): Array<{ source: string; effect: string; color: string; type: 'adjacency' | 'consumable' | 'ability' }> => {
  if (!piece.position) return [];
  
  const bonuses: Array<{ source: string; effect: string; color: string; type: 'adjacency' | 'consumable' | 'ability' }> = [];
  
  // Create grid with piece occupancy
  const grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
  allPieces.forEach(p => {
    if (p.position) {
      p.shape.forEach((offset: any) => {
        const x = p.position!.x + offset.x;
        const y = p.position!.y + offset.y;
        if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
          grid[y][x] = p;
        }
      });
    }
  });
  
  // Get all adjacent positions for ALL tiles this piece occupies
  const adjacentPositions: any[] = [];
  const checkedPositions = new Set<string>();
  
  piece.shape.forEach((shapeOffset: any) => {
    const pieceX = piece.position!.x + shapeOffset.x;
    const pieceY = piece.position!.y + shapeOffset.y;
    
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
          piece.position!.x + offset.x === pos.x && 
          piece.position!.y + offset.y === pos.y
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
      // Check for sponge filter amplification
      const hasSpongeFilter = allPieces.some(p => 
        p.id.includes('sponge-filter') && p.position &&
        // Check if sponge filter is adjacent to the plant providing the bonus
        p.shape.some(filterOffset => {
          const filterX = p.position!.x + filterOffset.x;
          const filterY = p.position!.y + filterOffset.y;
          return adjacentPiece.shape.some(plantOffset => {
            const plantX = adjacentPiece.position!.x + plantOffset.x;
            const plantY = adjacentPiece.position!.y + plantOffset.y;
            const dx = Math.abs(filterX - plantX);
            const dy = Math.abs(filterY - plantY);
            return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
          });
        })
      );
      
      // Java Fern bonus
      if (adjacentPiece.id.includes('java-fern')) {
        const bonus = hasSpongeFilter ? 2 : 1;
        const amplified = hasSpongeFilter ? ' (amplified)' : '';
        bonuses.push({ source: 'Java Fern', effect: `+${bonus} ATK +${bonus} HP${amplified}`, color: 'text-green-600', type: 'adjacency' });
      }
      // Anubias bonus
      if (adjacentPiece.id.includes('anubias')) {
        const bonus = hasSpongeFilter ? 2 : 1;
        const amplified = hasSpongeFilter ? ' (amplified)' : '';
        bonuses.push({ source: 'Anubias', effect: `+${bonus} HP${amplified}`, color: 'text-green-500', type: 'adjacency' });
      }
      // Consumable bonus (if piece is fish) - show each adjacent consumable
      if (adjacentPiece.type === 'consumable' && piece.type === 'fish') {
        const attackBonus = adjacentPiece.attackBonus || 0;
        const healthBonus = adjacentPiece.healthBonus || 0;
        const speedBonus = adjacentPiece.speedBonus || 0;
        
        let effectText = '';
        if (attackBonus > 0) effectText += `+${attackBonus} ATK `;
        if (healthBonus > 0) effectText += `+${healthBonus} HP `;
        if (speedBonus > 0) effectText += `+${speedBonus} SPD `;
        
        bonuses.push({ source: adjacentPiece.name, effect: `${effectText.trim()} (preview)`, color: 'text-orange-500', type: 'consumable' });
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
      if (piece.id.includes('neon-tetra')) {
        bonuses.push({ source: 'Schooling', effect: `+${schoolingCount} ATK`, color: 'text-blue-500', type: 'ability' });
        if (schoolingCount >= 3) {
          bonuses.push({ source: 'Large School', effect: 'Double Speed', color: 'text-cyan-500', type: 'ability' });
        }
      } else if (piece.id.includes('cardinal-tetra')) {
        bonuses.push({ source: 'Schooling', effect: `+${schoolingCount * 2} ATK`, color: 'text-blue-600', type: 'ability' });
      }
    }
  }
  
  // Add consumed effects to bonuses (stack duplicates)
  const enhancedPiece = piece as EnhancedGamePiece;
  if (enhancedPiece.consumedEffects) {
    // Stack all consumed effects by type, not by individual consumable
    let totalConsumedAttack = 0;
    let totalConsumedHealth = 0;
    let totalConsumedSpeed = 0;
    const consumableNames = new Set<string>();
    
    enhancedPiece.consumedEffects.forEach(effect => {
      totalConsumedAttack += effect.attackBonus || 0;
      totalConsumedHealth += effect.healthBonus || 0;
      totalConsumedSpeed += effect.speedBonus || 0;
      consumableNames.add(effect.consumableName);
    });
    
    // Add single stacked bonus entry if any consumed effects exist
    if (totalConsumedAttack > 0 || totalConsumedHealth > 0 || totalConsumedSpeed > 0) {
      let effectParts: string[] = [];
      if (totalConsumedAttack > 0) effectParts.push(`+${totalConsumedAttack} ATK`);
      if (totalConsumedHealth > 0) effectParts.push(`+${totalConsumedHealth} HP`);
      if (totalConsumedSpeed > 0) effectParts.push(`+${totalConsumedSpeed} SPD`);
      
      const effectText = effectParts.join(' ');
      const consumableList = Array.from(consumableNames).join(', ');
      const displayEffect = `${effectText} (from ${consumableList})`;
      
      bonuses.push({ 
        source: 'Consumed Items', 
        effect: displayEffect, 
        color: 'text-orange-600', 
        type: 'consumable' 
      });
    }
  }
  
  return bonuses;
};

// Get pieces that are providing bonuses to a specific piece
export const getBonusProviders = (piece: GamePiece, allPieces: GamePiece[]): string[] => {
  if (!piece.position) return [];
  
  const providers: string[] = [];
  
  // Create grid with piece occupancy
  const grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
  allPieces.forEach(p => {
    if (p.position) {
      p.shape.forEach((offset: any) => {
        const x = p.position!.x + offset.x;
        const y = p.position!.y + offset.y;
        if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
          grid[y][x] = p;
        }
      });
    }
  });
  
  // Get all adjacent positions for ALL tiles this piece occupies
  const adjacentPositions: any[] = [];
  const checkedPositions = new Set<string>();
  
  piece.shape.forEach((shapeOffset: any) => {
    const pieceX = piece.position!.x + shapeOffset.x;
    const pieceY = piece.position!.y + shapeOffset.y;
    
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
          piece.position!.x + offset.x === pos.x && 
          piece.position!.y + offset.y === pos.y
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
      if (adjacentPiece.id.includes('java-fern') || 
          adjacentPiece.id.includes('anubias') || 
          adjacentPiece.type === 'consumable' ||
          (adjacentPiece.tags.includes('schooling') && piece.tags.includes('schooling'))) {
        providers.push(adjacentPiece.id);
      }
    }
  });
  
  return providers;
};

// Main analysis function
export const analyzeTank = (pieces: GamePiece[]): TankAnalysis => {
  // Only analyze pieces that are actually placed on the grid
  const placedPieces = pieces.filter(piece => piece.position);
  
  const fishPieces = placedPieces.filter(piece => piece.type === 'fish');
  const allRelevantPieces = pieces.filter(piece => 
    piece.type === 'fish' || piece.type === 'plant' || piece.type === 'equipment'
  ).filter(piece => piece.position);
  
  // Apply bonuses (including consumable preview effects)
  const enhancedFish = applyBonusesToPieces(fishPieces, placedPieces);
  const enhancedAll = applyBonusesToPieces(allRelevantPieces, placedPieces);
  
  // Calculate base stats
  const baseAttack = fishPieces.reduce((total, piece) => total + piece.stats.attack, 0);
  const baseHealth = allRelevantPieces.reduce((total, piece) => total + piece.stats.health, 0);
  const baseAverageSpeed = fishPieces.length > 0 
    ? Math.round(fishPieces.reduce((total, piece) => total + piece.stats.speed, 0) / fishPieces.length)
    : 0;
  
  // Calculate enhanced stats
  const totalAttack = enhancedFish.reduce((total, piece) => total + piece.stats.attack, 0);
  const totalHealth = enhancedAll.reduce((total, piece) => total + piece.stats.health, 0);
  const averageSpeed = enhancedFish.length > 0
    ? Math.round(enhancedFish.reduce((total, piece) => total + piece.stats.speed, 0) / enhancedFish.length)
    : 0;
  
  // Calculate bonuses
  const bonusAttack = totalAttack - baseAttack;
  const bonusHealth = totalHealth - baseHealth;
  const bonusAverageSpeed = averageSpeed - baseAverageSpeed;
  
  // Create detailed breakdown
  const pieceBreakdown = enhancedFish.map(enhancedPiece => {
    const originalPiece = fishPieces.find(p => p.id === enhancedPiece.id)!;
    const originalStats = enhancedPiece.originalStats || originalPiece.stats;
    const bonuses = {
      attack: enhancedPiece.stats.attack - originalStats.attack,
      health: enhancedPiece.stats.health - originalStats.health,
      speed: enhancedPiece.stats.speed - originalStats.speed
    };
    
    return {
      piece: enhancedPiece,
      originalStats: {
        attack: originalStats.attack,
        health: originalStats.health,
        speed: originalStats.speed
      },
      bonuses,
      activeBonuses: calculatePieceBonuses(originalPiece, pieces),
      consumedItems: enhancedPiece.consumedEffects || []
    };
  });
  
  return {
    totalAttack,
    baseAttack,
    bonusAttack,
    totalHealth,
    baseHealth,
    bonusHealth,
    averageSpeed,
    baseAverageSpeed,
    bonusAverageSpeed,
    fishCount: fishPieces.length,
    totalPieces: pieces.length,
    enhancedPieces: [...enhancedFish, ...enhancedAll.filter(p => p.type !== 'fish')],
    pieceBreakdown
  };
};