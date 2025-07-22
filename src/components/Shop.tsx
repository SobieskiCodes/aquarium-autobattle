import React from 'react';
import { GamePiece } from '../types/game';
import { PieceCard } from './PieceCard';
import { RefreshCw, DollarSign } from 'lucide-react';

interface ShopProps {
  pieces: (GamePiece | null)[];
  gold: number;
  onPurchase: (piece: GamePiece) => void;
  onReroll: () => void;
  rerollCost: number;
}

export const Shop: React.FC<ShopProps> = ({
  pieces,
  gold,
  onPurchase,
  onReroll,
  rerollCost
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Aquarium Shop</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-yellow-600">
            <DollarSign size={20} />
            <span className="font-bold text-lg">{gold}</span>
          </div>
          <button
            onClick={onReroll}
            disabled={gold < rerollCost}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all
              ${gold >= rerollCost
                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <RefreshCw size={16} />
            Reroll ({rerollCost}g)
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {pieces.map((piece, index) => (
          <div key={index} className="min-h-[200px]">
            {piece ? (
              <PieceCard
                piece={piece}
                onPurchase={onPurchase}
                isInShop={true}
                canAfford={gold >= piece.cost}
              />
            ) : (
              <div className="h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                <span className="text-sm">Sold Out</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};