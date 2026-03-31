import type { PublicGameState } from '../types';

interface Props {
  gs: PublicGameState;
}

export default function QuoteDisplay({ gs }: Props) {
  const quote = gs.currentQuote;

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-slate-400">
          {gs.phase === 'quoting' ? '报价中' : '成交窗口'}
        </h3>
        <span className="text-sm text-white font-medium">{gs.currentQuoterName}</span>
      </div>

      {quote ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Bid */}
          <div
            className={`rounded-xl p-4 text-center border ${
              quote.bidFilled
                ? 'bg-rose-500/10 border-rose-500/30'
                : 'bg-slate-700/50 border-slate-600'
            }`}
          >
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Bid (买价)</p>
            <p className="text-2xl font-bold text-rose-400 font-mono">{quote.bid.toFixed(2)}</p>
            {quote.bidFilled && (
              <p className="text-xs text-rose-300 mt-1">已成交 · {quote.bidTakerName}</p>
            )}
          </div>

          {/* Ask */}
          <div
            className={`rounded-xl p-4 text-center border ${
              quote.askFilled
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-slate-700/50 border-slate-600'
            }`}
          >
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Ask (卖价)</p>
            <p className="text-2xl font-bold text-emerald-400 font-mono">
              {quote.ask.toFixed(2)}
            </p>
            {quote.askFilled && (
              <p className="text-xs text-emerald-300 mt-1">已成交 · {quote.askTakerName}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">等待报价...</div>
      )}

      {quote && (
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
          <span>价差: {quote.spread.toFixed(2)}</span>
          <span>中间价: {((quote.bid + quote.ask) / 2).toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
