import { useState } from 'react';
import type { CheckInProject, CheckInRecord, CheckInType } from '../types';
import { Clock, Plus, Trash2, Zap, ShoppingCart } from 'lucide-react';
import { getCheckInProjectStats } from '../utils/checkInStats';

interface CheckInSystemProps {
  projects: CheckInProject[];
  records: CheckInRecord[];
  onAddProject: (name: string, type: CheckInType, points: number) => void;
  onDeleteProject: (id: string) => void;
  onCheckIn: (projectId: string) => void;
}

export function CheckInSystem({ projects, records, onAddProject, onDeleteProject, onCheckIn }: CheckInSystemProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState<CheckInType>('task');
  const [newProjectPoints, setNewProjectPoints] = useState(10);

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      onAddProject(newProjectName.trim(), newProjectType, newProjectPoints);
      setNewProjectName('');
      setNewProjectType('task');
      setNewProjectPoints(10);
      setShowAddModal(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          打卡系统
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          添加项目
        </button>
      </div>

      <div className="space-y-3">
        {projects.length === 0 ? (
          <p className="text-gray-400 text-center py-8">暂无打卡项目</p>
        ) : (
          projects.map(project => {
            const stats = getCheckInProjectStats(project, records);
            return (
              <div
                key={project.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  project.type === 'task' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {project.type === 'task' ? (
                    <Zap className="w-5 h-5 text-green-600" />
                  ) : (
                    <ShoppingCart className="w-5 h-5 text-red-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      project.type === 'task' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {project.type === 'task' ? '任务库' : '商品库'}
                    </span>
                    <span className="text-gray-800">{project.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      project.type === 'task' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {project.type === 'task' ? '+' : '-'}{project.points}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    累计打卡 {stats.count} 次
                    {stats.lastCheckIn && ` | 最后打卡: ${formatTime(stats.lastCheckIn)}`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onCheckIn(project.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      project.type === 'task'
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    打卡
                  </button>
                  <button
                    onClick={() => onDeleteProject(project.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">添加打卡项目</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入项目名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">项目类型</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="task"
                      checked={newProjectType === 'task'}
                      onChange={(e) => setNewProjectType(e.target.value as CheckInType)}
                      className="w-4 h-4 text-green-500"
                    />
                    <span className="text-sm text-gray-700">任务库（+成就值）</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="commodity"
                      checked={newProjectType === 'commodity'}
                      onChange={(e) => setNewProjectType(e.target.value as CheckInType)}
                      className="w-4 h-4 text-red-500"
                    />
                    <span className="text-sm text-gray-700">商品库（-成就值）</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  成就值{newProjectType === 'task' ? '+' : '-'}
                </label>
                <input
                  type="number"
                  value={newProjectPoints}
                  onChange={(e) => setNewProjectPoints(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddProject}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
