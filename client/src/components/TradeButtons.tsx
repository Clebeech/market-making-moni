import { useState } from 'react';
import { connectSocket } from '../services/socket';
import type { Quote } from '../types';

interface Props {
  quote: Quote;
  myPosition: number;
  maxPosition: number;
}

export default function TradeButtons({ quote, myPosition, maxPosition }: Props) {
  const [submitting, setSubmitting] = useState<'buy' | 'sell' | null>(null);

  const canBuy = !quote.askFilled && myPosition < maxPosition;
  const canSell = !quote.bidFilled && myPosition > -maxPosition;

  const handleTrade = (side: 'buy' | 'sell') => {
    if (submitting) return;
    setSubmitting(side);
    const socket = connectSocket();
    socket.emit('trade:execute', { side });
    setTimeout(() => setSubmitting(null), 1000);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <h3 className="text-sm text-slate-400 mb-3">选择操作</h3>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleTrade('buy')}
          disabled={!canBuy || submitting === 'buy'}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-xl py-4 transition-colors"
        >
          <div className="text-xs opacity-80 mb-0.5">买入 @ Ask</div>
          <div className="text-xl font-bold font-mono">{quote.ask.toFixed(2)}</div>
          {quote.askFilled && <div className="text-xs mt-1 opacity-70">已被成交</div>}
        </button>
        <button
          onClick={() => handleTrade('sell')}
          disabled={!canSell || submitting === 'sell'}
          className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-xl py-4 transition-colors"
        >
          <div className="text-xs opacity-80 mb-0.5">卖出 @ Bid</div>
          <div className="text-xl font-bold font-mono">{quote.bid.toFixed(2)}</div>
          {quote.bidFilled && <div className="text-xs mt-1 opacity-70">已被成交</div>}
        </button>
      </div>
    </div>
  );
}
