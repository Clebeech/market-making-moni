import { randomUUID } from 'crypto';
import type {
  GameConfig,
  PlayerState,
  Quote,
  Trade,
  Clue,
  GamePhase,
  GameResult,
  PublicGameState,
} from './types.js';

function isMultipleOf(value: number, unit: number): boolean {
  const remainder = Math.abs(value % unit);
  return remainder < 1e-9 || Math.abs(remainder - unit) < 1e-9;
}

export type GameEvent =
  | { type: 'game:start' }
  | { type: 'round:pending'; round: number }
  | { type: 'round:clue'; clue: Clue }
  | { type: 'turn:start'; quoterId: string; quoterName: string }
  | { type: 'player:skipped'; userId: string; reason: string }
  | { type: 'quote:submitted'; quote: Quote }
  | { type: 'trade:window:open'; quote: Quote }
  | { type: 'trade:executed'; trade: Trade }
  | { type: 'trade:window:close'; quoteId: string; wasFilled: boolean }
  | { type: 'turn:timeout'; quoterId: string }
  | { type: 'state:update'; state: PublicGameState }
  | { type: 'game:end'; value: number; results: GameResult[] };

export class GameEngine {
  private roomId: string;
  private config: GameConfig;
  private players: PlayerState[];
  private phase: GamePhase = 'waiting';
  private currentRound = 0;
  private currentTurnIndex = 0;
  private turnOrder: string[] = [];
  private currentQuote: Quote | null = null;
  private currentAllowedSpread = -1;
  private lastQuoteSpread = -1;
  private lastQuoteFilled = false;
  private quotes: Quote[] = [];
  private trades: Trade[] = [];
  private clues: Clue[] = [];
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private deadline: number | null = null;
  private timerType: 'quote' | 'trade' | null = null;

  private emit: (event: GameEvent) => void;

  constructor(
    roomId: string,
    config: GameConfig,
    players: PlayerState[],
    onEvent: (event: GameEvent) => void,
  ) {
    this.roomId = roomId;
    this.config = config;
    this.players = players;
    this.emit = onEvent;
  }

  start() {
    this.phase = 'waiting';
    this.currentRound = 0;
    this.emit({ type: 'game:start' });
    this.prepareNextRound();
  }

  /** Admin triggers the start of the pending round */
  startRound() {
    if (this.phase !== 'round_pending') return;
    this.currentTurnIndex = 0;
    this.currentAllowedSpread = -1;
    this.lastQuoteSpread = -1;
    this.lastQuoteFilled = false;
    this.nextTurn();
  }

  addClue(content: string) {
    const clue: Clue = {
      round: this.currentRound,
      content,
      timestamp: Date.now(),
    };
    this.clues.push(clue);
    this.emit({ type: 'round:clue', clue });
    this.broadcastState();
  }

  submitQuote(
    playerId: string,
    bid: number,
    ask: number,
  ): { success: boolean; error?: string } {
    if (this.phase !== 'quoting') {
      return { success: false, error: '当前不在报价阶段' };
    }
    const expectedQuoterId = this.turnOrder[this.currentTurnIndex];
    if (playerId !== expectedQuoterId) {
      return { success: false, error: '还没轮到你报价' };
    }

    const { tickSize, maxSpreadPct } = this.config;

    if (!isMultipleOf(bid, tickSize) || !isMultipleOf(ask, tickSize)) {
      return { success: false, error: `价格必须是 ${tickSize} 的整数倍` };
    }
    if (bid >= ask) {
      return { success: false, error: 'Bid 必须小于 Ask' };
    }

    const spread = +(ask - bid).toFixed(10);
    const mid = (ask + bid) / 2;

    if (this.currentAllowedSpread < 0) {
      const maxAbsSpread = mid * maxSpreadPct;
      if (spread > maxAbsSpread + 1e-9) {
        return {
          success: false,
          error: `价差 ${spread.toFixed(2)} 超过上限 ${maxAbsSpread.toFixed(2)}（mid 的 ${(maxSpreadPct * 100).toFixed(0)}%）`,
        };
      }
    } else {
      if (spread > this.currentAllowedSpread + 1e-9) {
        return {
          success: false,
          error: `价差 ${spread.toFixed(2)} 超过当前允许价差 ${this.currentAllowedSpread.toFixed(2)}`,
        };
      }
    }

    this.clearTimer('quote');

    const quoter = this.getPlayer(playerId);
    const quote: Quote = {
      id: randomUUID(),
      round: this.currentRound,
      turn: this.currentTurnIndex,
      quoterId: playerId,
      quoterName: quoter.username,
      bid,
      ask,
      spread,
      bidFilled: false,
      askFilled: false,
      timestamp: Date.now(),
    };

    this.currentQuote = quote;
    this.quotes.push(quote);

    this.emit({ type: 'quote:submitted', quote });

    this.phase = 'trading';
    this.emit({ type: 'trade:window:open', quote });
    this.startTimer('trade', this.config.tradeTimeout * 1000, () => {
      this.handleTradeTimeout();
    });
    this.broadcastState();

    return { success: true };
  }

  executeTrade(
    takerId: string,
    side: 'buy' | 'sell',
  ): { success: boolean; error?: string } {
    if (this.phase !== 'trading') {
      return { success: false, error: '当前不在成交阶段' };
    }
    const quote = this.currentQuote;
    if (!quote) return { success: false, error: '没有当前报价' };

    if (takerId === quote.quoterId) {
      return { success: false, error: '不能与自己的报价成交' };
    }

    const taker = this.getPlayer(takerId);
    const quoter = this.getPlayer(quote.quoterId);
    const { maxPosition } = this.config;

    if (side === 'buy') {
      if (quote.askFilled) {
        return { success: false, error: 'Ask 侧已被成交' };
      }
      if (taker.netPosition >= maxPosition) {
        return { success: false, error: '已达最大多头持仓' };
      }
      if (quoter.netPosition <= -maxPosition) {
        return { success: false, error: '报价方已达最大空头持仓' };
      }

      quote.askFilled = true;
      quote.askTakerId = takerId;
      quote.askTakerName = taker.username;

      const price = quote.ask;
      taker.netPosition += 1;
      taker.cash -= price;
      quoter.netPosition -= 1;
      quoter.cash += price;

      const trade: Trade = {
        id: randomUUID(),
        quoteId: quote.id,
        round: this.currentRound,
        buyerId: takerId,
        buyerName: taker.username,
        sellerId: quote.quoterId,
        sellerName: quoter.username,
        price,
        side: 'ask',
        timestamp: Date.now(),
      };
      this.trades.push(trade);
      this.emit({ type: 'trade:executed', trade });
    } else {
      if (quote.bidFilled) {
        return { success: false, error: 'Bid 侧已被成交' };
      }
      if (taker.netPosition <= -maxPosition) {
        return { success: false, error: '已达最大空头持仓' };
      }
      if (quoter.netPosition >= maxPosition) {
        return { success: false, error: '报价方已达最大多头持仓' };
      }

      quote.bidFilled = true;
      quote.bidTakerId = takerId;
      quote.bidTakerName = taker.username;

      const price = quote.bid;
      taker.netPosition -= 1;
      taker.cash += price;
      quoter.netPosition += 1;
      quoter.cash -= price;

      const trade: Trade = {
        id: randomUUID(),
        quoteId: quote.id,
        round: this.currentRound,
        buyerId: quote.quoterId,
        buyerName: quoter.username,
        sellerId: takerId,
        sellerName: taker.username,
        price,
        side: 'bid',
        timestamp: Date.now(),
      };
      this.trades.push(trade);
      this.emit({ type: 'trade:executed', trade });
    }

    this.broadcastState();

    if (quote.bidFilled && quote.askFilled) {
      this.clearTimer('trade');
      this.handleTradeComplete();
    }

    return { success: true };
  }

  getPublicState(): PublicGameState {
    const quoterId = this.turnOrder[this.currentTurnIndex] ?? null;
    const quoter = quoterId ? this.players.find((p) => p.userId === quoterId) : null;
    return {
      phase: this.phase,
      currentRound: this.currentRound,
      totalRounds: this.config.totalRounds,
      currentQuoterId: quoterId,
      currentQuoterName: quoter?.username ?? null,
      currentQuote: this.currentQuote,
      allowedSpread: this.currentAllowedSpread,
      maxSpreadPct: this.config.maxSpreadPct,
      turnOrder: this.turnOrder.map((uid) => {
        const p = this.players.find((pp) => pp.userId === uid)!;
        return { userId: uid, username: p.username };
      }),
      currentTurnIndex: this.currentTurnIndex,
      players: this.players,
      quotes: this.quotes,
      trades: this.trades,
      clues: this.clues,
      deadline: this.deadline,
      timerType: this.timerType,
    };
  }

  getConfig(): GameConfig {
    return this.config;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  disconnectPlayer(userId: string) {
    const p = this.players.find((pp) => pp.userId === userId);
    if (p) p.isConnected = false;
    this.broadcastState();
  }

  reconnectPlayer(userId: string) {
    const p = this.players.find((pp) => pp.userId === userId);
    if (p) p.isConnected = true;
    this.broadcastState();
  }

  destroy() {
    this.clearAllTimers();
  }

  // ──────── Private ────────

  private prepareNextRound() {
    this.currentRound++;
    if (this.currentRound > this.config.totalRounds) {
      this.finish();
      return;
    }

    const offset = (this.currentRound - 1) % this.players.length;
    const ids = this.players.map((p) => p.userId);
    this.turnOrder = [...ids.slice(offset), ...ids.slice(0, offset)];

    this.phase = 'round_pending';
    this.emit({ type: 'round:pending', round: this.currentRound });
    this.broadcastState();
  }

  private nextTurn() {
    while (this.currentTurnIndex < this.turnOrder.length) {
      const uid = this.turnOrder[this.currentTurnIndex];
      const player = this.getPlayer(uid);
      if (Math.abs(player.netPosition) >= this.config.maxPosition) {
        this.emit({ type: 'player:skipped', userId: uid, reason: 'max_position' });
        this.currentTurnIndex++;
        continue;
      }
      break;
    }

    if (this.currentTurnIndex >= this.turnOrder.length) {
      this.phase = 'between_turns';
      this.broadcastState();
      setTimeout(() => this.prepareNextRound(), 1500);
      return;
    }

    const uid = this.turnOrder[this.currentTurnIndex];
    const player = this.getPlayer(uid);
    this.phase = 'quoting';
    this.currentQuote = null;

    this.emit({
      type: 'turn:start',
      quoterId: uid,
      quoterName: player.username,
    });

    this.startTimer('quote', this.config.quoteTimeout * 1000, () => {
      this.handleQuoteTimeout();
    });
    this.broadcastState();
  }

  private handleQuoteTimeout() {
    const uid = this.turnOrder[this.currentTurnIndex];
    this.emit({ type: 'turn:timeout', quoterId: uid });
    this.advanceTurn(false);
  }

  private handleTradeTimeout() {
    this.handleTradeComplete();
  }

  private handleTradeComplete() {
    const quote = this.currentQuote;
    if (!quote) return;

    const wasFilled = quote.bidFilled || quote.askFilled;
    this.emit({ type: 'trade:window:close', quoteId: quote.id, wasFilled });
    this.advanceTurn(wasFilled);
  }

  private advanceTurn(wasFilled: boolean) {
    const { tickSize } = this.config;

    if (this.currentQuote) {
      this.lastQuoteSpread = this.currentQuote.spread;
      this.lastQuoteFilled = wasFilled;

      if (!wasFilled) {
        this.currentAllowedSpread =
          this.currentAllowedSpread < 0
            ? this.currentQuote.spread - tickSize
            : Math.max(this.currentAllowedSpread - tickSize, tickSize);
      } else {
        if (this.currentAllowedSpread < 0) {
          this.currentAllowedSpread = this.currentQuote.spread;
        }
      }
    }

    this.currentTurnIndex++;
    this.phase = 'between_turns';
    this.broadcastState();
    setTimeout(() => this.nextTurn(), 1500);
  }

  private finish() {
    this.phase = 'finished';
    this.clearAllTimers();

    const results: GameResult[] = this.players
      .map((p) => ({
        userId: p.userId,
        username: p.username,
        netPosition: p.netPosition,
        cash: p.cash,
        finalPnl: +(p.cash + p.netPosition * this.config.value).toFixed(4),
        rank: 0,
      }))
      .sort((a, b) => b.finalPnl - a.finalPnl)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    this.emit({ type: 'game:end', value: this.config.value, results });
    this.broadcastState();
  }

  private getPlayer(userId: string): PlayerState {
    const p = this.players.find((pp) => pp.userId === userId);
    if (!p) throw new Error(`Player ${userId} not found`);
    return p;
  }

  private startTimer(key: string, ms: number, cb: () => void) {
    this.clearTimer(key);
    this.deadline = Date.now() + ms;
    this.timerType = key as 'quote' | 'trade';
    this.timers.set(key, setTimeout(cb, ms));
  }

  private clearTimer(key: string) {
    const t = this.timers.get(key);
    if (t) {
      clearTimeout(t);
      this.timers.delete(key);
    }
    if (this.timerType === key) {
      this.deadline = null;
      this.timerType = null;
    }
  }

  private clearAllTimers() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.deadline = null;
    this.timerType = null;
  }

  private broadcastState() {
    this.emit({ type: 'state:update', state: this.getPublicState() });
  }
}
