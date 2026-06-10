import { useState, useEffect } from 'react';
import { User, Lock, LogIn, LogOut, Mail } from 'lucide-react';
import { auth } from '../supabase/database';

interface AuthProps {
  onLogin: () => void;
  onLogout: () => void;
}

export function Auth({ onLogin, onLogout }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const currentUser = await auth.getCurrentUser();
      setUser(currentUser);
    };
    getCurrentUser();

    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session?.user);
        onLogin();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        onLogout();
      }
    });

    return () => subscription.unsubscribe();
  }, [onLogin, onLogout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (isSignUp && password !== confirmPassword) {
      setMessage('两次输入的密码不一致');
      setMessageType('error');
      return;
    }

    if (isSignUp) {
      const { error } = await auth.signUp(email, password);
      if (error) {
        setMessage(error.message);
        setMessageType('error');
      } else {
        setMessage('注册成功，请登录');
        setMessageType('success');
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
      }
    } else {
      const { error } = await auth.signIn(email, password);
      if (error) {
        setMessage(error.message);
        setMessageType('error');
      }
    }
  };

  const handleLogout = async () => {
    const { error } = await auth.signOut();
    if (error) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  if (user) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-gray-800">{user.email}</p>
              <p className="text-xs text-gray-500">已登录</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
        {isSignUp ? '注册账户' : '登录'}
      </h2>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">邮箱</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">密码</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {isSignUp && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">确认密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          {isSignUp ? '注册' : '登录'}
        </button>
      </form>

      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        {isSignUp ? '已有账户？点击登录' : '没有账户？点击注册'}
      </button>
    </div>
  );
}