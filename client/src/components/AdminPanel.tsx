import { useState } from 'react';
import { connectSocket } from '../services/socket';

interface Props {
  round: number;
}

export default function AdminPanel({ round }: Props) {
  const [clue, setClue] = useState('');

  const handleAddClue = () => {
    if (!clue.trim()) return;
    const socket = connectSocket();
    socket.emit('clue:add', clue.trim());
    setClue('');
  };

  const handleStartRound = () => {
    const socket = connectSocket();
    socket.emit('round:start');
  };

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-amber-500/30 ring-1 ring-amber-500/20">
      <h3 className="text-sm font-medium text-amber-400 mb-1">管理员面板</h3>
      <p className="text-xs text-slate-400 mb-4">第 {round} 轮即将开始</p>

      <div className="mb-4">
        <label className="text-xs text-slate-400 block mb-1">发布线索（可选）</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            placeholder="输入线索内容..."
            className="flex-1 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAddClue()}
          />
          <button
            onClick={handleAddClue}
            disabled={!clue.trim()}
            className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg px-4 transition-colors"
          >
            发布
          </button>
        </div>
      </div>

      <button
        onClick={handleStartRound}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg py-3 transition-colors"
      >
        开始第 {round} 轮
      </button>
    </div>
  );
}
