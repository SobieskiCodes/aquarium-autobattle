import React from 'react';
import { GamePiece } from '../types/game';
import { getRarityColor, getTypeColor } from '../data/pieces';
import { Sword, Heart, Zap, DollarSign } from 'lucide-react';

interface PieceCardProps {
  piece: GamePiece;
  onSelect?: (piece: GamePiece) => void;
  onPurchase?: (piece: GamePiece) => void;
  isSelected?: boolean;
  isInShop?: boolean;
  canAfford?: boolean;
}

export const PieceCard: React.FC<PieceCardProps> = ({
  piece,
  onSelect,
  onPurchase,
  isSelected = false,
  isInShop = false,
  canAfford = true
}) => {
  const handleClick = () => {
    if (isInShop && onPurchase) {
      onPurchase(piece);
    } else if (onSelect) {
      onSelect(piece);
    }
  };

  return (
    <div
      className={`
        relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 transform scale-105' 
          : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
        }
        ${isInShop && !canAfford ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={canAfford ? handleClick : undefined}
      style={{
        borderTopColor: getRarityColor(piece.rarity),
        borderTopWidth: '4px'
      }}
    >
      {/* Piece Name & Type */}
      <div className="mb-2">
        <h3 className="font-bold text-sm text-gray-900">{piece.name}</h3>
        <p className="text-xs capitalize" style={{ color: getTypeColor(piece.type) }}>
          {piece.type} • {piece.rarity}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 mb-2 text-xs">
        <div className="flex items-center gap-1 text-red-600">
          <Sword size={12} />
          <span>{piece.stats.attack}</span>
        </div>
        <div className="flex items-center gap-1 text-green-600">
          <Heart size={12} />
          <span>{piece.stats.health}</span>
        </div>
        <div className="flex items-center gap-1 text-blue-600">
          <Zap size={12} />
          <span>{piece.stats.speed}</span>
        </div>
        {isInShop && (
          <div className="flex items-center gap-1 text-yellow-600 ml-auto">
            <DollarSign size={12} />
            <span className="font-bold">{piece.cost}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-2">
        {piece.tags.slice(0, 3).map(tag => (
          <span
            key={tag}
            className="px-1 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Shape Preview */}
      <div className="mb-2">
        <div className="text-xs text-gray-600 mb-1">Shape:</div>
        <div className="grid grid-cols-3 gap-0.5 w-fit">
          {Array(3).fill(null).map((_, y) =>
            Array(3).fill(null).map((_, x) => {
              const isOccupied = piece.shape.some(pos => pos.x === x && pos.y === y);
              return (
                <div
                  key={`${x}-${y}`}
                  className={`w-2 h-2 border ${
                    isOccupied 
                      ? 'bg-current border-current' 
                      : 'bg-gray-100 border-gray-200'
                  }`}
                  style={{ color: getTypeColor(piece.type) }}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Abilities */}
      {piece.abilities && piece.abilities.length > 0 && (
        <div className="text-xs text-gray-600">
          <div className="font-medium mb-1">Abilities:</div>
          <ul className="space-y-0.5">
            {piece.abilities.slice(0, 2).map((ability, index) => (
              <li key={index} className="leading-tight">• {ability}</li>
            ))}
            {piece.type === 'consumable' && (
              <li className="text-orange-600 font-medium">⚡ Consumed at battle start</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};