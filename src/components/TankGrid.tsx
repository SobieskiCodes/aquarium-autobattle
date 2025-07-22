import React from 'react';
import { GamePiece, Position } from '../types/game';
import { getTypeColor } from '../data/pieces';

interface TankGridProps {
  pieces: GamePiece[];
  onPiecePlace?: (piece: GamePiece, position: Position) => void;
  onPieceMove?: (piece: GamePiece, position: Position) => void;
  selectedPiece?: GamePiece | null;
  isInteractive?: boolean;
  waterQuality?: number;
  previewPosition?: Position | null;
}

export const TankGrid: React.FC<TankGridProps> = ({
  pieces,
  onPiecePlace,
  onPieceMove,
  selectedPiece,
  isInteractive = true,
  waterQuality = 5,
  previewPosition = null
}) => {
  const GRID_WIDTH = 8;
  const GRID_HEIGHT = 6;
  const [hoveredPosition, setHoveredPosition] = React.useState<Position | null>(null);
  const [hoveredPiece, setHoveredPiece] = React.useState<GamePiece | null>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState<{ x: number; y: number } | null>(null);

  // Create grid with piece occupancy
  const grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
  
  pieces.forEach(piece => {
    if (piece.position) {
      piece.shape.forEach(offset => {
        const x = piece.position!.x + offset.x;
        const y = piece.position!.y + offset.y;
        if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
          grid[y][x] = piece;
        }
      });
    }
  });

  // Calculate bonuses for a piece
  const calculateBonuses = (piece: GamePiece) => {
    if (!piece.position) return [];
    
    const bonuses: Array<{ source: string; effect: string; color: string }> = [];
    
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
            bonuses.push({ source: 'Java Fern', effect: '+1 HP', color: 'text-green-500' });
          }
          // Anubias bonus
          if (adjacentPiece.id.includes('anubias')) {
            bonuses.push({ source: 'Anubias', effect: '+1 ATK +1 HP', color: 'text-green-600' });
          }
          // Consumable bonus (if piece is fish)
          if (adjacentPiece.type === 'consumable' && piece.type === 'fish') {
            bonuses.push({ source: 'Brine Shrimp', effect: '+1 ATK +1 HP (battle)', color: 'text-orange-500' });
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
          bonuses.push({ source: 'Schooling', effect: `+${schoolingCount} ATK`, color: 'text-blue-500' });
          if (schoolingCount >= 3) {
            bonuses.push({ source: 'Large School', effect: 'Double Speed', color: 'text-cyan-500' });
          }
        } else if (piece.id.includes('cardinal-tetra')) {
          bonuses.push({ source: 'Schooling', effect: `+${schoolingCount * 2} ATK`, color: 'text-blue-600' });
        }
      }
    }
    
    return bonuses;
  };
  
  // Get pieces that are providing bonuses to the hovered piece
  const getBonusProviders = (piece: GamePiece) => {
    if (!piece.position) return [];
    
    const providers: string[] = [];
    
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
          if (adjacentPiece.id.includes('java-fern') || 
              adjacentPiece.id.includes('anubias') || 
              adjacentPiece.type === 'consumable' ||
              (adjacentPiece.tags.includes('schooling') && piece.tags.includes('schooling'))) {
            providers.push(adjacentPiece.id);
          }
        }
      }
    });
    
    return providers;
  };
  const handleCellClick = (x: number, y: number) => {
    if (!selectedPiece || !isInteractive) return;
    
    // Check if piece can be placed at this position
    const canPlace = selectedPiece.shape.every(offset => {
      const newX = x + offset.x;
      const newY = y + offset.y;
      if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
        return false;
      }
      
      // Allow placement if cell is empty OR occupied by the same piece we're moving
      const occupyingPiece = grid[newY][newX];
      return !occupyingPiece || occupyingPiece.id === selectedPiece.id;
    });

    if (canPlace) {
      if (selectedPiece.position && onPieceMove) {
        // Moving existing piece
        onPieceMove(selectedPiece, { x, y });
      } else if (onPiecePlace) {
        // Placing new piece
        onPiecePlace(selectedPiece, { x, y });
      }
    }
  };

  const handleCellHover = (x: number, y: number) => {
    if (selectedPiece && isInteractive) {
      setHoveredPosition({ x, y });
    }
  };

  const handleCellLeave = () => {
    setHoveredPosition(null);
  };

  const handlePieceHover = (piece: GamePiece, event: React.MouseEvent) => {
    setHoveredPiece(piece);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.right + 10,
      y: rect.top
    });
  };

  const handlePieceLeave = () => {
    setHoveredPiece(null);
    setTooltipPosition(null);
  };
  const canPlaceAt = (x: number, y: number) => {
    if (!selectedPiece) return false;
    return selectedPiece.shape.every(offset => {
      const newX = x + offset.x;
      const newY = y + offset.y;
      if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
        return false;
      }
      
      // Allow placement if cell is empty OR occupied by the same piece we're moving
      const occupyingPiece = grid[newY][newX];
      return !occupyingPiece || occupyingPiece.id === selectedPiece.id;
    });
  };

  const isPreviewCell = (x: number, y: number) => {
    const position = previewPosition || hoveredPosition;
    if (!position || !selectedPiece) return false;
    
    return selectedPiece.shape.some(offset => 
      position.x + offset.x === x && position.y + offset.y === y
    );
  };

  const isBonusProvider = (piece: GamePiece) => {
    if (!hoveredPiece) return false;
    const providers = getBonusProviders(hoveredPiece);
    return providers.includes(piece.id);
  };
  const getWaterQualityGradient = () => {
    const quality = Math.max(0, Math.min(10, waterQuality));
    const hue = (quality / 10) * 120; // 0 = red, 120 = green
    return `hsl(${hue}, 70%, 85%)`;
  };

  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Water Quality:</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className="h-2 rounded-full transition-all duration-500"
            style={{ 
              width: `${(waterQuality / 10) * 100}%`,
              backgroundColor: getWaterQualityGradient()
            }}
          />
        </div>
        <span className="text-sm font-bold text-gray-900">{waterQuality}/10</span>
      </div>
      
      {/* Tooltip */}
      {hoveredPiece && tooltipPosition && (
        <div
          className="absolute z-50 bg-gray-900 text-white p-3 rounded-lg shadow-xl border border-gray-700 max-w-xs pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="text-sm font-bold mb-1">{hoveredPiece.name}</div>
          <div className="text-xs text-gray-300 mb-2">
            ATK: {hoveredPiece.stats.attack} | HP: {hoveredPiece.stats.health} | SPD: {hoveredPiece.stats.speed}
          </div>
          
          {hoveredPiece.abilities && hoveredPiece.abilities.length > 0 && (
            <div className="text-xs text-gray-300 mb-2">
              <div className="font-medium text-white mb-1">Abilities:</div>
              {hoveredPiece.abilities.map((ability, index) => (
                <div key={index}>• {ability}</div>
              ))}
            </div>
          )}
          
          {calculateBonuses(hoveredPiece).length > 0 && (
            <div className="text-xs border-t border-gray-700 pt-2">
              <div className="font-medium text-yellow-400 mb-1">Active Bonuses:</div>
              {calculateBonuses(hoveredPiece).map((bonus, index) => (
                <div key={index} className={bonus.color}>
                  • {bonus.effect} (from {bonus.source})
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div 
        className="grid grid-cols-8 gap-1 p-4 rounded-lg border-2 border-cyan-300 shadow-lg"
        style={{ 
          backgroundColor: getWaterQualityGradient(),
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(0,191,255,0.2) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(0,255,127,0.2) 0%, transparent 50%)
          `
        }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className={`
                aspect-square border rounded-lg flex items-center justify-center text-xs font-bold
                transition-all duration-200 cursor-pointer
                ${cell 
                  ? 'border-gray-400 text-white shadow-md transform hover:scale-105' 
                  : `border-gray-300 bg-white/30 ${
                      isPreviewCell(x, y) 
                        ? canPlaceAt(hoveredPosition?.x || previewPosition?.x || 0, hoveredPosition?.y || previewPosition?.y || 0)
                          ? 'bg-green-200 border-green-400' 
                          : 'bg-red-200 border-red-400'
                        : 'hover:bg-white/50'
                    }`
                }
              `}
              style={{
                backgroundColor: cell ? getTypeColor(cell.type) : undefined,
                minHeight: '40px'
              }}
              onClick={() => handleCellClick(x, y)}
              onMouseEnter={() => handleCellHover(x, y)}
              onMouseLeave={handleCellLeave}
            >
              {cell && (
                <div 
                  className="text-center w-full h-full flex flex-col justify-center"
                  onMouseEnter={(e) => handlePieceHover(cell, e)}
                  onMouseLeave={handlePieceLeave}
                >
                  <div className="text-xs leading-tight">{cell.name.split(' ')[0]}</div>
                  <div className="text-xs opacity-80">
                    {cell.stats.attack}/{cell.stats.health}
                  </div>
                </div>
              )}
              {isPreviewCell(x, y) && !cell && (
                <div className="text-center text-gray-600">
                  <div className="text-xs leading-tight opacity-70">
                    {selectedPiece?.name.split(' ')[0]}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};