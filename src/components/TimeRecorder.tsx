import { useState, useEffect, useCallback } from 'react';
import type { TimeRecord } from '../types';
import { Clock, Play, Square, Calendar, StickyNote, Trash2 } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface TimeRecorderProps {
  records: TimeRecord[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onStartTimer: (content: string) => string;
  onEndTimer: (recordId: string) => void;
  onDelete: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}

export function TimeRecorder({ records, selectedDate, onSelectDate, onStartTimer, onEndTimer, onDelete, onUpdateNote }: TimeRecorderProps) {
  const [content, setContent] = useState('');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const filteredRecords = records.filter(record => {
    const date = new Date(record.createdAt);
    const recordDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return recordDate === selectedDate;
  });

  const currentRecording = filteredRecords.find(r => !r.endTime) || null;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (currentRecording && currentRecording.startTimestamp) {
      const start = currentRecording.startTimestamp;
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else if (recordingId) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentRecording, recordingId]);

  const handleStart = () => {
    if (content.trim()) {
      const id = onStartTimer(content.trim());
      setRecordingId(id);
      setElapsedTime(0);
      setContent('');
      addToast(`开始记录：${content.trim()}`, 'info');
    }
  };

  const handleEnd = () => {
    const id = currentRecording?.id || recordingId;
    if (id) {
      onEndTimer(id);
      addToast('计时结束，已保存', 'success');
      setRecordingId(null);
      setElapsedTime(0);
    }
  };

  const handleOpenNote = (record: TimeRecord) => {
    setNoteId(record.id);
    setNoteContent(record.note);
  };

  const handleSaveNote = () => {
    if (noteId) {
      onUpdateNote(noteId, noteContent);
      addToast('备注已保存', 'success');
      setNoteId(null);
      setNoteContent('');
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDurationFromTime = (start: string, end: string) => {
    if (!end) return '00:00:00';
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const totalSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
      return formatDuration(Math.max(0, totalSeconds));
    } catch {
      return '00:00:00';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    });
  };

  const completedRecords = filteredRecords.filter(r => r.endTime);
  const totalSeconds = completedRecords.reduce((sum, record) => {
    if (!record.endTime) return sum;
    try {
      const startDate = new Date(record.startTime);
      const endDate = new Date(record.endTime);
      return sum + Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));
    } catch {
      return sum;
    }
  }, 0);

  const sortedRecords = [...filteredRecords].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const isRecording = !!currentRecording || !!recordingId;

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
            <Clock className="w-5 h-5 text-purple-500" />
            时间记录
          </h2>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-xl">
          <h3 className="text-sm font-medium text-gray-600 mb-3">记录当前活动</h3>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="正在做什么..."
            rows={2}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-gray-800"
            disabled={isRecording}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleStart}
              disabled={!content.trim() || isRecording}
              className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              开始记录
            </button>
            <button
              onClick={handleEnd}
              disabled={!isRecording}
              className={`flex-1 py-3 text-white rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording ? 'bg-red-500' : 'bg-gray-300'
              }`}
            >
              <Square className="w-4 h-4" />
              结束记录
            </button>
          </div>

          {currentRecording && (
            <div className="mt-4 text-center p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-red-500" />
                正在记录: {currentRecording.content}
              </p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatDuration(elapsedTime)}
              </p>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">今日时间记录</h3>
            <span className="text-sm text-gray-500">
              共 {completedRecords.length} 条记录 · 总时长: {formatDuration(totalSeconds)}
            </span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {sortedRecords.length === 0 ? (
              <p className="text-gray-400 text-center py-8">当日暂无时间记录</p>
            ) : (
              sortedRecords.map(record => {
                const isRunning = !record.endTime;
                const recordElapsedTime = isRunning && record.startTimestamp 
                  ? Math.floor((Date.now() - record.startTimestamp) / 1000) 
                  : 0;
                
                return (
                  <div
                    key={record.id}
                    className={`p-4 rounded-lg border ${
                      isRunning ? 'border-red-200 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`font-medium ${isRunning ? 'text-red-600' : 'text-gray-800'}`}>
                          {record.content}
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-500">
                            开始: {formatTime(record.createdAt)}
                          </span>
                          {!isRunning && record.endTime && (
                            <span className="text-sm text-gray-500">
                              结束: {formatTime(record.endTime)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-sm flex items-center gap-1 ${isRunning ? 'text-red-600' : 'text-purple-600'}`}>
                            <Clock className="w-4 h-4" />
                            时长: {isRunning ? formatDuration(recordElapsedTime) : formatDurationFromTime(record.startTime, record.endTime)}
                          </span>
                        </div>
                        {record.note && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                            <p className="text-sm text-gray-700">{record.note}</p>
                          </div>
                        )}
                        {noteId === record.id && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <textarea
                              value={noteContent}
                              onChange={(e) => setNoteContent(e.target.value)}
                              placeholder="添加备注..."
                              rows={2}
                              className="w-full px-2 py-1 text-sm border-none bg-transparent focus:outline-none resize-none"
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={handleSaveNote}
                                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setNoteId(null)}
                                className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {record.endTime && (
                          <button
                            onClick={() => handleOpenNote(record)}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="备注"
                          >
                            <StickyNote className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onDelete(record.id);
                            addToast('记录已删除', 'info');
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}