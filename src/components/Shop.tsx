import React from 'react';
import { GamePiece } from '../types/game';
import { PieceCard } from './PieceCard';
import { RefreshCw, DollarSign, Lock, Unlock, Info } from 'lucide-react';

interface ShopProps {
  pieces: (GamePiece | null)[];
  gold: number;
  onPurchase: (piece: GamePiece) => void;
  onReroll: () => void;
  currentRerollCost: number;
  rerollsThisRound: number;
  lockedIndex: number | null;
  onToggleLock: (index: number) => void;
  onDragStart?: (piece: GamePiece) => void;
  onDragEnd?: () => void;
}

export const Shop: React.FC<ShopProps> = ({
  pieces,
  gold,
  onPurchase,
  onReroll,
  currentRerollCost,
  rerollsThisRound,
  lockedIndex,
  onToggleLock,
  onDragStart,
  onDragEnd
}) => {
  return (
    <div className="bg-gradient-to-b from-white to-gray-50 rounded-lg shadow-lg border border-gray-200 h-full flex flex-col">
      {/* Shop Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-sm">🏪</span>
          </div>
          <h2 className="text-lg font-bold">Aquarium Shop</h2>
          <div className="relative group">
            <Info 
              size={14} 
              className="text-white/70 hover:text-white cursor-help transition-colors" 
            />
            <div className="absolute left-0 top-6 bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-64">
              <div className="space-y-2">
                <div className="font-bold text-blue-300">Shop Tips:</div>
                <div>• Click to buy, drag to place directly</div>
                <div>• Lock items to keep through rerolls</div>
                <div className="text-orange-300 font-medium">• Consumables must be placed before battle!</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
            <DollarSign size={16} className="text-yellow-300" />
            <span className="font-bold">{gold}g</span>
          </div>
          <button
            onClick={onReroll}
            disabled={gold < currentRerollCost}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all
              ${gold >= currentRerollCost
                ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                : 'bg-gray-500/20 text-gray-300 cursor-not-allowed border border-gray-500/30'
              }
            `}
            title={`Reroll shop items (${currentRerollCost}g)${rerollsThisRound >= 5 ? ' - Cost increases after 5 rerolls' : ''}`}
          >
            <RefreshCw size={14} />
            <span>Reroll</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{currentRerollCost}g</span>
          </button>
        </div>
      </div>
      
      {/* Shop Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pieces.map((piece, index) => (
          <div key={piece ? piece.id : `empty-${index}`} className="relative">
            {/* Slot Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </div>
                <span className="text-xs font-medium text-gray-600">Shop Slot</span>
              </div>
              {piece && (
                <button
                  onClick={() => onToggleLock(index)}
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm
                    ${lockedIndex === index
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600 ring-2 ring-yellow-300'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }
                  `}
                  title={lockedIndex === index ? 'Unlock this item' : 'Lock this item (persists through rerolls)'}
                >
                  {lockedIndex === index ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
              )}
            </div>
            
            {/* Item Card */}
            {piece ? (
              <div className={`relative ${lockedIndex === index ? 'ring-2 ring-yellow-400 ring-opacity-50 rounded-lg' : ''}`}>
                <PieceCard
                  piece={piece}
                  onPurchase={onPurchase}
                  isInShop={true}
                  canAfford={gold >= piece.cost}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              </div>
            ) : (
              <div className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                <div className="text-2xl mb-1">📦</div>
                <span className="text-sm font-medium">Sold Out</span>
                <span className="text-xs">Reroll for new items</span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Lock Status Footer */}
      {lockedIndex !== null && (
        <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border-t border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-800">
              <div className="w-5 h-5 bg-yellow-500 text-white rounded-full flex items-center justify-center">
                <Lock size={10} />
              </div>
              <span className="text-sm font-medium">Slot {lockedIndex + 1} locked</span>
            </div>
            <button
              onClick={() => onToggleLock(lockedIndex)}
              className="text-xs text-yellow-700 hover:text-yellow-900 underline font-medium"
            >
              Unlock
            </button>
          </div>
          <div className="text-xs text-yellow-700 mt-1">
            This item will persist through rerolls and rounds
          </div>
        </div>
      )}
    </div>
  );
};