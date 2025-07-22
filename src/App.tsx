import React from 'react';
import { useGame } from './hooks/useGame';
import { GamePhase } from './components/GamePhase';
import { Fish, Waves } from 'lucide-react';

function App() {
  const {
    gameState,
    purchasePiece,
    placePiece,
    movePiece,
    rerollShop,
    startBattle,
    completeBattle,
    selectPiece
  } = useGame();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-cyan-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Fish className="text-cyan-600" size={32} />
                <Waves className="absolute -bottom-1 -right-1 text-blue-400" size={16} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Aquarium Autobattler
                </h1>
                <p className="text-sm text-gray-600">Build • Battle • Breed</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full font-bold">
                <span>💰</span>
                <span>{gameState.gold}g</span>
                {gameState.lossStreak > 0 && (
                  <span className="text-red-200 text-xs ml-1">
                    (L{gameState.lossStreak})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-red-400 to-pink-400 text-white px-3 py-1 rounded-full font-bold">
                <span>🤖</span>
                <span>{gameState.opponentGold}g</span>
                {gameState.opponentLossStreak > 0 && (
                  <span className="text-red-200 text-xs ml-1">
                    (L{gameState.opponentLossStreak})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-green-400 to-emerald-400 text-white px-3 py-1 rounded-full font-bold">
                <span>📊</span>
                <span>{gameState.wins}W-{gameState.losses}L-0D</span>
                {gameState.wins + gameState.losses > 0 && (
                  <span className="text-green-100 text-xs ml-1">
                    ({Math.round((gameState.wins / (gameState.wins + gameState.losses)) * 100)}%)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-purple-400 to-pink-400 text-white px-3 py-1 rounded-full font-bold">
                <span>🏆</span>
                <span>Round {gameState.round}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="container mx-auto px-4 py-6">
        <GamePhase
          gameState={gameState}
          onPurchasePiece={purchasePiece}
          onPlacePiece={placePiece}
          onMovePiece={movePiece}
          onRerollShop={rerollShop}
          onStartBattle={startBattle}
          onCompleteBattle={completeBattle}
          onSelectPiece={selectPiece}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>Build your dream aquarium and dominate the competition!</p>
            <div className="flex items-center gap-4">
              <span className="text-xs">Phase: <strong className="capitalize">{gameState.phase}</strong></span>
              <span className="text-xs">Tank Health: <strong>{gameState.playerTank.waterQuality}/10</strong></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;