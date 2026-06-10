import { useState, useCallback } from 'react';
import { Download, Upload, FileJson, FileText, CloudUpload, CloudDownload, RefreshCw } from 'lucide-react';

interface DataSyncProps {
  onExport: () => string;
  onImport: (data: string) => boolean;
  onSyncToCloud?: () => Promise<any>;
  onSyncFromCloud?: () => Promise<any>;
  isSyncing?: boolean;
  lastSync?: string | null;
  isOnline?: boolean;
}

export function DataSync({ onExport, onImport, onSyncToCloud, onSyncFromCloud, isSyncing, lastSync, isOnline }: DataSyncProps) {
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const showMessage = useCallback((msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  }, []);

  const handleExport = () => {
    const data = onExport();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-status-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage('JSON 数据导出成功', 'success');
  };

  const handleExportCSV = () => {
    const data = JSON.parse(onExport());
    let csv = '';
    
    if (data.todos && data.todos.length > 0) {
      csv += '待办清单\n';
      csv += 'ID,标题,创建时间,完成时间,是否完成,拖延次数,累计时长\n';
      data.todos.forEach((todo: any) => {
        csv += `${todo.id},"${todo.title}",${todo.createdAt},${todo.completedAt || ''},${todo.isCompleted ? '是' : '否'},${todo.delayCount || 0},${todo.totalTime || 0}\n`;
      });
      csv += '\n';
    }

    if (data.checkInProjects && data.checkInProjects.length > 0) {
      csv += '打卡项目\n';
      csv += 'ID,名称,类型,成就值,创建时间\n';
      data.checkInProjects.forEach((project: any) => {
        csv += `${project.id},"${project.name}",${project.type === 'task' ? '任务库' : '商品库'},${project.points},${project.createdAt}\n`;
      });
      csv += '\n';
    }

    if (data.checkInRecords && data.checkInRecords.length > 0) {
      csv += '打卡记录\n';
      csv += 'ID,项目ID,项目名称,类型,成就值,创建时间\n';
      data.checkInRecords.forEach((record: any) => {
        csv += `${record.id},${record.projectId},"${record.projectName}",${record.type === 'task' ? '任务库' : '商品库'},${record.points},${record.createdAt}\n`;
      });
      csv += '\n';
    }

    if (data.timeRecords && data.timeRecords.length > 0) {
      csv += '时间记录\n';
      csv += 'ID,开始时间,结束时间,内容,备注,创建时间\n';
      data.timeRecords.forEach((record: any) => {
        csv += `${record.id},${record.startTime},${record.endTime},"${record.content || ''}","${record.note || ''}",${record.createdAt}\n`;
      });
      csv += '\n';
    }

    if (data.inspirations && data.inspirations.length > 0) {
      csv += '灵感记录\n';
      csv += 'ID,内容,创建时间\n';
      data.inspirations.forEach((inspiration: any) => {
        csv += `${inspiration.id},"${inspiration.content}",${inspiration.createdAt}\n`;
      });
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-status-backup-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage('CSV 数据导出成功', 'success');
  };

  const handleTextImport = () => {
    if (!importText.trim()) {
      showMessage('请输入要导入的数据', 'error');
      return;
    }

    try {
      JSON.parse(importText);
    } catch {
      showMessage('无效的JSON数据', 'error');
      return;
    }

    const success = onImport(importText);
    if (success) {
      showMessage('数据导入成功', 'success');
      setImportText('');
    } else {
      showMessage('数据导入失败', 'error');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>, type: 'json' | 'csv') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      if (type === 'json') {
        try {
          JSON.parse(content);
        } catch {
          showMessage('无效的JSON文件', 'error');
          return;
        }
        
        const success = onImport(content);
        if (success) {
          showMessage('JSON 数据导入成功', 'success');
        } else {
          showMessage('JSON 数据导入失败', 'error');
        }
      } else {
        const jsonData = csvToJson(content);
        if (jsonData) {
          const success = onImport(JSON.stringify(jsonData));
          if (success) {
            showMessage('CSV 数据导入成功', 'success');
          } else {
            showMessage('CSV 数据导入失败', 'error');
          }
        } else {
          showMessage('无效的CSV文件', 'error');
        }
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const csvToJson = (csv: string) => {
    try {
      const lines = csv.split('\n').filter(line => line.trim());
      const result: any = {
        todos: [],
        checkInProjects: [],
        checkInRecords: [],
        timeRecords: [],
        inspirations: [],
        achievementLogs: [],
        totalAchievements: 0,
        totalEarned: 0,
        totalSpent: 0,
      };

      let currentSection = '';
      let headers: string[] = [];

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (trimmed === '待办清单' || trimmed === '打卡项目' || trimmed === '打卡记录' || trimmed === '时间记录' || trimmed === '灵感记录') {
          currentSection = trimmed;
          headers = [];
          return;
        }

        if (headers.length === 0) {
          headers = trimmed.split(',').map(h => h.trim());
          return;
        }

        const values = parseCSVLine(line);
        const item: any = {};
        headers.forEach((header, index) => {
          item[header] = values[index] || '';
        });

        switch (currentSection) {
          case '待办清单':
            result.todos.push({
              id: item['ID'] || Date.now().toString(),
              title: item['标题'] || '',
              createdAt: item['创建时间'] || new Date().toISOString(),
              completedAt: item['完成时间'] || null,
              isCompleted: item['是否完成'] === '是',
              isDelayed: false,
              delayCount: parseInt(item['拖延次数']) || 0,
              totalTime: parseFloat(item['累计时长']) || 0,
              isTiming: false,
              timingStartTime: null,
              timingRecordId: null,
            });
            break;
          case '打卡项目':
            result.checkInProjects.push({
              id: item['ID'] || Date.now().toString(),
              name: item['名称'] || '',
              type: (item['类型'] === '任务库' ? 'task' : 'commodity') as 'task' | 'commodity',
              points: parseInt(item['成就值']) || 0,
              createdAt: item['创建时间'] || new Date().toISOString(),
            });
            break;
          case '打卡记录':
            result.checkInRecords.push({
              id: item['ID'] || Date.now().toString(),
              projectId: item['项目ID'] || '',
              projectName: item['项目名称'] || '',
              type: (item['类型'] === '任务库' ? 'task' : 'commodity') as 'task' | 'commodity',
              points: parseInt(item['成就值']) || 0,
              createdAt: item['创建时间'] || new Date().toISOString(),
            });
            break;
          case '时间记录':
            result.timeRecords.push({
              id: item['ID'] || Date.now().toString(),
              startTime: item['开始时间'] || '',
              endTime: item['结束时间'] || null,
              content: item['内容'] || '',
              note: item['备注'] || '',
              createdAt: item['创建时间'] || new Date().toISOString(),
            });
            break;
          case '灵感记录':
            result.inspirations.push({
              id: item['ID'] || Date.now().toString(),
              content: item['内容'] || '',
              createdAt: item['创建时间'] || new Date().toISOString(),
            });
            break;
        }
      });

      return result;
    } catch {
      return null;
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Download className="w-5 h-5 text-indigo-500" />
        数据同步
      </h2>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">云端同步</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${
              isOnline ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {isOnline ? '在线' : '离线'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onSyncToCloud?.()}
              disabled={!isOnline || isSyncing}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              {isSyncing ? '同步中...' : '上传到云端'}
            </button>
            <button
              onClick={async () => {
                if (!isOnline || isSyncing) return;
                await onSyncFromCloud?.();
                showMessage('数据已从云端下载，页面即将刷新...', 'success');
                setTimeout(() => window.location.reload(), 1500);
              }}
              disabled={!isOnline || isSyncing}
              className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CloudDownload className="w-4 h-4" />
              )}
              {isSyncing ? '同步中...' : '从云端下载'}
            </button>
          </div>
          {lastSync && (
            <p className="mt-2 text-xs text-gray-400">
              最后同步: {new Date(lastSync).toLocaleString('zh-CN')}
            </p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">导出数据</h3>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
              <FileJson className="w-4 h-4" />
              导出 JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              导出 CSV
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">文件导入</h3>
          <div className="flex gap-2">
            <label className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-center gap-2">
              <FileJson className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">导入 JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={(e) => handleFileImport(e, 'json')}
                className="hidden"
              />
            </label>
            <label className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer flex items-center justify-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">导入 CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileImport(e, 'csv')}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">文本导入（JSON）</h3>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="粘贴JSON数据..."
            rows={6}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
          />
          <button
            onClick={handleTextImport}
            className="mt-2 w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            导入数据
          </button>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="text-xs font-medium text-gray-500 mb-1">导入格式说明</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• JSON 文件：直接导出的 JSON 备份文件</li>
            <li>• CSV 文件：直接导出的 CSV 备份文件，支持待办清单、打卡项目、打卡记录、时间记录、灵感记录</li>
            <li>• 文本导入：支持粘贴 JSON 格式的数据</li>
          </ul>
        </div>
      </div>
    </div>
  );
}