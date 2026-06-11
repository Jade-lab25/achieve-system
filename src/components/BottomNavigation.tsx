import { ListTodo, Calendar, Star, Clock, Settings } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: 'todos' | 'checkin' | 'inspirations' | 'timerecords' | 'settings') => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs: { id: 'todos' | 'checkin' | 'inspirations' | 'timerecords' | 'settings'; icon: typeof ListTodo; label: string }[] = [
    { id: 'todos', icon: ListTodo, label: '待办' },
    { id: 'checkin', icon: Calendar, label: '打卡' },
    { id: 'inspirations', icon: Star, label: '事件' },
    { id: 'timerecords', icon: Clock, label: '时间' },
    { id: 'settings', icon: Settings, label: '设置' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] transition-all duration-200 ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}
              title={tab.label}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}