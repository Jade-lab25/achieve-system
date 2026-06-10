import type { AchievementLog } from '../types';
import { Trophy, TrendingUp, TrendingDown, CheckSquare, Zap, ShoppingCart } from 'lucide-react';

interface AchievementSystemProps {
  logs: AchievementLog[];
}

export function AchievementSystem({ logs }: AchievementSystemProps) {
  const totalEarned = logs
    .filter(log => (log.points || 0) > 0)
    .reduce((sum, log) => sum + (log.points || 0), 0);
  
  const totalSpent = logs
    .filter(log => (log.points || 0) < 0)
    .reduce((sum, log) => sum + Math.abs(log.points || 0), 0);
  
  const totalAchievements = totalEarned - totalSpent;
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getTypeIcon = (type: AchievementLog['type']) => {
    switch (type) {
      case 'todo':
        return <CheckSquare className="w-4 h-4 text-blue-500" />;
      case 'task':
        return <Zap className="w-4 h-4 text-green-500" />;
      case 'commodity':
        return <ShoppingCart className="w-4 h-4 text-red-500" />;
    }
  };

  const getTypeLabel = (type: AchievementLog['type']) => {
    switch (type) {
      case 'todo':
        return '待办';
      case 'task':
        return '任务';
      case 'commodity':
        return '商品';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        成就系统
      </h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">{totalAchievements}</div>
          <div className="text-sm text-yellow-700 mt-1">总成就值</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-3xl font-bold text-green-600">+{totalEarned}</span>
          </div>
          <div className="text-sm text-green-700 mt-1">累计获得</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <span className="text-3xl font-bold text-red-600">-{totalSpent}</span>
          </div>
          <div className="text-sm text-red-700 mt-1">累计消耗</div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">流水明细</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">暂无成就记录</p>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border">
                  {getTypeIcon(log.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      log.type === 'todo' ? 'bg-blue-100 text-blue-600' :
                      log.type === 'task' ? 'bg-green-100 text-green-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {getTypeLabel(log.type)}
                    </span>
                    <span className="text-sm text-gray-800 truncate">{log.title}</span>
                  </div>
                  <p className="text-xs text-gray-400">{formatTime(log.createdAt)}</p>
                </div>
                <span className={`text-sm font-bold ${
                  log.points > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {log.points > 0 ? '+' : ''}{log.points}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}