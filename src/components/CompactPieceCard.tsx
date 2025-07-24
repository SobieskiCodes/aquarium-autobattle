import React, { useState } from 'react';
import { GamePiece } from '../types/game';
import { getRarityColor, getTypeColor } from '../data/pieces';
import { EnhancedGamePiece } from '../utils/tankAnalysis';
import { Sword, Heart, Zap, DollarSign, X, Eye } from 'lucide-react';

interface CompactPieceCardProps {
  piece: GamePiece;
  onSelect?: (piece: GamePiece) => void;
  onSell?: (piece: GamePiece) => void;
  isSelected?: boolean;
  onDragStart?: (piece: GamePiece) => void;
  onDragEnd?: () => void;
  onHover?: (piece: GamePiece | null) => void;
}

export const CompactPieceCard: React.FC<CompactPieceCardProps> = ({
  piece,
  onSelect,
  onSell,
  isSelected = false,
  onDragStart,
  onDragEnd,
  onHover
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = () => {
    if (onSelect) {
      onSelect(piece);
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
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null);
    }
    setIsExpanded(false);
  };

  const sellValue = Math.floor(piece.cost * 0.75);

  // Check if this piece has consumed items
  const enhancedPiece = piece as EnhancedGamePiece;
  const consumedCount = enhancedPiece.consumedEffects?.length || 0;
  const hasConsumedItems = consumedCount > 0;

  if (isExpanded) {
    // Full card view on hover
    return (
      <div
        className={`
          relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 bg-white shadow-lg
          ${isSelected 
            ? 'border-blue-500 bg-blue-50 transform scale-[1.02]' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isDragging ? 'opacity-50 transform rotate-1' : ''}
        `}
        onClick={handleClick}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          borderTopColor: getRarityColor(piece.rarity),
          borderTopWidth: '4px'
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-sm flex items-center gap-1 ${!piece.position ? 'text-yellow-800' : 'text-gray-900'}`}>
              {piece.name}
              {!piece.position && <span className="text-yellow-600">⚠️</span>}
              {hasConsumedItems && (
                <span 
                  className="inline-flex items-center justify-center w-4 h-4 bg-orange-500 text-white text-xs rounded-full font-bold"
                  title={`Has consumed ${consumedCount} item${consumedCount > 1 ? 's' : ''}`}
                >
                  {consumedCount}
                </span>
              )}
            </h3>
            <p className="text-xs capitalize leading-none mt-1" style={{ color: getTypeColor(piece.type) }}>
              {piece.type} • {piece.rarity}
            </p>
          </div>
          
          {/* Sell Button */}
          {onSell && (
            <button
              onClick={handleSell}
              className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm ml-2 flex-shrink-0"
              title={`Sell for ${sellValue}g (75% of ${piece.cost}g cost)`}
            >
              <X size={10} />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mb-2 text-sm">
          <div className="flex items-center gap-1 text-red-600" title={hasConsumedItems ? `Base: ${enhancedPiece.originalStats?.attack || piece.stats.attack}` : undefined}>
            <Sword size={14} />
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
            <Heart size={14} />
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
            <Zap size={14} />
            <span>
              {piece.stats.speed}
              {hasConsumedItems && enhancedPiece.originalStats && piece.stats.speed > enhancedPiece.originalStats.speed && (
                <span className="text-green-500 text-xs ml-0.5">
                  (+{piece.stats.speed - enhancedPiece.originalStats.speed})
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1 text-green-600 ml-auto text-sm">
            <span>Sell:</span>
            <DollarSign size={12} />
            <span className="font-bold">{sellValue}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {piece.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full leading-none font-medium"
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
            <ul className="space-y-0.5 text-xs">
              {piece.abilities.slice(0, 2).map((ability, index) => (
                <li key={index} className="leading-tight text-xs">
                  • <span dangerouslySetInnerHTML={{ __html: ability.replace(/~~(.+?)~~/g, '<del>$1</del>') }} />
                </li>
              ))}
              {piece.type === 'consumable' && (
                <li className="text-orange-600 font-medium text-xs">⚡ Consumed at battle start if placed</li>
              )}
              {!piece.position && piece.type === 'consumable' && (
                <li className="text-red-600 font-medium text-xs">⚠️ Will disappear if not placed before battle!</li>
              )}
            </ul>
            
            {/* Show consumed items summary */}
            {hasConsumedItems && (
              <div className="mt-2 pt-2 border-t border-gray-200">
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
    );
  }

  // Compact list view
  return (
    <div
      className={`
        relative p-2 rounded-lg border cursor-pointer transition-all duration-200 flex items-center gap-3
        ${isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
        ${isDragging ? 'opacity-50' : ''}
        ${!piece.position ? 'bg-yellow-50 border-yellow-200' : ''}
      `}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        borderLeftColor: getRarityColor(piece.rarity),
        borderLeftWidth: '4px'
      }}
    >
      {/* Status Indicator */}
      <div className="flex-shrink-0">
        {piece.position ? (
          <div className="w-2 h-2 bg-green-500 rounded-full" title="Placed on grid" />
        ) : (
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Not placed yet" />
        )}
      </div>

      {/* Piece Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`font-medium text-sm truncate ${!piece.position ? 'text-yellow-800' : 'text-gray-900'}`}>
            {piece.name}
          </h3>
          {hasConsumedItems && (
            <span 
              className="inline-flex items-center justify-center w-3 h-3 bg-orange-500 text-white text-xs rounded-full font-bold flex-shrink-0"
              title={`Has consumed ${consumedCount} item${consumedCount > 1 ? 's' : ''}`}
            >
              {consumedCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="capitalize" style={{ color: getTypeColor(piece.type) }}>
            {piece.type}
          </span>
          <span>•</span>
          <span className="capitalize">{piece.rarity}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-2 text-xs flex-shrink-0">
        <div className="flex items-center gap-1 text-red-600">
          <Sword size={10} />
          <span>{piece.stats.attack}</span>
        </div>
        <div className="flex items-center gap-1 text-green-600">
          <Heart size={10} />
          <span>{piece.stats.health}</span>
        </div>
        <div className="flex items-center gap-1 text-blue-600">
          <Zap size={10} />
          <span>{piece.stats.speed}</span>
        </div>
      </div>

      {/* Sell Button */}
      {onSell && (
        <button
          onClick={handleSell}
          className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm flex-shrink-0"
          title={`Sell for ${sellValue}g`}
        >
          <X size={8} />
        </button>
      )}

      {/* Hover indicator */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Eye size={12} className="text-gray-400" />
      </div>
    </div>
  );
};