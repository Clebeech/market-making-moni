import { useState, useEffect } from 'react';

interface Props {
  deadline: number | null;
  type: 'quote' | 'trade' | null;
}

export default function Timer({ deadline, type }: Props) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!deadline) {
      setRemaining(0);
      return;
    }

    const update = () => {
      const diff = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(diff);
    };

    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!type || !deadline) return null;

  const isUrgent = remaining <= 5;
  const label = type === 'quote' ? '报价' : '成交';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono ${
        isUrgent
          ? 'bg-rose-500/20 text-rose-400 animate-pulse'
          : 'bg-slate-700 text-slate-300'
      }`}
    >
      <span className="text-xs text-slate-400">{label}</span>
      <span className="font-semibold tabular-nums">{remaining}s</span>
    </div>
  );
}
