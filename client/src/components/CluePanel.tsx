import type { Clue } from '../types';

interface Props {
  clues: Clue[];
}

export default function CluePanel({ clues }: Props) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">信息 / 线索</h3>
      {clues.length === 0 ? (
        <p className="text-slate-500 text-sm">暂无线索</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {clues.map((c, i) => (
            <div
              key={i}
              className="bg-slate-700/50 rounded-lg px-3 py-2 border-l-2 border-amber-500"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-amber-400 font-medium">第 {c.round} 轮</span>
              </div>
              <p className="text-sm text-slate-200">{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
