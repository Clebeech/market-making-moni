import { Router } from 'express';
import { randomUUID, randomBytes } from 'crypto';
import * as auth from './auth.js';
import { store } from './store.js';
import type { AuthPayload } from './auth.js';
import type { Room } from './store.js';

const router = Router();

// ──────── Auth ────────

router.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  const result = await auth.register(username, password);
  if ('error' in result) return res.status(400).json(result);
  res.json({ userId: result.user.id, username: result.user.username, token: result.token });
});

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await auth.login(username, password);
  if ('error' in result) return res.status(400).json(result);
  res.json({ userId: result.user.id, username: result.user.username, token: result.token });
});

router.get('/user/profile', auth.authMiddleware, (req, res) => {
  const { userId, username } = (req as any).auth as AuthPayload;
  res.json({ userId, username });
});

// ──────── Room ────────

function generateRoomCode(): string {
  return randomBytes(3).toString('hex').toUpperCase();
}

router.post('/room/create', auth.authMiddleware, (req, res) => {
  const { userId, username } = (req as any).auth as AuthPayload;

  if (store.userRoom.has(userId)) {
    return res.status(400).json({ error: '你已在一个房间中，请先退出' });
  }

  const room: Room = {
    id: randomUUID(),
    roomCode: generateRoomCode(),
    adminId: userId,
    adminName: username,
    status: 'waiting',
    config: {
      tickSize: 0.5,
      maxSpreadPct: 0.2,
      maxPosition: 10,
      playerCount: 10,
      totalRounds: 5,
      quoteTimeout: 30,
      tradeTimeout: 10,
    },
    players: [],
  };

  store.addRoom(room);
  store.userRoom.set(userId, room.id);
  res.json(store.toRoomInfo(room));
});

router.post('/room/join', auth.authMiddleware, (req, res) => {
  const { userId, username } = (req as any).auth as AuthPayload;
  const { roomCode } = req.body;

  if (!roomCode) return res.status(400).json({ error: '请输入房间码' });

  const room = store.getRoomByCode(roomCode.toUpperCase());
  if (!room) return res.status(404).json({ error: '房间不存在' });
  if (room.status !== 'waiting') return res.status(400).json({ error: '游戏已开始或已结束' });

  if (room.adminId === userId) {
    return res.json(store.toRoomInfo(room));
  }

  const existing = room.players.find((p) => p.userId === userId);
  if (existing) {
    return res.json(store.toRoomInfo(room));
  }

  const maxPlayers = room.config.playerCount || 10;
  if (room.players.length >= maxPlayers) {
    return res.status(400).json({ error: '房间已满' });
  }

  room.players.push({
    userId,
    username,
    seatNumber: room.players.length + 1,
    isReady: false,
  });

  store.userRoom.set(userId, room.id);
  res.json(store.toRoomInfo(room));
});

router.put('/room/:roomId/config', auth.authMiddleware, (req, res) => {
  const { userId } = (req as any).auth as AuthPayload;
  const room = store.getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: '房间不存在' });
  if (room.adminId !== userId) return res.status(403).json({ error: '只有管理员可以修改配置' });
  if (room.status !== 'waiting') return res.status(400).json({ error: '游戏已开始' });

  const allowed = [
    'value', 'tickSize', 'maxSpreadPct', 'maxPosition',
    'playerCount', 'totalRounds', 'quoteTimeout', 'tradeTimeout',
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      (room.config as any)[key] = Number(req.body[key]);
    }
  }

  res.json(store.toRoomInfo(room));
});

router.get('/room/:roomId', auth.authMiddleware, (req, res) => {
  const room = store.getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: '房间不存在' });
  res.json(store.toRoomInfo(room));
});

router.post('/room/leave', auth.authMiddleware, (req, res) => {
  const { userId } = (req as any).auth as AuthPayload;
  const roomId = store.userRoom.get(userId);
  if (!roomId) return res.json({ ok: true });

  const room = store.getRoom(roomId);
  if (room && room.status === 'waiting') {
    room.players = room.players.filter((p) => p.userId !== userId);
  }
  store.userRoom.delete(userId);
  res.json({ ok: true });
});

export default router;
