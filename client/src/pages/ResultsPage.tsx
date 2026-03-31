import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { disconnectSocket } from '../services/socket';

export default function ResultsPage() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);
  const { results, revealedValue, reset } = useGameStore();

  const handleBack = () => {
    disconnectSocket();
    reset();
    navigate('/');
  };

  if (!results || revealedValue === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">暂无结算数据</p>
          <button onClick={handleBack} className="text-blue-400 hover:text-blue-300">
            返回大厅
          </button>
        </div>
      </div>
    );
  }

  const maxPnl = Math.max(...results.map((r) => Math.abs(r.finalPnl)), 1);

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Value reveal */}
        <div className="text-center mb-8">
          <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">真实值</p>
          <p className="text-5xl font-bold text-white">{revealedValue}</p>
        </div>

        {/* Trophy for winner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-5 py-2">
            <span className="text-2xl">🏆</span>
            <span className="text-amber-400 font-semibold">{results[0]?.username}</span>
            <span className="text-amber-300 text-sm">+{results[0]?.finalPnl.toFixed(2)}</span>
          </div>
        </div>

        {/* Ranking table */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-700/50 text-xs text-slate-400 uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-3">玩家</div>
            <div className="col-span-2 text-right">净仓位</div>
            <div className="col-span-3 text-right">现金</div>
            <div className="col-span-3 text-right">最终 PnL</div>
          </div>
          {results.map((r, i) => (
            <div
              key={r.userId}
              className={`grid grid-cols-12 gap-2 px-4 py-3 border-t border-slate-700/50 items-center ${
                r.userId === userId ? 'bg-blue-500/5' : ''
              }`}
            >
              <div className="col-span-1">
                <span
                  className={`text-sm font-bold ${
                    i === 0
                      ? 'text-amber-400'
                      : i === 1
                        ? 'text-slate-300'
                        : i === 2
                          ? 'text-orange-400'
                          : 'text-slate-500'
                  }`}
                >
                  {r.rank}
                </span>
              </div>
              <div className="col-span-3">
                <span className="text-white text-sm">{r.username}</span>
                {r.userId === userId && (
                  <span className="text-blue-400 text-xs ml-1">(你)</span>
                )}
              </div>
              <div className="col-span-2 text-right text-sm text-slate-300 font-mono">
                {r.netPosition > 0 ? '+' : ''}
                {r.netPosition}
              </div>
              <div className="col-span-3 text-right text-sm text-slate-300 font-mono">
                {r.cash >= 0 ? '+' : ''}
                {r.cash.toFixed(2)}
              </div>
              <div className="col-span-3 text-right">
                <span
                  className={`text-sm font-semibold font-mono ${
                    r.finalPnl > 0
                      ? 'text-emerald-400'
                      : r.finalPnl < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                  }`}
                >
                  {r.finalPnl > 0 ? '+' : ''}
                  {r.finalPnl.toFixed(2)}
                </span>
                {/* PnL bar */}
                <div className="mt-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      r.finalPnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${(Math.abs(r.finalPnl) / maxPnl) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={handleBack}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg px-8 py-2.5 transition-colors"
          >
            返回大厅
          </button>
        </div>
      </div>
    </div>
  );
}
