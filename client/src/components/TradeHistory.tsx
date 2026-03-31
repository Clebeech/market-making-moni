import type { Trade } from '../types';

interface Props {
  trades: Trade[];
  userId: string;
}

export default function TradeHistory({ trades, userId }: Props) {
  const myTrades = trades.filter((t) => t.buyerId === userId || t.sellerId === userId);

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">交易记录</h3>
      {myTrades.length === 0 ? (
        <p className="text-slate-500 text-sm">暂无交易</p>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {[...myTrades].reverse().map((t) => {
            const isBuyer = t.buyerId === userId;
            return (
              <div
                key={t.id}
                className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-1.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      isBuyer
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {isBuyer ? '买入' : '卖出'}
                  </span>
                  <span className="text-slate-400 text-xs">R{t.round}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono">{t.price.toFixed(2)}</span>
                  <span className="text-slate-500 text-xs">
                    vs {isBuyer ? t.sellerName : t.buyerName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
