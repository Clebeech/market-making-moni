import { useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = isRegister ? api.register : api.login;
      const data = await fn(username, password);
      login(data.userId, data.username, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">做市模拟</h1>
          <p className="text-slate-400 mt-2">Market Making Simulator</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700"
        >
          <h2 className="text-lg font-semibold text-white mb-4">
            {isRegister ? '注册' : '登录'}
          </h2>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg px-3 py-2 mb-4 text-sm">
              {error}
            </div>
          )}

          <label className="block mb-3">
            <span className="text-sm text-slate-300">用户名</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入用户名"
              required
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-slate-300">密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入密码"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {loading ? '处理中...' : isRegister ? '注册' : '登录'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="mt-3 w-full text-sm text-slate-400 hover:text-white transition-colors"
          >
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </form>
      </div>
    </div>
  );
}
