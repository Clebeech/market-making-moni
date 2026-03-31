const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data as T;
}

export const api = {
  register: (username: string, password: string) =>
    request<{ userId: string; username: string; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<{ userId: string; username: string; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getProfile: () => request<{ userId: string; username: string }>('/user/profile'),

  createRoom: () =>
    request<import('../types').RoomInfo>('/room/create', { method: 'POST' }),

  joinRoom: (roomCode: string) =>
    request<import('../types').RoomInfo>('/room/join', {
      method: 'POST',
      body: JSON.stringify({ roomCode }),
    }),

  getRoom: (roomId: string) =>
    request<import('../types').RoomInfo>(`/room/${roomId}`),

  updateConfig: (roomId: string, config: Record<string, number>) =>
    request<import('../types').RoomInfo>(`/room/${roomId}/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  leaveRoom: () => request<{ ok: boolean }>('/room/leave', { method: 'POST' }),
};
