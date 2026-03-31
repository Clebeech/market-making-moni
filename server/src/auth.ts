import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { store } from './store.js';
import type { User } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'market-making-dev-secret';

export interface AuthPayload {
  userId: string;
  username: string;
}

export function generateToken(user: User): string {
  return jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '24h',
  });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export async function register(
  username: string,
  password: string,
): Promise<{ user: User; token: string } | { error: string }> {
  if (!username || !password) return { error: '用户名和密码不能为空' };
  if (username.length < 2) return { error: '用户名至少2个字符' };
  if (password.length < 3) return { error: '密码至少3个字符' };

  if (store.getUserByName(username)) {
    return { error: '用户名已存在' };
  }

  const user: User = {
    id: randomUUID(),
    username,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: Date.now(),
  };

  store.addUser(user);
  const token = generateToken(user);
  return { user, token };
}

export async function login(
  username: string,
  password: string,
): Promise<{ user: User; token: string } | { error: string }> {
  const user = store.getUserByName(username);
  if (!user) return { error: '用户不存在' };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: '密码错误' };

  const token = generateToken(user);
  return { user, token };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  const payload = verifyToken(header.slice(7));
  if (!payload) {
    return res.status(401).json({ error: 'Token 无效或已过期' });
  }

  (req as any).auth = payload;
  next();
}
