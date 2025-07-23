// Test file to debug consumable effects
import { GamePiece } from '../types/game';

// Mock pieces for testing
const mockBloodWorm: GamePiece = {
  id: 'blood-worm-test',
  name: 'Blood Worm',
  type: 'consumable',
  rarity: 'common',
  shape: [{ x: 0, y: 0 }],
  stats: { attack: 0, health: 1, speed: 0, maxHealth: 1 },
  tags: ['food', 'consumable'],
  cost: 3,
  abilities: ['+1 ATK & +2 HP to adjacent fish this battle'],
  attackBonus: 1,
  healthBonus: 2
};

const mockCardinalTetra: GamePiece = {
  id: 'cardinal-tetra-test',
  name: 'Cardinal Tetra',
  type: 'fish',
  rarity: 'uncommon',
  shape: [{ x: 0, y: 0 }],
  stats: { attack: 3, health: 2, speed: 7, maxHealth: 2 },
  tags: ['freshwater', 'schooling', 'nano'],
  cost: 3,
  abilities: ['+2 ATK per adjacent Schooling fish'],
  position: { x: 1, y: 0 } // Fish at position 1,0
};

const mockBloodWormPlaced: GamePiece = {
  ...mockBloodWorm,
  position: { x: 0, y: 0 } // Consumable at position 0,0 (adjacent to fish)
};

// Test the consumable effect application
export const testConsumableEffects = () => {
  console.log('=== TESTING CONSUMABLE EFFECTS ===');
  
  const pieces = [mockCardinalTetra, mockBloodWormPlaced];
  
  console.log('Before consumable effects:');
  console.log('Cardinal Tetra stats:', mockCardinalTetra.stats);
  console.log('Blood Worm bonuses:', { 
    attackBonus: mockBloodWorm.attackBonus, 
    healthBonus: mockBloodWorm.healthBonus 
  });
  
  // Apply consumable effects (copy of the logic from useGame.ts)
  let battlePieces = [...pieces];
  const consumables = battlePieces.filter(p => p.type === 'consumable');
  
  console.log('Found consumables:', consumables.length);
  
  consumables.forEach(consumable => {
    if (consumable.position) {
      console.log(`Processing consumable: ${consumable.name} at position ${consumable.position.x},${consumable.position.y}`);
      
      // Get adjacent positions
      const adjacentPositions: any[] = [];
      const checkedPositions = new Set<string>();
      
      consumable.shape.forEach(shapeOffset => {
        const consumableX = consumable.position!.x + shapeOffset.x;
        const consumableY = consumable.position!.y + shapeOffset.y;
        
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
      
      console.log('Adjacent positions:', adjacentPositions);
      
      battlePieces = battlePieces.map(p => {
        if (p.type === 'fish' && p.position) {
          const isAdjacent = p.shape.some(fishOffset => {
            const fishX = p.position!.x + fishOffset.x;
            const fishY = p.position!.y + fishOffset.y;
            return adjacentPositions.some(adj => adj.x === fishX && adj.y === fishY);
          });
          
          if (isAdjacent) {
            console.log(`Fish ${p.name} is adjacent to consumable ${consumable.name}`);
            
            const attackBonus = consumable.attackBonus || 1;
            const healthBonus = consumable.healthBonus || 1;
            const speedBonus = consumable.speedBonus || 0;
            
            console.log(`Applying bonuses: +${attackBonus} ATK, +${healthBonus} HP, +${speedBonus} SPD`);
            
            return {
              ...p,
              stats: {
                ...p.stats,
                attack: p.stats.attack + attackBonus,
                health: p.stats.health + healthBonus,
                maxHealth: p.stats.maxHealth + healthBonus,
                speed: p.stats.speed + speedBonus
              }
            };
          }
        }
        return p;
      });
    }
  });
  
  // Remove consumables
  battlePieces = battlePieces.filter(p => p.type !== 'consumable');
  
  console.log('After consumable effects:');
  const enhancedFish = battlePieces.find(p => p.type === 'fish');
  if (enhancedFish) {
    console.log('Enhanced Cardinal Tetra stats:', enhancedFish.stats);
    console.log('Expected: ATK 4 (3+1), HP 4 (2+2), SPD 7 (7+0)');
    console.log('Actual matches expected:', 
      enhancedFish.stats.attack === 4 && 
      enhancedFish.stats.health === 4 && 
      enhancedFish.stats.speed === 7
    );
  }
  
  return battlePieces;
};

// Run the test
if (typeof window !== 'undefined') {
  (window as any).testConsumableEffects = testConsumableEffects;
  console.log('Test function available as window.testConsumableEffects()');
}