import React from 'react';
import { TankAnalysis } from '../utils/tankAnalysis';
import { Sword, Heart, Zap } from 'lucide-react';

interface TankSummaryProps {
  analysis: TankAnalysis;
  waterQuality: number;
  className?: string;
}

export const TankSummary: React.FC<TankSummaryProps> = ({ 
  analysis, 
  waterQuality, 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Tank Summary</h3>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Sword className="w-4 h-4 text-red-500 mr-1" />
            <span className="text-2xl font-bold text-red-600">
              {analysis.totalAttack}
            </span>
            {analysis.bonusTotalAttack > 0 && (
              <span className="text-sm text-green-600 ml-1">
                (+{analysis.bonusTotalAttack})
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">Total Attack</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Heart className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-2xl font-bold text-green-600">
              {analysis.totalHealth}
            </span>
            {analysis.bonusTotalHealth > 0 && (
              <span className="text-sm text-green-600 ml-1">
                (+{analysis.bonusTotalHealth})
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">Tank Health</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Zap className="w-4 h-4 text-yellow-500 mr-1" />
            <span className="text-2xl font-bold text-yellow-600">
              {analysis.averageSpeed}
            </span>
          </div>
          <div className="text-xs text-gray-500">Avg Speed</div>
        </div>
      </div>
      
      <div className="text-sm text-gray-600 mb-3">
        <span className="font-medium">Total Pieces:</span> {analysis.totalPieces} | {' '}
        <span className="font-medium">Fish:</span> {analysis.fishCount}
      </div>
      
      <div className="text-sm">
        <span className="font-medium text-blue-600">Water Quality:</span>{' '}
        <span className={`font-bold ${
          waterQuality >= 8 ? 'text-green-600' : 
          waterQuality >= 6 ? 'text-yellow-600' : 
          waterQuality >= 4 ? 'text-orange-600' : 'text-red-600'
        }`}>
          {waterQuality}/10
        </span>
      </div>
      
      {analysis.enhancedPieces.length > 0 && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
          <div className="font-medium text-gray-700 mb-1">Detailed Breakdown:</div>
          {analysis.enhancedPieces.map((piece, index) => (
            <div key={index} className="text-gray-600">
              <span className="font-medium">{piece.name}:</span>{' '}
              <span className="text-red-600">{piece.stats.attack} (+{piece.stats.attack - piece.originalStats.attack})</span> /{' '}
              <span className="text-green-600">{piece.stats.health} (+{piece.stats.health - piece.originalStats.health})</span> /{' '}
              <span className="text-yellow-600">{piece.stats.speed} (+{piece.stats.speed - piece.originalStats.speed})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};