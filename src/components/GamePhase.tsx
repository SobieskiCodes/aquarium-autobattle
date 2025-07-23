import React from 'react';
import { GameState } from '../types/game';
import { Shop } from './Shop';
import { TankGrid } from './TankGrid';
import { BattleView } from './BattleView';
import { PieceCard } from './PieceCard';
import { TankSummary } from './TankSummary';
import { analyzeTank } from '../utils/tankAnalysis';
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
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-500 to-blue-600 text-white p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Game Round {gameState.round}/15
              {gameState.round === 15 && (
                <span className="ml-2 text-yellow-300 text-lg">🏁 Final Round!</span>
              )}
            </h1>
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
            {gameState.round === 15 ? 'Final Battle Preparation!' : 'Battle Preparation Screen'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Tank</h2>
          
          {/* Board Stats Summary */}
          {gameState.playerTank.pieces.length > 0 && (
            <TankSummary
              analysis={analyzeTank(gameState.playerTank.pieces)}
              waterQuality={gameState.playerTank.waterQuality}
              className="mb-4"
            />
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
        currentRerollCost={gameState.rerollsThisRound < 5 ? 2 : 2 + (gameState.rerollsThisRound - 4)}
        rerollsThisRound={gameState.rerollsThisRound}
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
      currentRound={gameState.round}
      onBattleComplete={onCompleteBattle}
      goldHistory={gameState.goldHistory}
      currentGold={gameState.gold}
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