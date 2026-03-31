import type { PlayerState } from '../types';

interface Props {
  players: PlayerState[];
  userId: string;
}

export default function Leaderboard({ players, userId }: Props) {
  const sorted = [...players].sort((a, b) => b.cash - a.cash);

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">排行榜</h3>
      <div className="space-y-1.5">
        {sorted.map((p, i) => (
          <div
            key={p.userId}
            className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
              p.userId === userId ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-slate-600 text-slate-400'
                }`}
              >
                {i + 1}
              </span>
              <span className="text-white truncate max-w-[80px]">{p.username}</span>
              {!p.isConnected && <span className="w-1.5 h-1.5 rounded-full bg-slate-500" title="离线" />}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400 font-mono">
                {p.netPosition > 0 ? '+' : ''}
                {p.netPosition}
              </span>
              <span
                className={`font-mono font-medium ${
                  p.cash > 0
                    ? 'text-emerald-400'
                    : p.cash < 0
                      ? 'text-rose-400'
                      : 'text-slate-300'
                }`}
              >
                {p.cash >= 0 ? '+' : ''}
                {p.cash.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
