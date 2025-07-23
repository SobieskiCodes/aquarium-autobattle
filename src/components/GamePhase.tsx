import React from 'react';
import { GameState } from '../types/game';
import { Shop } from './Shop';
import { TankGrid } from './TankGrid';
import { BattleView } from './BattleView';
import { PieceCard } from './PieceCard';
import { Play, ArrowRight, Lock } from 'lucide-react';

interface GamePhaseProps {
  gameState: GameState;
  onPurchasePiece: (piece: any) => void;
  onPlacePiece: (piece: any, position: any) => void;
  onMovePiece: (piece: any, position: any) => void;
  onRerollShop: () => void;
  onStartBattle: () => void;
  onCompleteBattle: (result: 'player' | 'opponent' | 'draw') => void;
  onSelectPiece: (piece: any) => void;
  onCancelPlacement: () => void;
  onSellPiece: (piece: any) => void;
  onToggleShopLock: (index: number) => void;
  onClearShopLock: () => void;
}

export const GamePhase: React.FC<GamePhaseProps> = ({
  gameState,
  onPurchasePiece,
  onPlacePiece,
  onMovePiece,
  onRerollShop,
  onStartBattle,
  onCompleteBattle,
  onSelectPiece,
  onCancelPlacement,
  onSellPiece,
  onToggleShopLock,
  onClearShopLock
}) => {
  const [draggedPiece, setDraggedPiece] = React.useState<any>(null);
  const [hoveredCardPiece, setHoveredCardPiece] = React.useState<any>(null);

  const handleDragStart = (piece: any) => {
    setDraggedPiece(piece);
  };

  const handleDragEnd = () => {
    setDraggedPiece(null);
  };

  const handleDragPlace = (piece: any, position: any) => {
    if (piece.position) {
      // Moving existing piece
      onMovePiece(piece, position);
    } else if (gameState.gold >= piece.cost) {
      // If dragging from shop, purchase first then place
      onPurchasePiece(piece);
      // The piece will be placed automatically after purchase
      setTimeout(() => {
        onPlacePiece(piece, position);
      }, 0);
    } else {
      // Placing from inventory
      onPlacePiece(piece, position);
    }
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

  const renderShopPhase = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-500 to-blue-600 text-white p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Game Round {gameState.round}</h1>
            <div className="flex items-center gap-4">
              <p className="text-sm opacity-90">Shop & Build Phase</p>
              {gameState.lossStreak > 0 && (
                <div className="bg-red-500/20 px-2 py-1 rounded text-xs font-bold">
                  Loss Streak: {gameState.lossStreak} (+{Math.min(gameState.lossStreak * 2, 10)} bonus gold next loss)
                </div>
              )}
            </div>
          </div>
          
          {/* Shop Lock Status */}
          {gameState.lockedShopIndex !== null && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Lock size={16} />
                  <span className="text-sm font-medium">Shop slot {gameState.lockedShopIndex + 1} is locked</span>
                </div>
                <button
                  onClick={onClearShopLock}
                  className="text-xs text-yellow-700 hover:text-yellow-900 underline"
                >
                  Clear lock
                </button>
              </div>
            </div>
          )}
          <button
            onClick={onStartBattle}
            disabled={gameState.playerTank.pieces.length === 0}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
              ${gameState.playerTank.pieces.length > 0
                ? 'bg-white text-teal-600 hover:bg-gray-100 hover:shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <Play size={16} />
            Battle!
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Tank</h2>
          
          {/* Board Stats Summary */}
          {gameState.playerTank.pieces.length > 0 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200 relative group">
              <h3 className="font-bold text-gray-900 mb-2">Tank Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm relative">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 cursor-help flex items-center justify-center gap-1">
                    {(() => {
                      const fishPieces = gameState.playerTank.pieces.filter(piece => piece.type === 'fish');
                      const enhancedPieces = applyBonusesToPieces(fishPieces, gameState.playerTank.pieces);
                      const baseAttack = fishPieces.reduce((total, piece) => total + piece.stats.attack, 0);
                      const totalAttack = enhancedPieces.reduce((total, piece) => total + piece.stats.attack, 0);
                      const bonusAttack = totalAttack - baseAttack;
                      
                      return (
                        <>
                          <span>{baseAttack}</span>
                          {bonusAttack > 0 && <span className="text-green-500">(+{bonusAttack})</span>}
                        </>
                      );
                    })()}
                  </div>
                  <div className="text-gray-600">Total Attack</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 cursor-help flex items-center justify-center gap-1">
                    {(() => {
                      const allPieces = gameState.playerTank.pieces.filter(piece => 
                        piece.type === 'fish' || piece.type === 'plant' || piece.type === 'equipment'
                      );
                      const enhancedPieces = applyBonusesToPieces(allPieces, gameState.playerTank.pieces);
                      const baseHealth = allPieces.reduce((total, piece) => total + piece.stats.health, 0);
                      const totalHealth = enhancedPieces.reduce((total, piece) => total + piece.stats.health, 0);
                      const bonusHealth = totalHealth - baseHealth;
                      
                      return (
                        <>
                          <span>{baseHealth}</span>
                          {bonusHealth > 0 && <span className="text-green-500">(+{bonusHealth})</span>}
                        </>
                      );
                    })()}
                  </div>
                  <div className="text-gray-600">Tank Health</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 cursor-help flex items-center justify-center gap-1">
                    {(() => {
                      const fishPieces = gameState.playerTank.pieces.filter(piece => piece.type === 'fish');
                      if (fishPieces.length === 0) return <span>0</span>;
                      
                     const enhancedPlayerFish = applyBonusesToPieces(fishPieces, gameState.playerTank.pieces);
                      const baseSpeed = Math.round(fishPieces.reduce((total, piece) => total + piece.stats.speed, 0) / fishPieces.length);
                     const totalSpeed = Math.round(enhancedPlayerFish.reduce((total, piece) => total + piece.stats.speed, 0) / fishPieces.length);
                      const bonusSpeed = totalSpeed - baseSpeed;
                      
                      return (
                        <>
                          <span>{baseSpeed}</span>
                          {bonusSpeed > 0 && <span className="text-green-500">(+{bonusSpeed})</span>}
                        </>
                      );
                    })()}
                  </div>
                  <div className="text-gray-600">Avg Speed</div>
                </div>
              </div>
              
              {/* Detailed breakdown tooltip */}
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 text-white p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="text-sm font-bold mb-2">Detailed Breakdown:</div>
                <div className="space-y-1 text-xs">
                  {(() => {
                    const fishPieces = gameState.playerTank.pieces.filter(piece => piece.type === 'fish');
                    const enhancedPieces = applyBonusesToPieces(fishPieces, gameState.playerTank.pieces);
                    return enhancedPieces.map(piece => {
                      const originalPiece = fishPieces.find(p => p.id === piece.id);
                      const attackBonus = piece.stats.attack - originalPiece!.stats.attack;
                      const healthBonus = piece.stats.health - originalPiece!.stats.health;
                      const speedBonus = piece.stats.speed - originalPiece!.stats.speed;
                      
                      return (
                        <div key={piece.id} className="flex justify-between">
                          <span>{piece.name}:</span>
                          <span>
                            <span className="text-red-400">{piece.stats.attack}</span>
                            {attackBonus > 0 && <span className="text-green-400"> (+{attackBonus})</span>}
                            {' / '}
                            <span className="text-green-400">{piece.stats.health}</span>
                            {healthBonus > 0 && <span className="text-green-400"> (+{healthBonus})</span>}
                            {' / '}
                            <span className="text-blue-400">{piece.stats.speed}</span>
                            {speedBonus > 0 && <span className="text-cyan-400"> (+{speedBonus})</span>}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Total Pieces: {gameState.playerTank.pieces.length} | Fish: {gameState.playerTank.pieces.filter(piece => piece.type === 'fish').length}</span>
                  <span>Water Quality: {gameState.playerTank.waterQuality}/10</span>
                </div>
              </div>
            </div>
          )}
          
          <TankGrid
            pieces={gameState.playerTank.pieces}
            onPiecePlace={onPlacePiece}
            onPieceMove={onMovePiece}
            waterQuality={gameState.playerTank.waterQuality}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            currentDraggedPiece={draggedPiece}
            hoveredCardPiece={hoveredCardPiece}
          />
          
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Tank Pieces</h2>
          {gameState.playerTank.pieces.length > 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-4 max-h-[600px] overflow-y-auto">
              {/* Unplaced pieces warning */}
              {(() => {
                const unplacedPieces = gameState.playerTank.pieces.filter(piece => !piece.position);
                if (unplacedPieces.length > 0) {
                  return (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <span className="text-lg">⚠️</span>
                        <span className="font-medium">
                          {unplacedPieces.length} piece{unplacedPieces.length > 1 ? 's' : ''} not placed on grid yet!
                        </span>
                      </div>
                      <div className="text-sm text-yellow-700 mt-1">
                        Drag them to the tank grid to use them in battle.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 justify-items-center">
              {gameState.playerTank.pieces.map((piece, index) => (
                <div key={`${piece.id}-${index}`} className="min-h-0 w-full max-w-[280px]">
                  <PieceCard
                    piece={piece}
                    onSelect={onSelectPiece}
                    onSell={onSellPiece}
                    isSelected={gameState.selectedPiece?.id === piece.id}
                    showSellOption={true}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onHover={setHoveredCardPiece}
                  />
                </div>
              ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-6 text-center text-gray-500">
              <p>No pieces in your tank yet.</p>
              <p className="text-sm">Purchase some from the shop below!</p>
            </div>
          )}
        </div>
      </div>
      
      <Shop
        pieces={gameState.shop}
        gold={gameState.gold}
        onPurchase={onPurchasePiece}
        onReroll={onRerollShop}
        rerollCost={2}
        lockedIndex={gameState.lockedShopIndex}
        onToggleLock={onToggleShopLock}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
    </div>
  );

  const renderPlacementPhase = () => (
    // Just render the shop phase - placement instructions are already shown there
    renderShopPhase()
  );

  const renderBattlePhase = () => (
    <BattleView
      playerPieces={gameState.playerTank.pieces}
      opponentPieces={gameState.opponentTank.pieces}
      playerWaterQuality={gameState.playerTank.waterQuality}
      opponentWaterQuality={gameState.opponentTank.waterQuality}
      onBattleComplete={onCompleteBattle}
    />
  );

  switch (gameState.phase) {
    case 'shop':
      return renderShopPhase();
    case 'placement':
      return renderPlacementPhase();
    case 'battle':
      return renderBattlePhase();
    default:
      return renderShopPhase();
  }
};