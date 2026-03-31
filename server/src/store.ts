import type { User, GameConfig, RoomInfo, PlayerState } from './types.js';
import { GameEngine } from './game-engine.js';

export interface Room {
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

class Store {
  users = new Map<string, User>();
  usersByName = new Map<string, User>();
  rooms = new Map<string, Room>();
  roomsByCode = new Map<string, Room>();
  games = new Map<string, GameEngine>();
  /** Maps a userId to the roomId they are in (as player or admin) */
  userRoom = new Map<string, string>();

  getUser(id: string) {
    return this.users.get(id);
  }

  getUserByName(username: string) {
    return this.usersByName.get(username);
  }

  addUser(user: User) {
    this.users.set(user.id, user);
    this.usersByName.set(user.username, user);
  }

  addRoom(room: Room) {
    this.rooms.set(room.id, room);
    this.roomsByCode.set(room.roomCode, room);
  }

  getRoomByCode(code: string) {
    return this.roomsByCode.get(code);
  }

  getRoom(id: string) {
    return this.rooms.get(id);
  }

  toRoomInfo(room: Room): RoomInfo {
    return {
      id: room.id,
      roomCode: room.roomCode,
      adminId: room.adminId,
      adminName: room.adminName,
      status: room.status,
      config: room.config,
      players: room.players,
    };
  }
}

export const store = new Store();
