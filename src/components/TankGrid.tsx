import React from 'react';
import { GamePiece, Position } from '../types/game';
import { getTypeColor } from '../data/pieces';

interface TankGridProps {
  pieces: GamePiece[];
  onPiecePlace?: (piece: GamePiece, position: Position) => void;
  onPieceMove?: (piece: GamePiece, position: Position) => void;
  onSelectPiece?: (piece: GamePiece) => void;
  selectedPiece?: GamePiece | null;
  isInteractive?: boolean;
  waterQuality?: number;
  previewPosition?: Position | null;
  onDragStart?: (piece: GamePiece) => void;
  onDragEnd?: () => void;
  currentDraggedPiece?: GamePiece | null;
}

export const TankGrid: React.FC<TankGridProps> = ({
  pieces,
  onPiecePlace,
  onPieceMove,
  onSelectPiece,
  selectedPiece,
  isInteractive = true,
  waterQuality = 5,
  previewPosition = null,
  onDragStart,
  onDragEnd,
  currentDraggedPiece
}) => {
  const GRID_WIDTH = 8;
  const GRID_HEIGHT = 6;
  const [hoveredPosition, setHoveredPosition] = React.useState<Position | null>(null);
  const [hoveredPiece, setHoveredPiece] = React.useState<GamePiece | null>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [draggedPiece, setDraggedPiece] = React.useState<GamePiece | null>(null);
  const [isDragOver, setIsDragOver] = React.useState<Position | null>(null);

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
            bonuses.push({ source: 'Java Fern', effect: '+1 ATK +1 HP', color: 'text-green-600' });
          }
          // Anubias bonus
          if (adjacentPiece.id.includes('anubias')) {
            bonuses.push({ source: 'Anubias', effect: '+1 HP', color: 'text-green-500' });
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

  const handleDragStart = (e: React.DragEvent, piece: GamePiece) => {
    e.dataTransfer.setData('application/json', JSON.stringify(piece));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedPiece(piece);
    e.stopPropagation();
    if (onDragStart) {
      onDragStart(piece);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedPiece(null);
    setIsDragOver(null);
    e.stopPropagation();
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const handleDragOver = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Use the globally tracked dragged piece for consistent preview
    if (currentDraggedPiece) {
      const canPlace = currentDraggedPiece.shape.every((offset: Position) => {
        const newX = x + offset.x;
        const newY = y + offset.y;
        if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
          return false;
        }
        
        // Allow placement if cell is empty OR occupied by the same piece we're moving
        const occupyingPiece = grid[newY][newX];
        return !occupyingPiece || occupyingPiece.id === currentDraggedPiece.id;
      });
      
      if (canPlace) {
        setIsDragOver({ x, y });
      } else {
        setIsDragOver(null);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    // Only clear drag over if we're actually leaving the grid area
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(null);
    }
  };

  const handleDrop = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    e.stopPropagation();
    const pieceData = e.dataTransfer.getData('application/json');
    
    if (pieceData) {
      try {
        const piece = JSON.parse(pieceData);
        
        // Check if piece can be placed at this position
        const canPlace = piece.shape.every((offset: Position) => {
          const newX = x + offset.x;
          const newY = y + offset.y;
          if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
            return false;
          }
          
          // Allow placement if cell is empty OR occupied by the same piece we're moving
          const occupyingPiece = grid[newY][newX];
          return !occupyingPiece || occupyingPiece.id === piece.id;
        });

        if (canPlace) {
          // Check if this piece already exists in the tank (has a position)
          const existingPiece = pieces.find(p => p.id === piece.id);
          
          if (existingPiece && existingPiece.position && onPieceMove) {
            // Moving existing piece within the grid
            onPieceMove(existingPiece, { x, y });
          } else if (onPiecePlace) {
            // Placing new piece from shop or inventory
            onPiecePlace(piece, { x, y });
          }
        }
      } catch (error) {
        console.error('Error parsing dropped piece data:', error);
      }
    }
    
    setIsDragOver(null);
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

  const isDraggedPieceCell = (x: number, y: number) => {
    if (!draggedPiece || !draggedPiece.position) return false;
    
    return draggedPiece.shape.some((offset: Position) => 
      draggedPiece.position!.x + offset.x === x && draggedPiece.position!.y + offset.y === y
    );
  };
  const isDragPreviewCell = (x: number, y: number) => {
    if (!isDragOver || !currentDraggedPiece) return false;
    
    return currentDraggedPiece.shape.some((offset: Position) => 
      isDragOver.x + offset.x === x && isDragOver.y + offset.y === y
    );
  };

  const canDragPlaceAt = (x: number, y: number) => {
    if (!isDragOver || !currentDraggedPiece) return false;
    return currentDraggedPiece.shape.every((offset: Position) => {
      const newX = x + offset.x;
      const newY = y + offset.y;
      if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
        return false;
      }
      
      // Allow placement if cell is empty OR occupied by the same piece we're moving
      const occupyingPiece = grid[newY][newX];
      return !occupyingPiece || occupyingPiece.id === currentDraggedPiece.id;
    });
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
          {(() => {
            const bonuses = calculateBonuses(hoveredPiece);
            const bonusAttack = bonuses.filter(b => b.effect.includes('ATK')).reduce((sum, b) => {
              const match = b.effect.match(/\+(\d+) ATK/);
              return sum + (match ? parseInt(match[1]) : 0);
            }, 0);
            const bonusHealth = bonuses.filter(b => b.effect.includes('HP')).reduce((sum, b) => {
              const match = b.effect.match(/\+(\d+) HP/);
              return sum + (match ? parseInt(match[1]) : 0);
            }, 0);
            const bonusSpeed = bonuses.some(b => b.effect.includes('Double Speed')) ? hoveredPiece.stats.speed : 0;
            
            const finalAttack = hoveredPiece.stats.attack + bonusAttack;
            const finalHealth = hoveredPiece.stats.health + bonusHealth;
            const finalSpeed = hoveredPiece.stats.speed + bonusSpeed;
            
            return (
              <div className="text-xs text-gray-300 mb-2">
                <div className="flex gap-4">
                  <span>
                    ATK: <span className="text-red-400 font-bold">{finalAttack}</span>
                    {bonusAttack > 0 && <span className="text-green-400"> (+{bonusAttack})</span>}
                  </span>
                  <span>
                    HP: <span className="text-green-400 font-bold">{finalHealth}</span>
                    {bonusHealth > 0 && <span className="text-green-400"> (+{bonusHealth})</span>}
                  </span>
                  <span>
                    SPD: <span className="text-blue-400 font-bold">{finalSpeed}</span>
                    {bonusSpeed > 0 && <span className="text-cyan-400"> (+{bonusSpeed})</span>}
                  </span>
                </div>
                {(bonusAttack > 0 || bonusHealth > 0 || bonusSpeed > 0) && (
                  <div className="text-xs text-gray-400 mt-1">
                    Base: {hoveredPiece.stats.attack}/{hoveredPiece.stats.health}/{hoveredPiece.stats.speed}
                  </div>
                )}
              </div>
            );
          })()}
          
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
        onDragLeave={handleDragLeave}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className={`
                aspect-square border rounded-lg flex items-center justify-center text-xs font-bold
                transition-all duration-200 cursor-pointer
                ${cell && !isDraggedPieceCell(x, y)
                  ? 'border-gray-400 text-white shadow-md transform hover:scale-105'
                  : cell && isDraggedPieceCell(x, y)
                  ? 'border-gray-400 text-white shadow-md opacity-50'
                  : `border-gray-300 bg-white/30 ${
                      isPreviewCell(x, y) || isDragPreviewCell(x, y)
                        ? (isPreviewCell(x, y) 
                            ? canPlaceAt(hoveredPosition?.x || previewPosition?.x || 0, hoveredPosition?.y || previewPosition?.y || 0)
                            : canDragPlaceAt(isDragOver?.x || 0, isDragOver?.y || 0))
                          ? 'bg-green-200 border-green-400' 
                          : 'bg-red-200 border-red-400'
                        : 'hover:bg-white/50'
                    }`
                }
                ${isDragPreviewCell(x, y) ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
                ${cell && isBonusProvider(cell) ? 'ring-2 ring-yellow-400 ring-opacity-75' : ''}
              `}
              style={{
                backgroundColor: cell ? getTypeColor(cell.type) : undefined,
                minHeight: '40px'
              }}
              onClick={() => handleCellClick(x, y)}
              onMouseEnter={() => handleCellHover(x, y)}
              onMouseLeave={handleCellLeave}
              onDragOver={(e) => handleDragOver(e, x, y)}
              onDrop={(e) => handleDrop(e, x, y)}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectPiece) {
                  onSelectPiece(cell);
                }
              }}
            >
              {cell && !isDraggedPieceCell(x, y) && (
                <div 
                  className="text-center w-full h-full flex flex-col justify-center cursor-move"
                  onMouseEnter={(e) => handlePieceHover(cell, e)}
                  onMouseLeave={handlePieceLeave}
                  draggable={isInteractive}
                  onDragStart={(e) => handleDragStart(e, cell)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="text-xs leading-tight">{cell.name.split(' ')[0]}</div>
                  <div className="text-xs opacity-80">
                    {cell.stats.attack}/{cell.stats.health}
                  </div>
                </div>
              )}
              {(isPreviewCell(x, y) || isDragPreviewCell(x, y)) && !cell && (
                <div className="text-center text-gray-600">
                  <div className="text-xs leading-tight opacity-70">
                    {(selectedPiece || currentDraggedPiece)?.name.split(' ')[0]}
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