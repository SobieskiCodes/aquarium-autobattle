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
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900">Aquarium Shop</h2>
          <div className="relative group">
            <Info 
              size={16} 
              className="text-gray-400 hover:text-gray-600 cursor-help transition-colors" 
            />
            <div className="absolute left-0 top-6 bg-gray-900 text-white text-sm p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
              <div className="space-y-2">
                <div>🛒 You can buy multiple items at once - they'll go into your storage to place later</div>
                <div className="text-orange-300 font-medium">⚠️ Consumables disappear if not placed on grid when battle starts!</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-yellow-600">
            <DollarSign size={20} />
            <span className="font-bold text-lg">{gold}</span>
          </div>
          <button
            onClick={onReroll}
            disabled={gold < currentRerollCost}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all
              ${gold >= currentRerollCost
                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
            title={`Reroll #${rerollsThisRound + 1}${rerollsThisRound >= 5 ? ` (cost increases after 5 rerolls)` : ''}`}
          >
            <RefreshCw size={16} />
            Reroll ({currentRerollCost}g)
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {pieces.map((piece, index) => (
          <div key={piece ? piece.id : `empty-${index}`} className="min-h-[200px]">
            <div className="text-xs text-gray-500 mb-1 text-center">
              Slot {index + 1}
            </div>
            {piece ? (
              <div className="relative">
                <PieceCard
                  piece={piece}
                  onPurchase={onPurchase}
                  isInShop={true}
                  canAfford={gold >= piece.cost}
                  isLocked={lockedIndex === index}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
                <button
                  onClick={() => onToggleLock(index)}
                  className={`
                    absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center
                    transition-all duration-200 shadow-sm
                    ${lockedIndex === index
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }
                  `}
                  title={lockedIndex === index ? 'Unlock this item' : 'Lock this item (persists through rerolls)'}
                >
                  {lockedIndex === index ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                <span className="text-sm">Sold Out</span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {lockedIndex !== null && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <div className="flex items-center gap-2">
            <Lock size={14} />
            <span>Slot {lockedIndex + 1} is locked and will persist through rerolls and rounds</span>
          </div>
        </div>
      )}
    </div>
  );
};