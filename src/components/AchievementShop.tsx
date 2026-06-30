import { useState } from 'react';
import { Plus, ShoppingCart, Tag, Trash2, Star, Coffee, Gamepad2, BookOpen } from 'lucide-react';
import type { ShopCategory, ShopItem } from '../types';

// 分类图标映射
const categoryIcons: Record<ShopCategory, React.ReactNode> = {
  life: <Coffee className="w-5 h-5" />,
  study: <BookOpen className="w-5 h-5" />,
  work: <Star className="w-5 h-5" />,
  entertainment: <Gamepad2 className="w-5 h-5" />,
  other: <Tag className="w-5 h-5" />,
};

// 分类显示名称
const categoryNames: Record<ShopCategory, string> = {
  life: '生活',
  study: '学习',
  work: '工作',
  entertainment: '娱乐',
  other: '其他',
};

interface AchievementShopProps {
  items: ShopItem[];
  balance: number;
  onAddItem: (name: string, price: number, category: ShopCategory, description: string) => void;
  onPurchase: (itemId: string) => boolean;
  onDeleteItem: (itemId: string) => void;
}

export function AchievementShop({ items, balance, onAddItem, onPurchase, onDeleteItem }: AchievementShopProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory | 'all'>('all');
  const [showPurchased, setShowPurchased] = useState(false);

  // 新商品表单
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(100);
  const [newItemCategory, setNewItemCategory] = useState<ShopCategory>('other');
  const [newItemDescription, setNewItemDescription] = useState('');

  const filteredItems = items.filter(item => {
    const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
    const purchasedMatch = showPurchased ? true : !item.isPurchased;
    return categoryMatch && purchasedMatch;
  });

  const handleAddItem = () => {
    if (newItemName.trim() && newItemPrice > 0) {
      onAddItem(newItemName.trim(), newItemPrice, newItemCategory, newItemDescription.trim());
      setNewItemName('');
      setNewItemPrice(100);
      setNewItemDescription('');
      setShowAddModal(false);
    }
  };

  const handlePurchase = (itemId: string) => {
    const success = onPurchase(itemId);
    if (!success) {
      alert('成就值不足！');
    }
  };

  const purchasedCount = items.filter(i => i.isPurchased).length;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-indigo-500" />
          <h2 className="text-xl font-bold text-gray-800">成就商店</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-lg">
            <Star className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-amber-700">{balance}</span>
            <span className="text-sm text-amber-600">成就值</span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">添加商品</span>
          </button>
        </div>
      </div>

      {/* 统计 */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        <span className="text-gray-500">
          已实现愿望: <span className="font-semibold text-green-600">{purchasedCount}</span> / {items.length}
        </span>
      </div>

      {/* 筛选器 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            selectedCategory === 'all'
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        {(Object.keys(categoryNames) as ShopCategory[]).map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1 transition-colors ${
              selectedCategory === category
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {categoryIcons[category]}
            {categoryNames[category]}
          </button>
        ))}
        <label className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showPurchased}
            onChange={(e) => setShowPurchased(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-500"
          />
          显示已购买
        </label>
      </div>

      {/* 商品列表 */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>暂无商品，点击上方按钮添加你的第一个愿望吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                item.isPurchased
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`p-2 rounded-lg ${
                    item.isPurchased ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {categoryIcons[item.category]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {categoryNames[item.category]}
                  </span>
                </div>
                {!item.isPurchased && (
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <h3 className={`font-semibold mb-2 ${
                item.isPurchased ? 'text-green-700 line-through' : 'text-gray-800'
              }`}>
                {item.name}
              </h3>

              {item.description && (
                <p className="text-sm text-gray-500 mb-3">{item.description}</p>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1">
                  <Star className={`w-4 h-4 ${
                    item.isPurchased ? 'text-green-500' : 'text-amber-500'
                  }`} />
                  <span className={`font-bold ${
                    item.isPurchased ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {item.price}
                  </span>
                </div>

                {item.isPurchased ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                    已实现 ✓
                  </span>
                ) : (
                  <button
                    onClick={() => handlePurchase(item.id)}
                    disabled={balance < item.price}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      balance >= item.price
                        ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    购买
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 添加商品模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">添加新愿望</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  愿望名称 *
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：买一杯星巴克咖啡"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  所需成就值 *
                </label>
                <input
                  type="number"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(categoryNames) as ShopCategory[]).map(category => (
                    <button
                      key={category}
                      onClick={() => setNewItemCategory(category)}
                      className={`p-2 rounded-lg text-sm flex flex-col items-center gap-1 transition-colors ${
                        newItemCategory === category
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {categoryIcons[category]}
                      {categoryNames[category]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注（可选）
                </label>
                <textarea
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="添加一些详细描述..."
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
                onClick={handleAddItem}
                disabled={!newItemName.trim() || newItemPrice < 1}
                className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
