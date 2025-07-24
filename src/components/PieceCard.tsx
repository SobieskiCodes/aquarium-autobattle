import React from 'react';
import { GamePiece } from '../types/game';
import { getRarityColor, getTypeColor } from '../data/pieces';
import { EnhancedGamePiece } from '../utils/tankAnalysis';
import { Sword, Heart, Zap, DollarSign, X, Lock } from 'lucide-react';

interface PieceCardProps {
  piece: GamePiece;
  onSelect?: (piece: GamePiece) => void;
  onPurchase?: (piece: GamePiece) => void;
  onSell?: (piece: GamePiece) => void;
  isSelected?: boolean;
  isInShop?: boolean;
  canAfford?: boolean;
  showSellOption?: boolean;
  isLocked?: boolean;
  onDragStart?: (piece: GamePiece) => void;
  onDragEnd?: () => void;
  onHover?: (piece: GamePiece | null) => void;
}

export const PieceCard: React.FC<PieceCardProps> = ({
  piece,
  onSelect,
  onPurchase,
  onSell,
  isSelected = false,
  isInShop = false,
  canAfford = true,
  showSellOption = false,
  isLocked = false,
  onDragStart,
  onDragEnd,
  onHover
}) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleClick = () => {
    if (isInShop && onPurchase && canAfford) {
      onPurchase(piece);
    }
  };

  const handleSell = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSell) {
      onSell(piece);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(piece));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    if (onDragStart) {
      onDragStart(piece);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const handleMouseEnter = () => {
    if (onHover && piece.position) {
      onHover(piece);
    }
  };

  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null);
    }
  };

  const sellValue = Math.floor(piece.cost * 0.75);

  // Check if this piece has consumed items
  const enhancedPiece = piece as EnhancedGamePiece;
  const consumedCount = enhancedPiece.consumedEffects?.length || 0;
  const hasConsumedItems = consumedCount > 0;

  return (
    <div 
      className={`
        relative
        ${isLocked ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}
      `}
    >
      <div
      className={`
        relative p-2 rounded-lg border-2 cursor-pointer transition-all duration-200 flex flex-col
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 transform scale-105' 
          : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
        }
       ${isInShop && !canAfford ? 'opacity-50' : ''}
       ${isInShop && !canAfford ? 'cursor-not-allowed' : ''}
        ${isLocked ? 'bg-yellow-50' : ''}
        ${isDragging ? 'opacity-50 transform rotate-2' : ''}
        ${isInShop ? 'h-32' : 'h-48'}
      `}
     onClick={canAfford && piece.type !== 'consumable' ? handleClick : undefined}
      onClick={canAfford ? handleClick : undefined}
      draggable={canAfford && (isInShop || showSellOption)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        borderTopColor: getRarityColor(piece.rarity),
        borderTopWidth: '4px'
      }}
    >
      {/* Lock indicator */}
      {isLocked && (
        <div className="absolute top-1 left-1 w-4 h-4 bg-yellow-500 text-white rounded-full flex items-center justify-center">
          <Lock size={8} />
        </div>
      )}
      
      {/* Piece Name & Type */}
      <div className="mb-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className={`font-bold text-xs flex items-center gap-1 ${!piece.position && showSellOption ? 'text-yellow-800' : 'text-gray-900'}`}>
            {piece.name}
            {!piece.position && showSellOption && <span className="ml-1 text-yellow-600">⚠️</span>}
            {hasConsumedItems && (
              <span 
                className="inline-flex items-center justify-center w-3 h-3 bg-orange-500 text-white text-xs rounded-full font-bold"
                title={`Has consumed ${consumedCount} item${consumedCount > 1 ? 's' : ''}`}
              >
                {consumedCount}
              </span>
            )}
          </h3>
          {/* Sell Button */}
          {showSellOption && onSell && (
            <button
              onClick={handleSell}
              className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm ml-1 flex-shrink-0"
              title={`Sell for ${sellValue}g (75% of ${piece.cost}g cost)`}
            >
              <X size={8} />
            </button>
          )}
        </div>
        <p className="text-xs capitalize leading-tight" style={{ color: getTypeColor(piece.type) }}>
          {piece.type} • {piece.rarity}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-1 mb-1 text-xs flex-shrink-0">
        <div className="flex items-center gap-1 text-red-600" title={hasConsumedItems ? `Base: ${enhancedPiece.originalStats?.attack || piece.stats.attack}` : undefined}>
          <Sword size={10} />
          <span>
            {piece.stats.attack}
            {hasConsumedItems && enhancedPiece.originalStats && piece.stats.attack > enhancedPiece.originalStats.attack && (
              <span className="text-green-500 text-xs ml-0.5">
                (+{piece.stats.attack - enhancedPiece.originalStats.attack})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 text-green-600" title={hasConsumedItems ? `Base: ${enhancedPiece.originalStats?.health || piece.stats.health}` : undefined}>
          <Heart size={10} />
          <span>
            {piece.stats.health}
            {hasConsumedItems && enhancedPiece.originalStats && piece.stats.health > enhancedPiece.originalStats.health && (
              <span className="text-green-500 text-xs ml-0.5">
                (+{piece.stats.health - enhancedPiece.originalStats.health})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 text-blue-600" title={hasConsumedItems ? `Base: ${enhancedPiece.originalStats?.speed || piece.stats.speed}` : undefined}>
          <Zap size={10} />
          <span>
            {piece.stats.speed}
            {hasConsumedItems && enhancedPiece.originalStats && piece.stats.speed > enhancedPiece.originalStats.speed && (
              <span className="text-green-500 text-xs ml-0.5">
                (+{piece.stats.speed - enhancedPiece.originalStats.speed})
              </span>
            )}
          </span>
        </div>
        {isInShop && (
          <div className="flex items-center gap-1 text-yellow-600 ml-auto">
            <DollarSign size={10} />
            <span className="font-bold">{piece.cost}</span>
          </div>
        )}
        {showSellOption && (
          <div className="flex items-center gap-1 text-green-600 ml-auto text-xs">
            <span>Sell:</span>
            <DollarSign size={8} />
            <span className="font-bold">{sellValue}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-1 flex-shrink-0">
        {piece.tags.slice(0, isInShop ? 2 : 3).map(tag => (
          <span
            key={tag}
            className="px-1 py-0.5 text-xs bg-gray-100 text-gray-700 rounded leading-none"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Shape Preview */}
      <div className="mb-1 flex-shrink-0">
        {!isInShop && <div className="text-xs text-gray-600 mb-1">Shape:</div>}
        <div className="grid grid-cols-3 gap-0.5 w-fit mx-auto">
          {Array(3).fill(null).map((_, y) =>
            Array(3).fill(null).map((_, x) => {
              const isOccupied = piece.shape.some(pos => pos.x === x && pos.y === y);
              return (
                <div
                  key={`${x}-${y}`}
                  className={`w-1 h-1 border ${
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
      {piece.abilities && piece.abilities.length > 0 && !isInShop && (
        <div className="text-xs text-gray-600 mt-1 flex-1 flex flex-col">
          <div className="font-medium mb-1">Abilities:</div>
          <ul className="space-y-0.5 text-xs flex-1">
            {piece.abilities.slice(0, 2).map((ability, index) => (
              <li key={index} className="leading-tight text-xs">
                • <span dangerouslySetInnerHTML={{ __html: ability.replace(/~~(.+?)~~/g, '<del>$1</del>') }} />
              </li>
            ))}
            {piece.type === 'consumable' && (
              <li className="text-orange-600 font-medium text-xs">⚡ Consumed at battle start if placed</li>
            )}
           {!piece.position && showSellOption && piece.type === 'consumable' && (
             <li className="text-red-600 font-medium text-xs">⚠️ Will disappear if not placed before battle!</li>
           )}
          </ul>
          
          {/* Show consumed items summary */}
          {hasConsumedItems && (
            <div className="mt-1 pt-1 border-t border-gray-200">
              <div className="text-xs font-medium text-orange-600 mb-1">
                Consumed Items ({consumedCount}):
              </div>
              {(() => {
                // Group consumed effects by consumable name
                const consumedGroups = new Map<string, number>();
                enhancedPiece.consumedEffects?.forEach(effect => {
                  const count = consumedGroups.get(effect.consumableName) || 0;
                  consumedGroups.set(effect.consumableName, count + 1);
                });
                
                const groupedEntries = Array.from(consumedGroups.entries());
                const displayEntries = groupedEntries.slice(0, 2);
                const remainingCount = groupedEntries.length > 2 ? groupedEntries.length - 2 : 0;
                
                return (
                  <div className="text-xs text-orange-700">
                    {displayEntries.map(([name, count], index) => (
                      <div key={index} className="truncate">
                        • {name}{count > 1 ? ` (×${count})` : ''}
                      </div>
                    ))}
                    {remainingCount > 0 && (
                      <div className="text-xs text-gray-500">
                        +{remainingCount} more type{remainingCount > 1 ? 's' : ''}...
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
};