import React, { useState } from 'react';
import { GoldTransaction } from '../types/game';
import { DollarSign, TrendingUp, TrendingDown, Eye, X, Coins, ShoppingCart, RefreshCw, Trophy, Zap, Calendar } from 'lucide-react';

interface GoldTrackerProps {
  goldHistory: GoldTransaction[];
  currentGold: number;
  currentRound: number;
}

export const GoldTracker: React.FC<GoldTrackerProps> = ({
  goldHistory,
  currentGold,
  currentRound
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  // Calculate totals
  const calculateTotals = () => {
    const totals = {
      totalSpent: 0,
      totalEarned: 0,
      purchases: 0,
      sales: 0,
      rerolls: 0,
      battleRewards: 0,
      interest: 0,
      lossStreakBonus: 0
    };

    goldHistory.forEach(transaction => {
      if (transaction.amount > 0) {
        totals.totalEarned += transaction.amount;
        switch (transaction.type) {
          case 'sell':
            totals.sales += transaction.amount;
            break;
          case 'battle_reward':
            totals.battleRewards += transaction.amount;
            break;
          case 'interest':
            totals.interest += transaction.amount;
            break;
          case 'loss_streak_bonus':
            totals.lossStreakBonus += transaction.amount;
            break;
        }
      } else if (transaction.amount < 0) {
        totals.totalSpent += Math.abs(transaction.amount);
        switch (transaction.type) {
          case 'purchase':
            totals.purchases += Math.abs(transaction.amount);
            break;
          case 'reroll':
            totals.rerolls += Math.abs(transaction.amount);
            break;
        }
      }
    });

    return totals;
  };

  const totals = calculateTotals();
  const netGold = totals.totalEarned - totals.totalSpent;

  // Get transactions for selected round or all
  const filteredTransactions = selectedRound 
    ? goldHistory.filter(t => t.round === selectedRound)
    : goldHistory;

  // Get unique rounds
  const rounds = Array.from(new Set(goldHistory.map(t => t.round))).sort((a, b) => b - a);

  const getTransactionIcon = (type: GoldTransaction['type']) => {
    switch (type) {
      case 'purchase': return <ShoppingCart size={14} className="text-red-500" />;
      case 'sell': return <DollarSign size={14} className="text-green-500" />;
      case 'reroll': return <RefreshCw size={14} className="text-blue-500" />;
      case 'battle_reward': return <Trophy size={14} className="text-yellow-500" />;
      case 'interest': return <TrendingUp size={14} className="text-purple-500" />;
      case 'loss_streak_bonus': return <Zap size={14} className="text-orange-500" />;
      case 'round_start': return <Calendar size={14} className="text-gray-500" />;
      default: return <Coins size={14} className="text-gray-500" />;
    }
  };

  const calculateInterest = (gold: number) => {
    return Math.min(Math.floor(gold / 10), 5);
  };

  const nextInterest = calculateInterest(currentGold);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-2 rounded-lg font-bold hover:from-yellow-500 hover:to-orange-500 transition-all shadow-md"
        title="View detailed gold breakdown"
      >
        <Eye size={16} />
        <span>Gold Tracker</span>
        {nextInterest > 0 && (
          <span className="text-xs bg-white/20 px-1 rounded">
            +{nextInterest} next
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Coins size={24} />
                Gold Tracker
              </h2>
              <p className="text-sm opacity-90">Complete financial breakdown</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="text-green-600" size={20} />
                <span className="font-bold text-gray-900">Current Gold</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{currentGold}g</div>
              {nextInterest > 0 && (
                <div className="text-sm text-green-700 mt-1">
                  Next interest: +{nextInterest}g
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-blue-600" size={20} />
                <span className="font-bold text-gray-900">Total Earned</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{totals.totalEarned}g</div>
              <div className="text-sm text-blue-700">
                Including {totals.interest}g interest
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="text-red-600" size={20} />
                <span className="font-bold text-gray-900">Total Spent</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{totals.totalSpent}g</div>
              <div className="text-sm text-red-700">
                Net: {netGold >= 0 ? '+' : ''}{netGold}g
              </div>
            </div>
          </div>

          {/* Breakdown by Category */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart size={16} className="text-red-500" />
                <span className="text-sm font-medium">Purchases</span>
              </div>
              <div className="text-lg font-bold text-red-600">{totals.purchases}g</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className="text-green-500" />
                <span className="text-sm font-medium">Sales</span>
              </div>
              <div className="text-lg font-bold text-green-600">{totals.sales}g</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw size={16} className="text-blue-500" />
                <span className="text-sm font-medium">Rerolls</span>
              </div>
              <div className="text-lg font-bold text-blue-600">{totals.rerolls}g</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={16} className="text-yellow-500" />
                <span className="text-sm font-medium">Battle Rewards</span>
              </div>
              <div className="text-lg font-bold text-yellow-600">{totals.battleRewards}g</div>
            </div>
          </div>

          {/* Interest Explanation */}
          <div className="bg-purple-100 border border-purple-300 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-purple-600" size={20} />
              <span className="font-bold text-purple-800">Interest System</span>
            </div>
            <div className="text-sm text-purple-900">
              <p className="mb-2">
                Earn 1 gold interest for every 10 gold you have at the end of a battle (max 5 per round).
              </p>
              <div className="grid grid-cols-6 gap-2 text-xs text-purple-900">
                {[10, 20, 30, 40, 50].map((threshold, index) => (
                  <div key={threshold} className="text-center">
                    <div className="font-bold">{threshold}g</div>
                    <div className="text-purple-700 font-semibold">+{index + 1}</div>
                  </div>
                ))}
                <div className="text-center">
                  <div className="font-bold">50+g</div>
                  <div className="text-purple-700 font-semibold">+5 max</div>
                </div>
              </div>
              <p className="mt-2 text-xs text-purple-800 font-medium">
                Current gold: {currentGold}g → Next interest: +{nextInterest}g
              </p>
            </div>
          </div>

          {/* Round Filter */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-gray-700">Filter by round:</span>
            <button
              onClick={() => setSelectedRound(null)}
              className={`px-3 py-1 rounded text-sm ${
                selectedRound === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Rounds
            </button>
            {rounds.map(round => (
              <button
                key={round}
                onClick={() => setSelectedRound(round)}
                className={`px-3 py-1 rounded text-sm ${
                  selectedRound === round
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Round {round}
              </button>
            ))}
          </div>

          {/* Transaction History */}
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3">
              Transaction History
              {selectedRound && ` - Round ${selectedRound}`}
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTransactions.slice().reverse().map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between bg-white p-3 rounded border shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <div className="font-medium text-sm text-gray-900">{transaction.description}</div>
                      <div className="text-xs text-gray-600">
                        Round {transaction.round} • {new Date(transaction.timestamp).toLocaleTimeString()}
                        {transaction.pieceName && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {transaction.pieceName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`font-bold ${
                    transaction.amount > 0 ? 'text-green-600' : 
                    transaction.amount < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}g
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <div className="text-center text-gray-600 py-8 font-medium">
                  No transactions found
                  {selectedRound && ` for round ${selectedRound}`}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};