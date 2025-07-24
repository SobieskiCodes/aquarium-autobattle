import React from 'react';
import { TankAnalysis } from '../utils/tankAnalysis';

interface TankSummaryProps {
  analysis: TankAnalysis;
  waterQuality: number;
  showDetailed?: boolean;
  className?: string;
}

export const TankSummary: React.FC<TankSummaryProps> = ({
  analysis,
  waterQuality,
  showDetailed = true,
  className = ""
}) => {
  return (
    <div className={`p-3 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200 relative group ${className}`}>
      <h3 className="font-bold text-gray-900 mb-2 text-sm">Tank Summary</h3>
      <div className="grid grid-cols-3 gap-3 text-sm relative">
        <div className="text-center">
          <div className="text-xl font-bold text-red-600 cursor-help flex items-center justify-center gap-1">
            <span>{analysis.baseAttack}</span>
            {analysis.bonusAttack > 0 && <span className="text-green-500">(+{analysis.bonusAttack})</span>}
          </div>
          <div className="text-gray-600 text-xs">Total Attack</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-green-600 cursor-help flex items-center justify-center gap-1">
            <span>{analysis.baseHealth}</span>
            {analysis.bonusHealth > 0 && <span className="text-green-500">(+{analysis.bonusHealth})</span>}
          </div>
          <div className="text-gray-600 text-xs">Tank Health</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-600 cursor-help flex items-center justify-center gap-1">
            <span>{analysis.baseAverageSpeed}</span>
            {analysis.bonusAverageSpeed > 0 && <span className="text-green-500">(+{analysis.bonusAverageSpeed})</span>}
          </div>
          <div className="text-gray-600 text-xs">Avg Speed</div>
        </div>
      </div>
      
      {showDetailed && (
        <>
          {/* Detailed breakdown tooltip */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 text-white p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
            <div className="text-sm font-bold mb-2">Detailed Breakdown:</div>
            <div className="space-y-1 text-xs">
              {analysis.pieceBreakdown.map(({ piece, originalStats, bonuses }) => (
                <div key={piece.id} className="flex justify-between">
                  <span>{piece.name}:</span>
                  <span>
                    <span className="text-red-400">{piece.stats.attack}</span>
                    {bonuses.attack > 0 && <span className="text-green-400"> (+{bonuses.attack})</span>}
                    {' / '}
                    <span className="text-green-400">{piece.stats.health}</span>
                    {bonuses.health > 0 && <span className="text-green-400"> (+{bonuses.health})</span>}
                    {' / '}
                    <span className="text-blue-400">{piece.stats.speed}</span>
                    {bonuses.speed > 0 && <span className="text-cyan-400"> (+{bonuses.speed})</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Total Pieces: {analysis.totalPieces} | Fish: {analysis.fishCount}</span>
              <span>Water Quality: {waterQuality}/10</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};