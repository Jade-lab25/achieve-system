import type { CheckInRecord, TimeRecord, AchievementLog } from '../types';
import { Calendar, Clock, Zap, ShoppingCart, CheckSquare, AlertCircle } from 'lucide-react';

type TabType = 'todo' | 'checkin' | 'time' | 'achievement' | 'inspiration' | 'sync';

interface DateDetailProps {
  activeTab: TabType;
  date: string;
  checkInRecords: CheckInRecord[];
  timeRecords: TimeRecord[];
  achievementLogs: AchievementLog[];
  totalAchievements: number;
  checkInCount: number;
}

export function DateDetail({ activeTab, date, checkInRecords, timeRecords, achievementLogs, totalAchievements, checkInCount }: DateDetailProps) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', { 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'todo':
        return <CheckSquare className="w-4 h-4 text-blue-500" />;
      case 'task':
        return <Zap className="w-4 h-4 text-green-500" />;
      case 'commodity':
        return <ShoppingCart className="w-4 h-4 text-red-500" />;
      case 'delay':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'todo':
        return '待办';
      case 'task':
        return '任务';
      case 'commodity':
        return '商品';
      case 'delay':
        return '拖延';
      default:
        return type;
    }
  };

  const renderCheckInTimeline = () => {
    return (
      <div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{totalAchievements}</div>
            <div className="text-sm text-yellow-700 mt-1">当日总成就值</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{checkInCount}</div>
            <div className="text-sm text-green-700 mt-1">任务库打卡次数</div>
          </div>
        </div>

        {checkInRecords.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-3 pb-2 border-b border-gray-100">
              <div className="col-span-4">打卡名称</div>
              <div className="col-span-2">类别</div>
              <div className="col-span-3">打卡时间</div>
              <div className="col-span-3 text-right">成就值</div>
            </div>
            {checkInRecords.map(record => (
              <div
                key={record.id}
                className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="col-span-4 text-sm text-gray-800 truncate">{record.projectName}</div>
                <div className="col-span-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    record.type === 'task' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {record.type === 'task' ? '任务库' : '商品库'}
                  </span>
                </div>
                <div className="col-span-3 text-sm text-gray-500">{formatTime(record.createdAt)}</div>
                <div className={`col-span-3 text-sm font-bold text-right ${
                  record.type === 'task' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {record.type === 'task' ? '+' : '-'}{record.points}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">当日暂无打卡记录</p>
        )}
      </div>
    );
  };

  const renderTimeTimeline = () => {
    const completedRecords = timeRecords.filter(r => r.endTime);
    const runningRecords = timeRecords.filter(r => !r.endTime);
    
    const totalDuration = completedRecords.reduce((sum, record) => {
      if (!record.endTime) return sum;
      try {
        const startDate = new Date(record.startTime);
        const endDate = new Date(record.endTime);
        const minutes = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 60000));
        return sum + minutes;
      } catch {
        return sum;
      }
    }, 0);

    const formatDuration = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    return (
      <div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{completedRecords.length}</div>
            <div className="text-sm text-purple-700 mt-1">完成记录</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{runningRecords.length}</div>
            <div className="text-sm text-blue-700 mt-1">进行中</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{formatDuration(totalDuration)}</div>
            <div className="text-sm text-indigo-700 mt-1">总时长</div>
          </div>
        </div>

        {timeRecords.length > 0 ? (
          <div className="space-y-2">
            {timeRecords.map(record => (
              <div
                key={record.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  !record.endTime ? 'bg-purple-50 border-l-4 border-purple-400' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${!record.endTime ? 'text-purple-500' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${!record.endTime ? 'text-purple-600' : 'text-gray-600'}`}>
                    {record.startTime} - {record.endTime || '进行中'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{record.content}</p>
                  {record.note && (
                    <p className="text-xs text-gray-400 mt-1">备注: {record.note}</p>
                  )}
                </div>
                {!record.endTime && (
                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded-full animate-pulse">
                    计时中
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">当日暂无时间记录</p>
        )}
      </div>
    );
  };

  const renderAchievementTimeline = () => {
    return (
      <div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{totalAchievements}</div>
            <div className="text-sm text-yellow-700 mt-1">当日变动</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {achievementLogs.filter(l => l.points > 0).reduce((sum, l) => sum + l.points, 0)}
            </div>
            <div className="text-sm text-green-700 mt-1">累计获得</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {Math.abs(achievementLogs.filter(l => l.points < 0).reduce((sum, l) => sum + l.points, 0))}
            </div>
            <div className="text-sm text-red-700 mt-1">累计消耗</div>
          </div>
        </div>

        {achievementLogs.length > 0 ? (
          <div className="space-y-2">
            {achievementLogs.map(log => (
              <div
                key={log.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border">
                  {getTypeIcon(log.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      log.type === 'todo' ? 'bg-blue-100 text-blue-600' :
                      log.type === 'task' ? 'bg-green-100 text-green-600' :
                      log.type === 'commodity' ? 'bg-red-100 text-red-600' :
                      'bg-yellow-100 text-yellow-600'
                    }`}>
                      {getTypeLabel(log.type)}
                    </span>
                    <span className="text-sm text-gray-800">{log.title}</span>
                  </div>
                  <p className="text-xs text-gray-400">{formatTime(log.createdAt)}</p>
                </div>
                <span className={`text-sm font-bold ${
                  log.points > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {log.points > 0 ? '+' : ''}{log.points}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">当日暂无成就变动</p>
        )}
      </div>
    );
  };

  const renderDefaultTimeline = () => {
    return (
      <div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{totalAchievements}</div>
            <div className="text-sm text-yellow-700 mt-1">当日总成就值</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{checkInCount}</div>
            <div className="text-sm text-green-700 mt-1">任务库打卡次数</div>
          </div>
        </div>

        {achievementLogs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-600 mb-3">成就变动</h3>
            <div className="space-y-2">
              {achievementLogs.map(log => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border">
                    {getTypeIcon(log.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        log.type === 'todo' ? 'bg-blue-100 text-blue-600' :
                        log.type === 'task' ? 'bg-green-100 text-green-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {getTypeLabel(log.type)}
                      </span>
                      <span className="text-sm text-gray-800">{log.title}</span>
                    </div>
                    <p className="text-xs text-gray-400">{formatTime(log.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-bold ${
                    log.points > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {log.points > 0 ? '+' : ''}{log.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {checkInRecords.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-600 mb-3">打卡记录</h3>
            <div className="space-y-2">
              {checkInRecords.map(record => (
                <div
                  key={record.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    record.type === 'task' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {record.type === 'task' ? (
                      <Zap className="w-4 h-4 text-green-600" />
                    ) : (
                      <ShoppingCart className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-800">{record.projectName}</span>
                    <p className="text-xs text-gray-400">{formatTime(record.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-bold ${
                    record.type === 'task' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {record.type === 'task' ? '+' : '-'}{record.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {timeRecords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-medium text-gray-600">时间记录</h3>
            </div>
            <div className="space-y-2">
              {timeRecords.map(record => (
                <div
                  key={record.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                >
                  <span className="text-sm font-medium text-purple-600 whitespace-nowrap">
                    {formatTimestamp(record.startTime)} - {record.endTime ? formatTimestamp(record.endTime) : '进行中'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{record.content}</p>
                    {record.note && (
                      <p className="text-xs text-gray-400 mt-1">备注: {record.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {achievementLogs.length === 0 && checkInRecords.length === 0 && timeRecords.length === 0 && (
          <p className="text-gray-400 text-center py-8">当日暂无记录</p>
        )}
      </div>
    );
  };

  const renderTimeline = () => {
    switch (activeTab) {
      case 'checkin':
        return renderCheckInTimeline();
      case 'time':
        return renderTimeTimeline();
      case 'achievement':
        return renderAchievementTimeline();
      default:
        return renderDefaultTimeline();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-blue-500" />
        <h2 className="text-xl font-bold text-gray-800">{formatDate(date)}</h2>
      </div>

      {renderTimeline()}
    </div>
  );
}