import { create } from 'zustand';
import type {
  RoomInfo,
  PublicGameState,
  GameResult,
  Quote,
  Trade,
  Clue,
  PlayerState,
  GamePhase,
} from '../types';

interface GameStore {
  room: RoomInfo | null;
  gameState: PublicGameState | null;
  results: GameResult[] | null;
  revealedValue: number | null;
  errorMsg: string | null;

  setRoom: (room: RoomInfo | null) => void;
  setGameState: (state: PublicGameState) => void;
  setResults: (value: number, results: GameResult[]) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  room: null,
  gameState: null,
  results: null,
  revealedValue: null,
  errorMsg: null,

  setRoom: (room) => set({ room }),

  setGameState: (state) => set({ gameState: state }),

  setResults: (value, results) =>
    set({ revealedValue: value, results }),

  setError: (msg) => {
    set({ errorMsg: msg });
    if (msg) setTimeout(() => set({ errorMsg: null }), 4000);
  },

  reset: () =>
    set({
      room: null,
      gameState: null,
      results: null,
      revealedValue: null,
      errorMsg: null,
    }),
}));
