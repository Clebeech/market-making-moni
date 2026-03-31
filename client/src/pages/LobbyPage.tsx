import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import type { RoomInfo } from '../types';

export default function LobbyPage() {
  const navigate = useNavigate();
  const { userId, username, logout } = useAuthStore();
  const { room, setRoom, setError, errorMsg } = useGameStore();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = room?.adminId === userId;

  useEffect(() => {
    if (!room) return;
    const socket = connectSocket();
    socket.emit('room:join', room.id);

    socket.on('room:update', (data: RoomInfo) => {
      setRoom(data);
      if (data.status === 'playing') {
        navigate(`/game/${data.id}`);
      }
    });

    socket.on('error:msg', (msg: string) => setError(msg));

    return () => {
      socket.off('room:update');
      socket.off('error:msg');
    };
  }, [room?.id]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const data = await api.createRoom();
      setRoom(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    try {
      const data = await api.joinRoom(joinCode.trim());
      setRoom(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    await api.leaveRoom();
    disconnectSocket();
    setRoom(null);
  };

  const handleConfigChange = async (key: string, value: number) => {
    if (!room) return;
    try {
      const data = await api.updateConfig(room.id, { [key]: value });
      setRoom(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReady = () => {
    const socket = connectSocket();
    socket.emit('player:ready');
  };

  const handleStartGame = () => {
    const socket = connectSocket();
    socket.emit('game:start');
  };

  const handleLogout = () => {
    disconnectSocket();
    useGameStore.getState().reset();
    logout();
  };

  // ── Not in a room yet ──
  if (!room) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">做市模拟</h1>
              <p className="text-slate-400 text-sm">欢迎，{username}</p>
            </div>
            <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-white">
              退出登录
            </button>
          </div>

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg px-3 py-2 mb-4 text-sm">
              {errorMsg}
            </div>
          )}

          <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 mb-4">
            <h2 className="text-lg font-semibold text-white mb-4">创建房间</h2>
            <p className="text-slate-400 text-sm mb-4">作为管理员创建新游戏房间</p>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium rounded-lg py-2.5 transition-colors"
            >
              {loading ? '创建中...' : '创建房间'}
            </button>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">加入房间</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="输入房间码"
                maxLength={6}
                className="flex-1 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-widest text-center font-mono"
              />
              <button
                onClick={handleJoin}
                disabled={loading || !joinCode.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-medium rounded-lg px-5 py-2 transition-colors"
              >
                加入
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── In a room ──
  const cfg = room.config;
  const allReady = room.players.length >= 2 && room.players.every((p) => p.isReady);
  const myPlayer = room.players.find((p) => p.userId === userId);

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">游戏大厅</h1>
            <p className="text-slate-400 text-sm">
              房间码：
              <span className="font-mono text-blue-400 tracking-widest text-lg ml-1">
                {room.roomCode}
              </span>
            </p>
          </div>
          <button
            onClick={handleLeave}
            className="text-sm text-slate-400 hover:text-rose-400 transition-colors"
          >
            离开房间
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg px-3 py-2 mb-4 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Config Panel (admin only) */}
        {isAdmin && (
          <div className="bg-slate-800 rounded-2xl p-5 shadow-xl border border-slate-700 mb-4">
            <h2 className="text-base font-semibold text-white mb-4">游戏配置</h2>
            <div className="grid grid-cols-2 gap-3">
              <ConfigField
                label="真实值 (V)"
                value={cfg.value}
                onChange={(v) => handleConfigChange('value', v)}
                step={0.1}
                secret
              />
              <ConfigField
                label="Tick Size"
                value={cfg.tickSize}
                onChange={(v) => handleConfigChange('tickSize', v)}
                step={0.1}
                min={0.01}
              />
              <ConfigField
                label="最大价差 (%)"
                value={cfg.maxSpreadPct ? cfg.maxSpreadPct * 100 : undefined}
                onChange={(v) => handleConfigChange('maxSpreadPct', v / 100)}
                step={1}
                min={1}
                suffix="%"
              />
              <ConfigField
                label="最大持仓 (k)"
                value={cfg.maxPosition}
                onChange={(v) => handleConfigChange('maxPosition', v)}
                step={1}
                min={1}
              />
              <ConfigField
                label="总轮次"
                value={cfg.totalRounds}
                onChange={(v) => handleConfigChange('totalRounds', v)}
                step={1}
                min={1}
              />
              <ConfigField
                label="报价时限 (秒)"
                value={cfg.quoteTimeout}
                onChange={(v) => handleConfigChange('quoteTimeout', v)}
                step={5}
                min={5}
              />
              <ConfigField
                label="成交时限 (秒)"
                value={cfg.tradeTimeout}
                onChange={(v) => handleConfigChange('tradeTimeout', v)}
                step={1}
                min={3}
              />
              <ConfigField
                label="玩家上限"
                value={cfg.playerCount}
                onChange={(v) => handleConfigChange('playerCount', v)}
                step={1}
                min={2}
                max={20}
              />
            </div>
          </div>
        )}

        {/* Players */}
        <div className="bg-slate-800 rounded-2xl p-5 shadow-xl border border-slate-700 mb-4">
          <h2 className="text-base font-semibold text-white mb-3">
            玩家 ({room.players.length}/{cfg.playerCount || 10})
          </h2>
          {room.players.length === 0 ? (
            <p className="text-slate-500 text-sm">等待玩家加入...</p>
          ) : (
            <div className="space-y-2">
              {room.players.map((p) => (
                <div
                  key={p.userId}
                  className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white font-mono">
                      {p.seatNumber}
                    </span>
                    <span className="text-white text-sm">{p.username}</span>
                    {p.userId === userId && (
                      <span className="text-xs text-blue-400">(你)</span>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      p.isReady
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-600 text-slate-400'
                    }`}
                  >
                    {p.isReady ? '已准备' : '未准备'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {!isAdmin && myPlayer && (
            <button
              onClick={handleReady}
              className={`flex-1 font-medium rounded-lg py-2.5 transition-colors ${
                myPlayer.isReady
                  ? 'bg-slate-600 hover:bg-slate-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {myPlayer.isReady ? '取消准备' : '准备'}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleStartGame}
              disabled={!allReady}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg py-2.5 transition-colors"
            >
              {allReady ? '开始游戏' : `等待所有玩家准备 (${room.players.filter((p) => p.isReady).length}/${room.players.length})`}
            </button>
          )}
        </div>

        {/* Admin info */}
        <p className="text-center text-slate-500 text-xs mt-4">
          管理员：{room.adminName}
        </p>
      </div>
    </div>
  );
}

function ConfigField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  suffix,
  secret,
}: {
  label: string;
  value?: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  secret?: boolean;
}) {
  const [localVal, setLocalVal] = useState(value?.toString() ?? '');

  useEffect(() => {
    setLocalVal(value?.toString() ?? '');
  }, [value]);

  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="relative">
        <input
          type={secret ? 'password' : 'number'}
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => {
            const n = parseFloat(localVal);
            if (!isNaN(n)) onChange(n);
          }}
          step={step}
          min={min}
          max={max}
          className="mt-1 block w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 mt-0.5">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}
