'use client';

import { useState } from 'react';
import HistoryItem from './HistoryItem';
import { Grid3X3, List, Filter } from 'lucide-react';

interface HistoryItemData {
  id: string;
  title: string;
  timestamp: string;
  content: string;
  isFavorited: boolean;
  type: 'search' | 'paper';
  authors?: string;
  journal?: string;
  year?: string;
  query?: string; // 検索クエリ（再検索用）
  url?: string; // 論文URL
}

interface HistoryListProps {
  title: string;
  items: HistoryItemData[];
  type: 'search' | 'paper';
  onToggleFavorite?: (id: string, isFavorite: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onReload?: () => void; // 履歴の再読み込み用
}

export default function HistoryList({
  title,
  items,
  type,
  onToggleFavorite,
  onDelete,
  onReload,
}: HistoryListProps) {
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);

  const filteredItems = showFavoritesOnly ? items.filter(item => item.isFavorited) : items;

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    if (onToggleFavorite) {
      setIsLoading(true);
      try {
        await onToggleFavorite(id, isFavorite);
        // 必要に応じて履歴を再読み込み
        if (onReload) {
          onReload();
        }
      } catch (error) {
        console.error('お気に入りの更新に失敗しました:', error);
        throw error; // HistoryItemに戻すためにエラーを再throw
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (onDelete) {
      setIsLoading(true);
      try {
        await onDelete(id);
        // 必要に応じて履歴を再読み込み
        if (onReload) {
          onReload();
        }
      } catch (error) {
        console.error('履歴の削除に失敗しました:', error);
        throw error; // HistoryItemに戻すためにエラーを再throw
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (items.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3 sm:mb-0">{title}</h2>
        </div>
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="text-gray-400 mb-6">
            <svg
              className="mx-auto h-20 w-20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">履歴がありません</h3>
          <p className="text-gray-500 text-base mb-4">
            {type === 'search'
              ? '検索を実行すると履歴が表示されます'
              : '論文を保存すると履歴が表示されます'}
          </p>
          <p className="text-gray-400 text-sm">
            医学的な質問を検索して、エビデンスに基づく回答を取得しましょう
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
            {title}{' '}
            <span className="text-lg font-normal text-gray-500">({filteredItems.length}件)</span>
          </h2>

          {/* コントロールパネル */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            {/* 表示切り替え（デスクトップのみ） */}
            <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`
                  flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    viewMode === 'grid'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }
                `}
                title="グリッド表示"
              >
                <Grid3X3 className="w-4 h-4 mr-1" />
                グリッド
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`
                  flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }
                `}
                title="リスト表示"
              >
                <List className="w-4 h-4 mr-1" />
                リスト
              </button>
            </div>

            {/* フィルター */}
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={`${type}FavoriteOnly`}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 focus:ring-offset-2"
                  checked={showFavoritesOnly}
                  onChange={e => setShowFavoritesOnly(e.target.checked)}
                />
                <label
                  htmlFor={`${type}FavoriteOnly`}
                  className="ml-2 text-sm text-gray-700 font-medium"
                >
                  お気に入りのみ
                </label>
              </div>

              {onReload && (
                <button
                  onClick={onReload}
                  disabled={isLoading}
                  className="
                    flex items-center px-3 py-2 text-blue-600 hover:text-blue-800 
                    text-sm font-medium disabled:opacity-50 transition-colors
                    bg-blue-50 hover:bg-blue-100 rounded-lg
                  "
                  title="更新"
                >
                  <svg
                    className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  更新
                </button>
              )}
            </div>
          </div>
        </div>

        {/* フィルター結果メッセージ */}
        {showFavoritesOnly && filteredItems.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <Filter className="w-4 h-4 text-yellow-600 mr-2" />
              <p className="text-yellow-700 text-sm">
                お気に入りの履歴がありません。フィルターを解除するか、項目をお気に入りに追加してください。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* アイテム表示 */}
      {filteredItems.length > 0 && (
        <div
          className={`
            ${
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6'
                : 'space-y-4 sm:space-y-6'
            }
          `}
        >
          {filteredItems.map(item => (
            <div
              key={item.id}
              className={`
                ${viewMode === 'grid' ? 'flex flex-col h-full' : ''}
              `}
            >
              <HistoryItem
                {...item}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
                viewMode={viewMode}
              />
            </div>
          ))}
        </div>
      )}

      {/* 読み込み状態表示 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-900 font-medium">処理中...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
