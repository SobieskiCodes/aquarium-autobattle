import { GamePiece } from '../types/game';

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
    piece: GamePiece;
    originalStats: { attack: number; health: number; speed: number };
    bonuses: { attack: number; health: number; speed: number };
    activeBonuses: Array<{ source: string; effect: string; color: string }>;
  }>;
}

const GRID_WIDTH = 8;
const GRID_HEIGHT = 6;

// Helper function for applying bonuses to pieces
export const applyBonusesToPieces = (pieces: GamePiece[], allPieces: GamePiece[]): GamePiece[] => {
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
        // Java Fern bonus
        if (adjacentPiece.id.includes('java-fern')) {
          bonusAttack += 1;
          bonusHealth += 1;
        }
        // Anubias bonus
        if (adjacentPiece.id.includes('anubias')) {
          bonusHealth += 1;
        }
        // Consumable bonus (if piece is fish) - each adjacent consumable gives +1/+1
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
    return {
      ...piece,
      stats: {
        attack: piece.stats.attack + bonusAttack,
        health: piece.stats.health + bonusHealth,
        maxHealth: piece.stats.maxHealth + bonusHealth,
        speed: piece.stats.speed + bonusSpeed
      }
    };
  });
};

// Calculate bonuses for a specific piece (used for tooltips)
export const calculatePieceBonuses = (piece: GamePiece, allPieces: GamePiece[]) => {
  if (!piece.position) return [];
  
  const bonuses: Array<{ source: string; effect: string; color: string }> = [];
  
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
      // Java Fern bonus
      if (adjacentPiece.id.includes('java-fern')) {
        bonuses.push({ source: 'Java Fern', effect: '+1 ATK +1 HP', color: 'text-green-600' });
      }
      // Anubias bonus
      if (adjacentPiece.id.includes('anubias')) {
        bonuses.push({ source: 'Anubias', effect: '+1 HP', color: 'text-green-500' });
      }
      // Consumable bonus (if piece is fish) - show each adjacent consumable
      if (adjacentPiece.type === 'consumable' && piece.type === 'fish') {
        bonuses.push({ source: adjacentPiece.name, effect: '+1 ATK +1 HP (battle)', color: 'text-orange-500' });
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
        bonuses.push({ source: 'Schooling', effect: `+${schoolingCount} ATK`, color: 'text-blue-500' });
        if (schoolingCount >= 3) {
          bonuses.push({ source: 'Large School', effect: 'Double Speed', color: 'text-cyan-500' });
        }
      } else if (piece.id.includes('cardinal-tetra')) {
        bonuses.push({ source: 'Schooling', effect: `+${schoolingCount * 2} ATK`, color: 'text-blue-600' });
      }
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
  const fishPieces = pieces.filter(piece => piece.type === 'fish');
  const allRelevantPieces = pieces.filter(piece => 
    piece.type === 'fish' || piece.type === 'plant' || piece.type === 'equipment'
  );
  
  // Apply bonuses
  const enhancedFish = applyBonusesToPieces(fishPieces, pieces);
  const enhancedAll = applyBonusesToPieces(allRelevantPieces, pieces);
  
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
    const bonuses = {
      attack: enhancedPiece.stats.attack - originalPiece.stats.attack,
      health: enhancedPiece.stats.health - originalPiece.stats.health,
      speed: enhancedPiece.stats.speed - originalPiece.stats.speed
    };
    
    return {
      piece: enhancedPiece,
      originalStats: {
        attack: originalPiece.stats.attack,
        health: originalPiece.stats.health,
        speed: originalPiece.stats.speed
      },
      bonuses,
      activeBonuses: calculatePieceBonuses(originalPiece, pieces)
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