export interface GameConfig {
  value?: number;
  tickSize: number;
  maxSpreadPct: number;
  maxPosition: number;
  playerCount: number;
  totalRounds: number;
  quoteTimeout: number;
  tradeTimeout: number;
}

export interface PlayerState {
  userId: string;
  username: string;
  seatNumber: number;
  netPosition: number;
  cash: number;
  isReady: boolean;
  isConnected: boolean;
}

export interface Quote {
  id: string;
  round: number;
  turn: number;
  quoterId: string;
  quoterName: string;
  bid: number;
  ask: number;
  spread: number;
  bidFilled: boolean;
  askFilled: boolean;
  bidTakerId?: string;
  bidTakerName?: string;
  askTakerId?: string;
  askTakerName?: string;
  timestamp: number;
}

export interface Trade {
  id: string;
  quoteId: string;
  round: number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  price: number;
  side: 'bid' | 'ask';
  timestamp: number;
}

export interface Clue {
  round: number;
  content: string;
  timestamp: number;
}

export type GamePhase =
  | 'waiting'
  | 'round_pending'
  | 'quoting'
  | 'trading'
  | 'between_turns'
  | 'finished';

export interface GameResult {
  userId: string;
  username: string;
  netPosition: number;
  cash: number;
  finalPnl: number;
  rank: number;
}

export interface RoomInfo {
  id: string;
  roomCode: string;
  adminId: string;
  adminName: string;
  status: 'waiting' | 'playing' | 'finished';
  config: Partial<GameConfig>;
  players: Array<{
    userId: string;
    username: string;
    seatNumber: number;
    isReady: boolean;
  }>;
}

export interface PublicGameState {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  currentQuoterId: string | null;
  currentQuoterName: string | null;
  currentQuote: Quote | null;
  allowedSpread: number;
  maxSpreadPct: number;
  turnOrder: Array<{ userId: string; username: string }>;
  currentTurnIndex: number;
  players: PlayerState[];
  quotes: Quote[];
  trades: Trade[];
  clues: Clue[];
  deadline: number | null;
  timerType: 'quote' | 'trade' | null;
}
