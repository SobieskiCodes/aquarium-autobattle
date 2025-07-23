import { GamePiece } from '../types/game';

export const PIECE_LIBRARY: GamePiece[] = [
  // Nano Fish
  {
    id: 'neon-tetra',
    name: 'Neon Tetra',
    type: 'fish',
    rarity: 'common',
    shape: [{ x: 0, y: 0 }],
    stats: { attack: 2, health: 3, speed: 6, maxHealth: 3 },
    tags: ['freshwater', 'schooling', 'nano'],
    cost: 2,
    abilities: ['+1 ATK per adjacent Schooling fish', 'Double speed if 3+ adjacent']
  },
  {
    id: 'cardinal-tetra',
    name: 'Cardinal Tetra',
    type: 'fish',
    rarity: 'uncommon',
    shape: [{ x: 0, y: 0 }],
    stats: { attack: 3, health: 2, speed: 7, maxHealth: 2 },
    tags: ['freshwater', 'schooling', 'nano'],
    cost: 3,
    abilities: ['+2 ATK per adjacent Schooling fish']
  },

  // Showpiece Fish
  {
    id: 'betta',
    name: 'Siamese Betta',
    type: 'fish',
    rarity: 'uncommon',
    shape: [{ x: 0, y: 0 }, { x: 0, y: 1 }],
    stats: { attack: 5, health: 4, speed: 4, maxHealth: 4 },
    tags: ['freshwater', 'aggressive', 'labyrinth'],
    cost: 4,
    abilities: ['First strike', '+2 ATK if alone in row']
  },
  {
    id: 'angelfish',
    name: 'Angelfish',
    type: 'fish',
    rarity: 'rare',
    shape: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }],
    stats: { attack: 4, health: 6, speed: 3, maxHealth: 6 },
    tags: ['freshwater', 'territorial', 'showpiece'],
    cost: 6,
    abilities: ['+3 ATK if no orthogonal neighbors']
  },

  // Predators
  {
    id: 'pike-cichlid',
    name: 'Pike Cichlid',
    type: 'fish',
    rarity: 'rare',
    shape: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    stats: { attack: 7, health: 5, speed: 5, maxHealth: 5 },
    tags: ['freshwater', 'carnivore', 'predator'],
    cost: 8,
    abilities: ['Heals 2 HP when KOing smaller fish']
  },

  // Bottom Dwellers
  {
    id: 'bristlenose-pleco',
    name: 'Bristlenose Pleco',
    type: 'fish',
    rarity: 'uncommon',
    shape: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    stats: { attack: 1, health: 7, speed: 2, maxHealth: 7 },
    tags: ['freshwater', 'cleaner', 'nocturnal'],
    cost: 4,
    abilities: ['End of round: remove adjacent algae', '+2 ATK at night']
  },

  // Plants
  {
    id: 'java-fern',
    name: 'Java Fern',
    type: 'plant',
    rarity: 'common',
    shape: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
    stats: { attack: 0, health: 8, speed: 0, maxHealth: 8 },
    tags: ['plant', 'freshwater'],
    cost: 3,
    abilities: ['Adjacent fish +1 ATK and +1 HP']
  },
  {
    id: 'anubias',
    name: 'Anubias',
    type: 'plant',
    rarity: 'uncommon',
    shape: [{ x: 0, y: 0 }, { x: 0, y: 1 }],
    stats: { attack: 0, health: 6, speed: 0, maxHealth: 6 },
    tags: ['plant', 'freshwater'],
    cost: 4,
    abilities: ['Adjacent fish +1 HP (stacks)']
  },

  // Equipment
  {
    id: 'sponge-filter',
    name: 'Sponge Filter',
    type: 'equipment',
    rarity: 'common',
    shape: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    stats: { attack: 0, health: 5, speed: 0, maxHealth: 5 },
    tags: ['filtration', 'equipment'],
    cost: 5,
    abilities: ['Global: Water Quality +2', 'Amplifies adjacent plant effects']
  },
  {
    id: 'heater',
    name: 'Aquarium Heater',
    type: 'equipment',
    rarity: 'uncommon',
    shape: [{ x: 0, y: 0 }],
    stats: { attack: 0, health: 3, speed: 0, maxHealth: 3 },
    tags: ['equipment', 'heater'],
    cost: 4,
    abilities: ['2x2 aura: tropical fish gain +1 Speed']
  },

  // Consumables
  {
    id: 'brine-shrimp',
    name: 'Brine Shrimp',
    type: 'consumable',
    rarity: 'common',
    shape: [{ x: 0, y: 0 }],
    stats: { attack: 0, health: 1, speed: 0, maxHealth: 1 },
    tags: ['food', 'consumable'],
    cost: 2,
    abilities: ['+1 ATK & +1 HP to adjacent fish this battle']
  }
];

export function getRandomShop(count: number = 5): (GamePiece | null)[] {
  const shop: (GamePiece | null)[] = [];
  
  for (let i = 0; i < count; i++) {
    // Allow complete duplicates - this is how autobattlers work
    const randomIndex = Math.floor(Math.random() * PIECE_LIBRARY.length);
    const randomPiece = PIECE_LIBRARY[randomIndex];
    
    shop.push({
      ...randomPiece,
      // Give each shop instance a unique ID even if it's the same piece type
      id: `${randomPiece.id}-${Math.random().toString(36).substr(2, 9)}`
    });
  }
  
  return shop;
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return '#94A3B8';
    case 'uncommon': return '#22C55E';
    case 'rare': return '#3B82F6';
    case 'epic': return '#8B5CF6';
    case 'legendary': return '#F59E0B';
    default: return '#94A3B8';
  }
}

export function getRarityWeight(rarity: string): number {
  switch (rarity) {
    case 'common': return 50;
    case 'uncommon': return 30;
    case 'rare': return 15;
    case 'epic': return 4;
    case 'legendary': return 1;
    default: return 50;
  }
}

export function getTypeColor(type: string): string {
  switch (type) {
    case 'fish': return '#0891B2';
    case 'plant': return '#22C55E';
    case 'equipment': return '#64748B';
    case 'consumable': return '#F97316';
    default: return '#64748B';
  }
}