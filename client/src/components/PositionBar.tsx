import type { PlayerState } from '../types';

interface Props {
  player: PlayerState;
  maxPosition: number;
}

export default function PositionBar({ player, maxPosition }: Props) {
  const pos = player.netPosition;
  const pct = (pos / maxPosition) * 50 + 50;

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-3">我的仓位</h3>

      {/* Position bar */}
      <div className="relative h-6 bg-slate-700 rounded-full overflow-hidden mb-2">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-500 z-10" />
        {/* Position indicator */}
        <div
          className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-300"
          style={{
            left: pos >= 0 ? '50%' : `${pct}%`,
            width: `${Math.abs(pos / maxPosition) * 50}%`,
            backgroundColor: pos >= 0 ? '#10b981' : '#f43f5e',
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <span>-{maxPosition}</span>
        <span>0</span>
        <span>+{maxPosition}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-700/50 rounded-lg px-3 py-2">
          <p className="text-xs text-slate-400">净仓位</p>
          <p
            className={`text-lg font-bold font-mono ${
              pos > 0
                ? 'text-emerald-400'
                : pos < 0
                  ? 'text-rose-400'
                  : 'text-slate-300'
            }`}
          >
            {pos > 0 ? '+' : ''}
            {pos}
          </p>
        </div>
        <div className="bg-slate-700/50 rounded-lg px-3 py-2">
          <p className="text-xs text-slate-400">现金</p>
          <p
            className={`text-lg font-bold font-mono ${
              player.cash > 0
                ? 'text-emerald-400'
                : player.cash < 0
                  ? 'text-rose-400'
                  : 'text-slate-300'
            }`}
          >
            {player.cash >= 0 ? '+' : ''}
            {player.cash.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
