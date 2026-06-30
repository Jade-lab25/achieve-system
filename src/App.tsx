import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppState } from './store';
import { Navigation } from './components/Navigation';
import { BottomNavigation } from './components/BottomNavigation';
import { TodoList } from './components/TodoList';
import { CheckInSystem } from './components/CheckInSystem';
import { TimeRecorder } from './components/TimeRecorder';
import { AchievementSystem } from './components/AchievementSystem';
import { AchievementShop } from './components/AchievementShop';
import { InspirationBoard } from './components/InspirationBoard';
import { CalendarView } from './components/CalendarView';
import { DataSync } from './components/DataSync';
import { DateDetail } from './components/DateDetail';
import { Auth } from './components/Auth';
import { useSync } from './hooks/useSync';
import { auth as supabaseAuth } from './supabase/database';

type TabType = 'todo' | 'checkin' | 'time' | 'achievement' | 'shop' | 'inspiration' | 'sync';
type BottomTabType = 'todos' | 'checkin' | 'inspirations' | 'timerecords' | 'settings' | 'shop';

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
    hydrateState,
    // 成就商店
    addShopItem,
    deleteShopItem,
    purchaseShopItem,
  } = useAppState();

  // ✅ useCallback 防止每次渲染创建新函数，稳定 fetchFromCloud 依赖
  const handleDataFetched = useCallback((data: any) => {
    const logs = data.achievementLogs || [];
    const totalEarned = logs
      .filter((log: any) => log.type === 'task' || log.type === 'todo')
      .reduce((sum: number, log: any) => sum + (log.points || 0), 0);
    const totalSpent = logs
      .filter((log: any) => log.type === 'commodity' || log.type === 'shop_purchase')
      .reduce((sum: number, log: any) => sum + Math.abs(log.points || 0), 0);
    const totalAchievements = totalEarned - totalSpent;

    hydrateState({
      todos: data.todos,
      checkInProjects: data.checkInProjects,
      checkInRecords: data.checkInRecords,
      timeRecords: data.timeRecords,
      achievementLogs: logs,
      inspirations: data.inspirations,
      shopItems: data.shopItems,
      totalAchievements,
      totalEarned,
      totalSpent,
    });
  }, [hydrateState]);

  // ✅ useMemo 防止 options 对象每渲染重建，稳定 useSync 内部所有 callback
  const syncOptions = useMemo(() => ({ onDataFetched: handleDataFetched }), [handleDataFetched]);

  const { syncState, fetchFromCloud, performSync, syncOnChange } = useSync(userId, syncOptions);

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

  // ✅ 当 state 变化时触发同步（自动保存 + 延迟上传）
  useEffect(() => {
    syncOnChange(userId, state);
  }, [userId, state, syncOnChange]);

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
      shop: 'shop',
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
      case 'shop':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-3">
              <AchievementShop
                items={state.shopItems}
                balance={state.totalAchievements}
                onAddItem={addShopItem}
                onPurchase={purchaseShopItem}
                onDeleteItem={deleteShopItem}
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