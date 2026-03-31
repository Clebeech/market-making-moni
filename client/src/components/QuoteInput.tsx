import { useState } from 'react';
import { connectSocket } from '../services/socket';

interface Props {
  allowedSpread: number;
  maxSpreadPct: number;
  tickSize: number;
}

export default function QuoteInput({ allowedSpread, maxSpreadPct, tickSize }: Props) {
  const [bid, setBid] = useState('');
  const [ask, setAsk] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const bidNum = parseFloat(bid);
  const askNum = parseFloat(ask);
  const isValid =
    !isNaN(bidNum) && !isNaN(askNum) && bidNum < askNum && bidNum > 0 && askNum > 0;
  const spread = isValid ? askNum - bidNum : 0;

  let spreadHint = '';
  if (allowedSpread > 0) {
    spreadHint = `≤ ${allowedSpread.toFixed(2)}`;
  } else {
    spreadHint = `≤ mid × ${(maxSpreadPct * 100).toFixed(0)}%`;
  }

  const handleSubmit = () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    const socket = connectSocket();
    socket.emit('quote:submit', { bid: bidNum, ask: askNum });
    setTimeout(() => setSubmitting(false), 1000);
  };

  const adjustToTick = (val: string, direction: 'up' | 'down'): string => {
    const n = parseFloat(val);
    if (isNaN(n)) return val;
    const adjusted = direction === 'up' ? n + tickSize : n - tickSize;
    return Math.max(0, adjusted).toFixed(2);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-blue-500/30 ring-1 ring-blue-500/20">
      <h3 className="text-sm font-medium text-blue-400 mb-4">轮到你报价</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Bid (买价)</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setBid(adjustToTick(bid, 'down'))}
              className="bg-slate-700 hover:bg-slate-600 text-white rounded px-2 py-2 text-sm"
            >
              −
            </button>
            <input
              type="number"
              value={bid}
              onChange={(e) => setBid(e.target.value)}
              step={tickSize}
              placeholder="0.00"
              className="flex-1 min-w-0 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white font-mono text-center focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              onClick={() => setBid(adjustToTick(bid, 'up'))}
              className="bg-slate-700 hover:bg-slate-600 text-white rounded px-2 py-2 text-sm"
            >
              +
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Ask (卖价)</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAsk(adjustToTick(ask, 'down'))}
              className="bg-slate-700 hover:bg-slate-600 text-white rounded px-2 py-2 text-sm"
            >
              −
            </button>
            <input
              type="number"
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              step={tickSize}
              placeholder="0.00"
              className="flex-1 min-w-0 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white font-mono text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={() => setAsk(adjustToTick(ask, 'up'))}
              className="bg-slate-700 hover:bg-slate-600 text-white rounded px-2 py-2 text-sm"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
        <span>
          价差: <span className={isValid && spread > 0 ? 'text-white' : ''}>{spread.toFixed(2)}</span>
        </span>
        <span>限制: {spreadHint}</span>
        <span>Tick: {tickSize}</span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg py-3 transition-colors text-sm"
      >
        {submitting ? '提交中...' : '提交报价'}
      </button>
    </div>
  );
}
