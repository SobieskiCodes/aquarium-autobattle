# Aquarium Autobattler

A strategic autobattler game where you build and manage aquarium ecosystems to battle against AI opponents.

## 🐠 Game Features

- **Strategic Placement**: Arrange fish, plants, and equipment on an 8x6 grid
- **Synergy System**: Pieces interact with adjacent pieces for bonuses
- **Water Quality**: Manage your tank's ecosystem for optimal performance
- **15-Round Campaigns**: Battle through 15 rounds against AI opponents
- **Shop & Economy**: Buy, sell, and reroll pieces with gold management
- **Drag & Drop**: Intuitive piece placement and movement

## 🎮 How to Play

1. **Shop Phase**: Purchase pieces from the shop using gold
2. **Placement**: Drag pieces onto your tank grid
3. **Battle**: Watch your setup fight against the AI opponent
4. **Progression**: Win battles to earn gold and advance through 15 rounds

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## 🏗️ Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Lucide React** for icons

## 🎯 Game Mechanics

### Piece Types
- **Fish**: Primary combat units with attack, health, and speed
- **Plants**: Provide bonuses to adjacent pieces
- **Equipment**: Utility pieces that enhance your tank
- **Consumables**: One-time use items consumed at battle start

### Synergies
- **Schooling**: Fish gain bonuses when adjacent to other schooling fish
- **Plants**: Provide stat bonuses to adjacent fish
- **Equipment**: Various utility effects and auras

### Battle System
- Turn-based combat with speed determining action order
- Battles continue until one side is eliminated
- No artificial turn limits - fight to the death!

## 🚀 Deployment

The game is deployed on Netlify: [Play Now](https://dazzling-arithmetic-7f9c1b.netlify.app)

## 📝 License

MIT License - feel free to fork and modify!