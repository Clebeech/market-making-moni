import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { connectSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import type { PublicGameState, RoomInfo } from '../types';
import CluePanel from '../components/CluePanel';
import TradeHistory from '../components/TradeHistory';
import QuoteDisplay from '../components/QuoteDisplay';
import QuoteInput from '../components/QuoteInput';
import TradeButtons from '../components/TradeButtons';
import AdminPanel from '../components/AdminPanel';
import PositionBar from '../components/PositionBar';
import Leaderboard from '../components/Leaderboard';
import Timer from '../components/Timer';

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);
  const { room, gameState, setRoom, setGameState, setResults, setError, errorMsg } =
    useGameStore();

  const isAdmin = room?.adminId === userId;

  useEffect(() => {
    const socket = connectSocket();
    socket.emit('room:join', roomId);
    socket.emit('game:state');

    socket.on('room:update', (data: RoomInfo) => setRoom(data));
    socket.on('state:update', (ev: { state: PublicGameState }) => setGameState(ev.state));
    socket.on('game:end', (ev: { value: number; results: any[] }) => {
      setResults(ev.value, ev.results);
      setTimeout(() => navigate(`/results/${roomId}`), 500);
    });
    socket.on('error:msg', (msg: string) => setError(msg));

    return () => {
      socket.off('room:update');
      socket.off('state:update');
      socket.off('game:end');
      socket.off('error:msg');
    };
  }, [roomId]);

  const gs = gameState;
  if (!gs) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">加载中...</p>
      </div>
    );
  }

  const myState = gs.players.find((p) => p.userId === userId);
  const isMyTurn = gs.currentQuoterId === userId;
  const isQuoting = gs.phase === 'quoting';
  const isTrading = gs.phase === 'trading';
  const isRoundPending = gs.phase === 'round_pending';
  const isBetweenTurns = gs.phase === 'between_turns';

  return (
    <div className="min-h-screen bg-slate-900 px-2 py-3 md:px-4 md:py-4">
      {/* Error toast */}
      {errorMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-500/90 text-white rounded-lg px-4 py-2 text-sm shadow-lg">
          {errorMsg}
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-3">
        <div className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3 border border-slate-700">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white">做市模拟</h1>
            <span className="text-slate-400 text-sm font-mono">{room?.roomCode}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">
              第 <span className="text-blue-400 font-semibold">{gs.currentRound}</span> / {gs.totalRounds} 轮
            </span>
            <Timer deadline={gs.deadline} type={gs.timerType} />
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left sidebar */}
        <div className="lg:col-span-3 space-y-3">
          <CluePanel clues={gs.clues} />
          <TradeHistory trades={gs.trades} userId={userId!} />
        </div>

        {/* Center */}
        <div className="lg:col-span-6 space-y-3">
          {/* Round pending - admin starts round */}
          {isRoundPending && isAdmin && (
            <AdminPanel round={gs.currentRound} />
          )}
          {isRoundPending && !isAdmin && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
              <p className="text-slate-300">等待管理员开始第 {gs.currentRound} 轮...</p>
            </div>
          )}

          {/* Quote display */}
          {(isQuoting || isTrading) && <QuoteDisplay gs={gs} />}

          {/* Between turns */}
          {isBetweenTurns && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
              <p className="text-slate-400">轮换中...</p>
            </div>
          )}

          {/* Action area */}
          {isQuoting && isMyTurn && !isAdmin && (
            <QuoteInput
              allowedSpread={gs.allowedSpread}
              maxSpreadPct={gs.maxSpreadPct}
              tickSize={room?.config.tickSize || 0.5}
            />
          )}
          {isQuoting && !isMyTurn && !isAdmin && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
              <p className="text-slate-400">
                等待 <span className="text-white font-medium">{gs.currentQuoterName}</span> 报价...
              </p>
            </div>
          )}
          {isTrading && !isAdmin && gs.currentQuote && gs.currentQuote.quoterId !== userId && (
            <TradeButtons
              quote={gs.currentQuote}
              myPosition={myState?.netPosition ?? 0}
              maxPosition={room?.config.maxPosition || 10}
            />
          )}
          {isTrading && !isAdmin && gs.currentQuote && gs.currentQuote.quoterId === userId && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
              <p className="text-slate-300">你的报价进入成交窗口，等待其他玩家操作...</p>
            </div>
          )}

          {/* Turn order */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">本轮报价顺序</h3>
            <div className="flex flex-wrap gap-2">
              {gs.turnOrder.map((t, i) => (
                <span
                  key={t.userId}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    i === gs.currentTurnIndex
                      ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                      : i < gs.currentTurnIndex
                        ? 'bg-slate-700 text-slate-500 line-through'
                        : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {t.username}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-3 space-y-3">
          {myState && !isAdmin && (
            <PositionBar
              player={myState}
              maxPosition={room?.config.maxPosition || 10}
            />
          )}
          <Leaderboard players={gs.players} userId={userId!} />
        </div>
      </div>
    </div>
  );
}
