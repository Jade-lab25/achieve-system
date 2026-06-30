import { Check, Clock, Timer, Trophy, Download, Lightbulb, ShoppingCart } from 'lucide-react';

type TabType = 'todo' | 'checkin' | 'time' | 'achievement' | 'inspiration' | 'shop' | 'sync';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const tabs = [
    { id: 'todo' as TabType, icon: Check, label: '待办清单' },
    { id: 'checkin' as TabType, icon: Clock, label: '打卡系统' },
    { id: 'time' as TabType, icon: Timer, label: '时间记录' },
    { id: 'achievement' as TabType, icon: Trophy, label: '成就系统' },
    { id: 'shop' as TabType, icon: ShoppingCart, label: '成就商店' },
    { id: 'inspiration' as TabType, icon: Lightbulb, label: '灵感记录' },
    { id: 'sync' as TabType, icon: Download, label: '数据同步' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
            <h1 className="text-base md:text-xl font-bold text-gray-800">工作状态记录</h1>
          </div>
          
          <div className="hidden md:flex items-center gap-1 lg:flex overflow-x-auto hide-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-xs md:text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}