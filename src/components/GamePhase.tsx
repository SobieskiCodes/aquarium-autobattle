import React from 'react';
import { GameState } from '../types/game';
import { Shop } from './Shop';
import { TankGrid } from './TankGrid';
import { BattleView } from './BattleView';
import { CompactPieceCard } from './CompactPieceCard';
import { TankSummary } from './TankSummary';
import { analyzeTank } from '../utils/tankAnalysis';
import { Play, ArrowRight, Lock } from 'lucide-react';

interface GamePhaseProps {
  gameState: GameState;
  onPurchasePiece: (piece: any) => void;
  onPlacePiece: (piece: any, position: any) => void;
  onMovePiece: (piece: any, position: any) => void;
  onRerollShop: () => void;
  onEnterBattlePrep: () => void;
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
  onEnterBattlePrep,
  onCompleteBattle,
  onSelectPiece,
  onCancelPlacement,
  onSellPiece,
  onToggleShopLock,
  onClearShopLock
}) => {
  const [draggedPiece, setDraggedPiece] = React.useState<GamePiece | null>(null);
  const [hoveredCardPiece, setHoveredCardPiece] = React.useState<GamePiece | null>(null);

  const handleDragStart = (piece: GamePiece) => {
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

  const renderShopPhase = () => (
    <div className="flex gap-3 h-[calc(100vh-160px)] max-h-[800px]">
      {/* Left Sidebar - Shop */}
      <div className="w-96 flex-shrink-0 overflow-y-auto min-w-0">
        <Shop
          pieces={gameState.shop}
          gold={gameState.gold}
          onPurchase={onPurchasePiece}
          onReroll={onRerollShop}
          currentRerollCost={gameState.rerollsThisRound < 5 ? 2 : 2 + (gameState.rerollsThisRound - 4)}
          rerollsThisRound={gameState.rerollsThisRound}
          lockedIndex={gameState.lockedShopIndex}
          onToggleLock={onToggleShopLock}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      </div>

      {/* Center Content Area - Tank */}
      <div className="flex-1 space-y-3 overflow-y-auto min-w-0 max-w-3xl">
        <div className="bg-gradient-to-r from-teal-500 to-blue-600 text-white p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm">🏆</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold">
                    Game Round {gameState.round}/15
                    {gameState.round === 15 && (
                      <span className="ml-2 text-yellow-300 text-base">🏁 Final Round!</span>
                    )}
                  </h1>
                  <div className="flex items-center gap-4">
                    <p className="text-sm opacity-90">Shop & Build Phase</p>
                    <div className="text-sm opacity-75">
                      Pieces: {gameState.playerTank.pieces.length} | 
                      Placed: {gameState.playerTank.pieces.filter(p => p.position).length}
                    </div>
                    {gameState.lossStreak > 0 && (
                      <div className="bg-red-500/20 px-2 py-1 rounded text-xs font-bold">
                        Loss Streak: {gameState.lossStreak} (+{Math.min(gameState.lossStreak * 2, 10)} bonus gold next loss)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Shop Lock Status */}
              {gameState.lockedShopIndex !== null && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
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
                onClick={onEnterBattlePrep}
                disabled={gameState.playerTank.pieces.length === 0}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all text-sm
                  ${gameState.playerTank.pieces.length > 0
                    ? 'bg-white text-teal-600 hover:bg-gray-100 hover:shadow-md'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <Play size={16} />
                {gameState.round === 15 ? 'Final Battle!' : 'Battle Preparation'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Your Tank</h2>
            
            {/* Board Stats Summary */}
            {gameState.playerTank.pieces.length > 0 && (
              (() => {
                const placedPieces = gameState.playerTank.pieces.filter(p => p.position);
                const analysis = analyzeTank(placedPieces);
                return (
                  <TankSummary
                    analysis={analysis}
                    waterQuality={gameState.playerTank.waterQuality}
                    className="mb-2"
                  />
                );
              })()
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
        </div>
      </div>

      {/* Right Sidebar - Tank Pieces Inventory */}
      <div className="w-80 flex-shrink-0 overflow-y-auto min-w-0">
        <div className="bg-gradient-to-b from-white to-gray-50 rounded-lg shadow-lg border border-gray-200 h-full flex flex-col">
          {/* Inventory Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-3 rounded-t-lg flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm">🎒</span>
              </div>
              <h2 className="text-lg font-bold">Tank Pieces</h2>
              <div className="ml-auto text-sm bg-white/20 px-2 py-1 rounded-full">
                {gameState.playerTank.pieces.length} items
              </div>
            </div>
            
            {(() => {
              const unplacedPieces = gameState.playerTank.pieces.filter(piece => !piece.position);
              const placedPieces = gameState.playerTank.pieces.filter(piece => piece.position);
              return (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-green-200">✓ Placed: {placedPieces.length}</span>
                    {unplacedPieces.length > 0 && (
                      <span className="text-yellow-200">⚠ Unplaced: {unplacedPieces.length}</span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          
          {/* Inventory Items */}
          <div className="flex-1 p-2 min-h-0">
            {gameState.playerTank.pieces.length > 0 ? (
              <div className="space-y-1 h-full overflow-y-auto">
                {gameState.playerTank.pieces.map((piece, index) => (
                  <div key={`${piece.id}-${index}`}>
                    <CompactPieceCard
                      piece={piece}
                      onSelect={onSelectPiece}
                      onSell={onSellPiece}
                      isSelected={gameState.selectedPiece?.id === piece.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onHover={setHoveredCardPiece}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4">
                <div className="text-4xl mb-2">🐠</div>
                <p className="text-center font-medium">No pieces yet</p>
                <p className="text-sm text-center">Purchase from shop to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>
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
      currentRound={gameState.round}
      onBattleComplete={onCompleteBattle}
      goldHistory={gameState.goldHistory}
      currentGold={gameState.gold}
    />
  );

  switch (gameState.phase) {
    case 'shop':
      // SHOP SCREEN: Buy pieces, place on grid, has shop at bottom
      return renderShopPhase();
    case 'placement':
      return renderPlacementPhase();
    case 'battle':
      // BATTLE PREPARATION SCREEN: Stats comparison, "Start Battle" button
      // This is NOT the actual battle animation - that happens within BattleView
      return renderBattlePhase();
    default:
      return renderShopPhase();
  }
};