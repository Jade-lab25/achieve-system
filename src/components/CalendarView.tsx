import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, Target, ListTodo, Clock } from 'lucide-react';

interface CalendarViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  dailyStats: (date: string) => { totalAchievements: number; checkInCount: number };
  monthlyStats: (date: string) => { totalAchievements: number; checkInCount: number; todoCount: number; timeRecordCount: number };
  yearlyStats: (date: string) => { totalAchievements: number; checkInCount: number; todoCount: number; timeRecordCount: number };
}

export function CalendarView({ selectedDate, onSelectDate, dailyStats, monthlyStats, yearlyStats }: CalendarViewProps) {
  const [currentYear, setCurrentYear] = useState(new Date(selectedDate).getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate).getMonth());

  const today = new Date().toISOString().split('T')[0];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    onSelectDate(now.toISOString().split('T')[0]);
  };

  const renderDays = () => {
    const days = [];
    const emptyDays = firstDayOfMonth;
    
    for (let i = 0; i < emptyDays; i++) {
      days.push(<div key={`empty-${i}`} className="h-12" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const stats = dailyStats(date);
      const isSelected = selectedDate === date;
      const isToday = today === date;

      days.push(
        <button
          key={date}
          onClick={() => onSelectDate(date)}
          className={`h-12 rounded-lg flex flex-col items-center justify-center transition-colors relative ${
            isSelected
              ? 'bg-blue-500 text-white'
              : isToday
              ? 'bg-blue-100 text-blue-700'
              : 'hover:bg-gray-100 text-gray-800'
          }`}
        >
          <span className="text-sm font-medium">{day}</span>
          {stats.totalAchievements !== 0 && (
            <span className={`text-xs mt-0.5 ${
              isSelected ? 'text-white' : stats.totalAchievements > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.totalAchievements > 0 ? '+' : ''}{stats.totalAchievements}
            </span>
          )}
          {stats.checkInCount > 0 && (
            <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
              isSelected ? 'bg-white' : 'bg-green-500'
            }`} />
          )}
        </button>
      );
    }

    return days;
  };

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  const currentDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const monthStats = monthlyStats(currentDateStr);
  const yearStats = yearlyStats(currentDateStr);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-500" />
        日历视图
      </h2>

      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-medium text-gray-600">本月汇总</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-green-500" />
            <span className="text-gray-600">成就值:</span>
            <span className="font-medium text-green-600">{monthStats.totalAchievements}</span>
          </div>
          <div className="flex items-center gap-1">
            <ListTodo className="w-3 h-3 text-blue-500" />
            <span className="text-gray-600">待办:</span>
            <span className="font-medium text-blue-600">{monthStats.todoCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-500" />
            <span className="text-gray-600">打卡:</span>
            <span className="font-medium text-purple-600">{monthStats.checkInCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-orange-500" />
            <span className="text-gray-600">时间:</span>
            <span className="font-medium text-orange-600">{monthStats.timeRecordCount}</span>
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-medium text-gray-600">本年汇总</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-green-500" />
            <span className="text-gray-600">成就值:</span>
            <span className="font-medium text-green-600">{yearStats.totalAchievements}</span>
          </div>
          <div className="flex items-center gap-1">
            <ListTodo className="w-3 h-3 text-blue-500" />
            <span className="text-gray-600">待办:</span>
            <span className="font-medium text-blue-600">{yearStats.todoCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-500" />
            <span className="text-gray-600">打卡:</span>
            <span className="font-medium text-purple-600">{yearStats.checkInCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-orange-500" />
            <span className="text-gray-600">时间:</span>
            <span className="font-medium text-orange-600">{yearStats.timeRecordCount}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-4">
          <span className="text-gray-800 font-medium">
            {currentYear}年 {monthNames[currentMonth]}
          </span>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            今天
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-sm text-gray-500 font-medium">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>
    </div>
  );
}