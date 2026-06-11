import { useState, useEffect } from 'react';
import { useAppState } from './store';
import { Navigation } from './components/Navigation';
import { BottomNavigation } from './components/BottomNavigation';
import { TodoList } from './components/TodoList';
import { CheckInSystem } from './components/CheckInSystem';
import { TimeRecorder } from './components/TimeRecorder';
import { AchievementSystem } from './components/AchievementSystem';
import { InspirationBoard } from './components/InspirationBoard';
import { CalendarView } from './components/CalendarView';
import { DataSync } from './components/DataSync';
import { DateDetail } from './components/DateDetail';
import { Auth } from './components/Auth';
import { useSync } from './hooks/useSync';
import { auth as supabaseAuth } from './supabase/database';

type TabType = 'todo' | 'checkin' | 'time' | 'achievement' | 'inspiration' | 'sync';
type BottomTabType = 'todos' | 'checkin' | 'inspirations' | 'timerecords' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('todo');
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTabType>('todos');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState('');

  const {
    state,
    addTodo,
    completeTodo,
    deleteTodo,
    clearCompletedTodos,
    toggleDelayTodo,
    updateTodo,
    pinTodo,
    startTodoTiming,
    endTodoTiming,
    addCheckInProject,
    deleteCheckInProject,
    checkIn,
    deleteTimeRecord,
    updateTimeRecordNote,
    startTimer,
    endTimer,
    addInspiration,
    deleteInspiration,
    updateInspiration,
    moveInspirationToTodo,
    pinInspiration,
    exportData,
    importData,
    getDailyStats,
    getRecordsByDate,
    getMonthlyStats,
    getYearlyStats,
  } = useAppState();

  const { syncState, fetchFromCloud, performSync } = useSync(userId);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await supabaseAuth.getCurrentUser();
      if (user) {
        setIsAuthenticated(true);
        setUserId(user.id);
        await fetchFromCloud(user.id);
      }
    };
    checkAuth();
  }, [fetchFromCloud]);

  const handleLogin = async () => {
    const user = await supabaseAuth.getCurrentUser();
    if (user) {
      setIsAuthenticated(true);
      setUserId(user.id);
      await fetchFromCloud(user.id);
      setSyncMessage('登录成功，正在同步数据...');
      setTimeout(() => setSyncMessage(''), 3000);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserId(null);
    setSyncMessage('已退出登录');
    setTimeout(() => setSyncMessage(''), 3000);
  };

  const handleBottomTabChange = (tab: BottomTabType) => {
    setActiveBottomTab(tab);
    const tabMap: Record<BottomTabType, TabType> = {
      todos: 'todo',
      checkin: 'checkin',
      inspirations: 'inspiration',
      timerecords: 'time',
      settings: 'sync',
    };
    setActiveTab(tabMap[tab]);
  };

  const recordsByDate = getRecordsByDate(selectedDate);
  const dailyStats = getDailyStats(selectedDate);

  const renderContent = () => {
    switch (activeTab) {
      case 'todo':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <TodoList
                todos={state.todos}
                onAdd={addTodo}
                onComplete={completeTodo}
                onDelete={deleteTodo}
                onClearCompleted={clearCompletedTodos}
                onToggleDelay={toggleDelayTodo}
                onUpdate={updateTodo}
                onPin={pinTodo}
                onStartTiming={startTodoTiming}
                onEndTiming={endTodoTiming}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <CalendarView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                dailyStats={getDailyStats}
                monthlyStats={getMonthlyStats}
                yearlyStats={getYearlyStats}
              />
            </div>
          </div>
        );
      case 'checkin':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <CheckInSystem
                projects={state.checkInProjects}
                records={state.checkInRecords}
                onAddProject={addCheckInProject}
                onDeleteProject={deleteCheckInProject}
                onCheckIn={checkIn}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <CalendarView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                dailyStats={getDailyStats}
                monthlyStats={getMonthlyStats}
                yearlyStats={getYearlyStats}
              />
            </div>
          </div>
        );
      case 'time':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <TimeRecorder
                records={state.timeRecords}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onStartTimer={startTimer}
                onEndTimer={endTimer}
                onDelete={deleteTimeRecord}
                onUpdateNote={updateTimeRecordNote}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <CalendarView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                dailyStats={getDailyStats}
                monthlyStats={getMonthlyStats}
                yearlyStats={getYearlyStats}
              />
            </div>
          </div>
        );
      case 'achievement':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <AchievementSystem
                logs={state.achievementLogs}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <CalendarView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                dailyStats={getDailyStats}
                monthlyStats={getMonthlyStats}
                yearlyStats={getYearlyStats}
              />
            </div>
          </div>
        );
      case 'inspiration':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <InspirationBoard
                inspirations={state.inspirations}
                onAdd={addInspiration}
                onDelete={deleteInspiration}
                onUpdate={updateInspiration}
                onMoveToTodo={moveInspirationToTodo}
                onPin={pinInspiration}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <CalendarView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                dailyStats={getDailyStats}
                monthlyStats={getMonthlyStats}
                yearlyStats={getYearlyStats}
              />
            </div>
          </div>
        );
      case 'sync':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <DataSync
                onExport={exportData}
                onImport={importData}
                onSyncToCloud={() => userId ? performSync(userId) : Promise.resolve()}
                onSyncFromCloud={() => userId ? fetchFromCloud(userId) : Promise.resolve()}
                isSyncing={syncState.isSyncing}
                lastSync={syncState.lastSync}
                isOnline={syncState.isOnline}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <CalendarView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                dailyStats={getDailyStats}
                monthlyStats={getMonthlyStats}
                yearlyStats={getYearlyStats}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <Auth onLogin={handleLogin} onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {syncMessage && (
        <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white text-center py-1.5 md:py-2 z-50 text-sm">
          {syncMessage}
        </div>
      )}
      
      {syncState.syncMessage && (
        <div className={`fixed top-10 md:top-12 left-0 right-0 text-center py-1.5 md:py-2 z-50 ${
          syncState.syncStatus === 'error' ? 'bg-red-500' : 
          syncState.syncStatus === 'synced' ? 'bg-green-500' : 'bg-blue-500'
        } text-white text-sm`}>
          {syncState.syncMessage}
        </div>
      )}

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-6 pb-20 md:pb-0">
        {renderContent()}
        
        {activeTab !== 'todo' && activeTab !== 'inspiration' && (
          <div className="mt-6">
            <DateDetail
              activeTab={activeTab}
              date={selectedDate}
              checkInRecords={recordsByDate.checkInRecords}
              timeRecords={recordsByDate.timeRecords}
              achievementLogs={recordsByDate.achievementLogs}
              totalAchievements={dailyStats.totalAchievements}
              checkInCount={dailyStats.checkInCount}
            />
          </div>
        )}
      </main>

      <BottomNavigation 
        activeTab={activeBottomTab} 
        onTabChange={handleBottomTabChange} 
      />
    </div>
  );
}

export default App;