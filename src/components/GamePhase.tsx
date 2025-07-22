import React from 'react';
import { GameState } from '../types/game';
import { Shop } from './Shop';
import { TankGrid } from './TankGrid';
import { BattleView } from './BattleView';
import { PieceCard } from './PieceCard';
import { Play, ArrowRight } from 'lucide-react';

interface GamePhaseProps {
  gameState: GameState;
  onPurchasePiece: (piece: any) => void;
  onPlacePiece: (piece: any, position: any) => void;
  onMovePiece: (piece: any, position: any) => void;
  onRerollShop: () => void;
  onStartBattle: () => void;
  onCompleteBattle: (playerWon: boolean) => void;
  onSelectPiece: (piece: any) => void;
  onCancelPlacement: () => void;
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
  onCancelPlacement
}) => {
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
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Tank</h2>
          
          {/* Board Stats Summary */}
          {gameState.playerTank.pieces.length > 0 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200">
              <h3 className="font-bold text-gray-900 mb-2">Tank Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {gameState.playerTank.pieces.filter(piece => piece.type === 'fish').reduce((total, piece) => total + piece.stats.attack, 0)}
                  </div>
                  <div className="text-gray-600">Total Attack</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {gameState.playerTank.pieces.filter(piece => 
                      piece.type === 'fish' || piece.type === 'plant' || piece.type === 'equipment'
                    ).reduce((total, piece) => total + piece.stats.health, 0)}
                  </div>
                  <div className="text-gray-600">Tank Health</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(gameState.playerTank.pieces.filter(piece => piece.type === 'fish').reduce((total, piece) => total + piece.stats.speed, 0) / Math.max(1, gameState.playerTank.pieces.filter(piece => piece.type === 'fish').length))}
                  </div>
                  <div className="text-gray-600">Avg Speed</div>
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
            selectedPiece={gameState.selectedPiece}
            waterQuality={gameState.playerTank.waterQuality}
          />
          
          {gameState.selectedPiece && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-800">
                  <strong>
                    {gameState.selectedPiece.position ? 'Move mode:' : 'Placement mode:'}
                  </strong> 
                  Click on the grid to {gameState.selectedPiece.position ? 'move' : 'place'} your {gameState.selectedPiece.name}
                </p>
                <button
                  onClick={onCancelPlacement}
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Tank Pieces</h2>
          {gameState.playerTank.pieces.length > 0 ? (
            <div className="grid gap-2">
              {gameState.playerTank.pieces.map((piece, index) => (
                <PieceCard
                  key={`${piece.id}-${index}`}
                  piece={piece}
                  onSelect={onSelectPiece}
                  isSelected={gameState.selectedPiece?.id === piece.id}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
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
      />
    </div>
  );

  const renderPlacementPhase = () => (
    <div className="space-y-6">
      <div className="bg-yellow-500 text-white p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Place Your Piece</h2>
            <p>Click on the grid to place your {gameState.selectedPiece?.name}</p>
          </div>
          <button
            onClick={onCancelPlacement}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            Cancel & Refund
          </button>
        </div>
      </div>
      
      <TankGrid
        pieces={gameState.playerTank.pieces}
        onPiecePlace={onPlacePiece}
        onPieceMove={onMovePiece}
        selectedPiece={gameState.selectedPiece}
        waterQuality={gameState.playerTank.waterQuality}
      />
    </div>
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