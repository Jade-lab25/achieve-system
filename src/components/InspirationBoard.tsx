import { useState, useCallback } from 'react';
import type { Inspiration } from '../types';
import { Lightbulb, Plus, Edit3, ArrowRight, Trash2, Pin } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface InspirationBoardProps {
  inspirations: Inspiration[];
  onAdd: (content: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  onMoveToTodo: (id: string) => void;
  onPin: (id: string) => void;
}

export function InspirationBoard({ inspirations, onAdd, onDelete, onUpdate, onMoveToTodo, onPin }: InspirationBoardProps) {
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

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
      onAdd(inputValue.trim());
      setInputValue('');
      addToast('灵感已记录', 'success');
    }
  };

  const handleEdit = (inspiration: Inspiration) => {
    setEditingId(inspiration.id);
    setEditingValue(inspiration.content);
  };

  const handleSaveEdit = (id: string) => {
    if (editingValue.trim()) {
      onUpdate(id, editingValue.trim());
      addToast('灵感已更新', 'success');
    }
    setEditingId(null);
    setEditingValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    addToast('灵感已删除', 'info');
  };

  const handleMoveToTodo = (id: string) => {
    onMoveToTodo(id);
    addToast('已转为待办事项', 'success');
  };

  const handlePin = (id: string) => {
    onPin(id);
    addToast('已置顶', 'info');
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

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
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            灵感记录
          </h2>
          <span className="text-sm text-gray-500">
            共 {inspirations.length} 条灵感
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="记录你的灵感（Shift+Enter换行）..."
              rows={3}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              添加
            </button>
          </div>
        </form>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {inspirations.length === 0 ? (
            <p className="text-gray-400 text-center py-8">暂无灵感记录</p>
          ) : (
            inspirations.map(inspiration => (
              <div
                key={inspiration.id}
                className="flex items-start gap-3 p-4 rounded-lg border border-yellow-100 bg-yellow-50"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === inspiration.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        rows={3}
                        className="w-full px-2 py-1 border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(inspiration.id)}
                          className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
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
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{inspiration.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        添加于 {formatTime(inspiration.createdAt)}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePin(inspiration.id)}
                    className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                    title="置顶"
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(inspiration)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                    title="修改"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveToTodo(inspiration.id)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="转到待办"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(inspiration.id)}
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