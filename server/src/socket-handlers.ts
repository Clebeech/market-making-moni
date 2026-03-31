import type { Server, Socket } from 'socket.io';
import { verifyToken } from './auth.js';
import { store } from './store.js';
import { GameEngine } from './game-engine.js';
import type { GameConfig, PlayerState } from './types.js';

interface AuthSocket extends Socket {
  auth: { userId: string; username: string };
}

export function setupSocketHandlers(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('未提供 Token'));

    const payload = verifyToken(token);
    if (!payload) return next(new Error('Token 无效'));

    (socket as AuthSocket).auth = payload;
    next();
  });

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthSocket;
    const { userId, username } = socket.auth;

    const roomId = store.userRoom.get(userId);
    if (roomId) {
      socket.join(roomId);
      const game = store.games.get(roomId);
      if (game) {
        game.reconnectPlayer(userId);
      }
    }

    // ──── Room events ────

    socket.on('room:join', (roomId: string) => {
      socket.join(roomId);
      io.to(roomId).emit('room:update', getRoomInfo(roomId));
    });

    socket.on('player:ready', () => {
      const rid = store.userRoom.get(userId);
      if (!rid) return;
      const room = store.getRoom(rid);
      if (!room) return;
      const p = room.players.find((pp) => pp.userId === userId);
      if (p) p.isReady = !p.isReady;
      io.to(rid).emit('room:update', store.toRoomInfo(room));
    });

    // ──── Admin: start game ────

    socket.on('game:start', () => {
      const rid = store.userRoom.get(userId);
      if (!rid) return;
      const room = store.getRoom(rid);
      if (!room || room.adminId !== userId) return;
      if (room.status !== 'waiting') return;
      if (room.players.length < 2) {
        socket.emit('error:msg', '至少需要 2 名玩家');
        return;
      }

      const cfg = room.config as GameConfig;
      if (!cfg.value || cfg.value <= 0) {
        socket.emit('error:msg', '请先设置真实值（Value）');
        return;
      }

      room.status = 'playing';

      const players: PlayerState[] = room.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        seatNumber: p.seatNumber,
        netPosition: 0,
        cash: 0,
        isReady: true,
        isConnected: true,
      }));

      const engine = new GameEngine(rid, cfg, players, (event) => {
        io.to(rid).emit(event.type, event);
      });

      store.games.set(rid, engine);
      io.to(rid).emit('room:update', store.toRoomInfo(room));
      engine.start();
    });

    // ──── Admin: start round ────

    socket.on('round:start', () => {
      const rid = store.userRoom.get(userId);
      if (!rid) return;
      const room = store.getRoom(rid);
      if (!room || room.adminId !== userId) return;
      const engine = store.games.get(rid);
      if (!engine) return;
      engine.startRound();
    });

    // ──── Admin: add clue ────

    socket.on('clue:add', (content: string) => {
      const rid = store.userRoom.get(userId);
      if (!rid) return;
      const room = store.getRoom(rid);
      if (!room || room.adminId !== userId) return;
      const engine = store.games.get(rid);
      if (!engine) return;
      engine.addClue(content);
    });

    // ──── Player: submit quote ────

    socket.on('quote:submit', (data: { bid: number; ask: number }) => {
      const rid = store.userRoom.get(userId);
      if (!rid) return;
      const engine = store.games.get(rid);
      if (!engine) return;
      const result = engine.submitQuote(userId, data.bid, data.ask);
      if (!result.success) {
        socket.emit('error:msg', result.error);
      }
    });

    // ──── Player: execute trade ────

    socket.on('trade:execute', (data: { side: 'buy' | 'sell' }) => {
      const rid = store.userRoom.get(userId);
      if (!rid) return;
      const engine = store.games.get(rid);
      if (!engine) return;
      const result = engine.executeTrade(userId, data.side);
      if (!result.success) {
        socket.emit('error:msg', result.error);
      }
    });

    // ──── Request current state ────

    socket.on('game:state', () => {
      const rid = store.userRoom.get(userId);
      if (!rid) return;
      const engine = store.games.get(rid);
      if (!engine) return;
      socket.emit('state:update', { type: 'state:update', state: engine.getPublicState() });
    });

    // ──── Disconnect ────

    socket.on('disconnect', () => {
      const rid = store.userRoom.get(userId);
      if (!rid) return;
      const engine = store.games.get(rid);
      if (engine) {
        engine.disconnectPlayer(userId);
      }
    });
  });
}

function getRoomInfo(roomId: string) {
  const room = store.getRoom(roomId);
  return room ? store.toRoomInfo(room) : null;
}
