import { useState, useCallback } from 'react';
import type { Todo } from '../types';
import { Check, Trash2, Plus, Play, Square, Clock, AlertCircle, Edit3, Pin } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface TodoListProps {
  todos: Todo[];
  onAdd: (title: string, tag: 'long-term' | 'one-time') => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onClearCompleted: () => void;
  onToggleDelay: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
  onPin: (id: string) => void;
  onStartTiming: (id: string) => void;
  onEndTiming: (id: string) => void;
}

export function TodoList({ todos, onAdd, onComplete, onDelete, onClearCompleted, onToggleDelay, onUpdate, onPin, onStartTiming, onEndTiming }: TodoListProps) {
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedTag, setSelectedTag] = useState<'long-term' | 'one-time'>('one-time');

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      setInputValue(prev => prev + '\n');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAdd(inputValue.trim(), selectedTag);
      setInputValue('');
      setSelectedTag('one-time');
      addToast('待办事项已添加', 'success');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const calculateDuration = (createdAt: string) => {
    const createDate = new Date(createdAt);
    const now = new Date();
    const diffTime = now.getTime() - createDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleComplete = (id: string) => {
    const todo = todos.find(t => t.id === id);
    onComplete(id);
    if (todo?.isCompleted) {
      addToast('已取消完成，-5 成就值', 'warning');
    } else {
      addToast('待办完成，+5 成就值', 'success');
    }
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    addToast('待办已删除', 'info');
  };

  const handleClearCompleted = () => {
    onClearCompleted();
    addToast('已清除所有已完成待办', 'info');
  };

  const handleToggleDelay = (id: string) => {
    onToggleDelay(id);
    addToast('已标记拖延，-2 成就值', 'warning');
  };

  const handleEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingValue(todo.title);
  };

  const handleSaveEdit = (id: string) => {
    if (editingValue.trim()) {
      onUpdate(id, editingValue.trim());
      addToast('待办已更新', 'success');
    }
    setEditingId(null);
    setEditingValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handlePin = (id: string) => {
    onPin(id);
    addToast('已置顶', 'info');
  };

  const handleStartTiming = (id: string, title: string) => {
    onStartTiming(id);
    addToast(`开始计时：${title}`, 'info');
  };

  const handleEndTiming = (id: string) => {
    onEndTiming(id);
    addToast('计时结束，已保存', 'success');
  };

  const formatDuration = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    const secs = Math.floor((totalMinutes % 1) * 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const completedCount = todos.filter(t => t.isCompleted).length;

  return (
    <>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
            toast.type === 'success' ? 'bg-green-50 border border-green-200' :
            toast.type === 'error' ? 'bg-red-50 border border-red-200' :
            toast.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-blue-50 border border-blue-200'
          }`}
        >
          <span className="text-gray-800 text-sm font-medium">{toast.message}</span>
        </div>
      ))}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            待办清单
          </h2>
          {completedCount > 0 && (
            <button
              onClick={handleClearCompleted}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              清除已完成
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="添加新待办（Shift+Enter换行）..."
              rows={3}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedTag('one-time')}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    selectedTag === 'one-time'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  一次性
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTag('long-term')}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    selectedTag === 'long-term'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  长期
                </button>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>
          </div>
        </form>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {todos.length === 0 ? (
            <p className="text-gray-400 text-center py-8">暂无待办事项</p>
          ) : (
            todos.map(todo => (
              <div
                key={todo.id}
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  todo.isCompleted ? 'border-gray-200 bg-gray-50' :
                  todo.isDelayed ? 'border-yellow-300 bg-yellow-50' :
                  'border-gray-200'
                }`}
              >
                <button
                  onClick={() => handleComplete(todo.id)}
                  className={`flex-shrink-0 mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    todo.isCompleted
                      ? 'bg-green-500 border-green-500 hover:bg-green-600'
                      : 'border-gray-300 hover:border-green-500'
                  }`}
                  title={todo.isCompleted ? '取消完成' : '标记完成'}
                >
                  {todo.isCompleted && <Check className="w-3 h-3 text-white" />}
                </button>

                <div className="flex-1 min-w-0">
                  {editingId === todo.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        rows={3}
                        className="w-full px-2 py-1 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(todo.id)}
                          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          todo.tag === 'long-term'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {todo.tag === 'long-term' ? '长期任务' : '一次性任务'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(todo.createdAt)}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${todo.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'} whitespace-pre-wrap`}>
                        {todo.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {todo.tag === 'one-time' && calculateDuration(todo.createdAt) > 0 && (
                          <span className="px-2 py-0.5 bg-blue-50 text-xs text-blue-500 rounded">
                            持续 {calculateDuration(todo.createdAt)} 天
                          </span>
                        )}
                        {todo.totalTime > 0 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-xs text-gray-500 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            累计 {formatDuration(todo.totalTime)}
                          </span>
                        )}
                        {todo.delayCount > 0 && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-xs text-yellow-600 rounded flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            拖延 {todo.delayCount} 次
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePin(todo.id)}
                    className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                    title="置顶"
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  {!todo.isCompleted && (
                    <>
                      <button
                        onClick={() => todo.isTiming ? handleEndTiming(todo.id) : handleStartTiming(todo.id, todo.title)}
                        className={`p-2 rounded-lg transition-colors ${
                          todo.isTiming
                            ? 'bg-red-100 text-red-600'
                            : 'text-gray-400 hover:bg-green-50 hover:text-green-500'
                        }`}
                        title={todo.isTiming ? '结束计时' : '开始计时'}
                      >
                        {todo.isTiming ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleToggleDelay(todo.id)}
                        disabled={todo.isCompleted}
                        className={`p-2 rounded-lg transition-colors ${
                          todo.isDelayed ? 'bg-yellow-100 text-yellow-600' : 'text-gray-400 hover:bg-yellow-50 hover:text-yellow-500'
                        }`}
                        title="标记拖延"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleEdit(todo)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                    title="修改"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(todo.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}