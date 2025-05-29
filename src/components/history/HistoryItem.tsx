'use client';

import { Star, ExternalLink, Clock, FileText, Search as SearchIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface HistoryItemProps {
  id: string;
  title: string;
  timestamp: string;
  content: string;
  isFavorited?: boolean;
  type: 'search' | 'paper';
  authors?: string;
  journal?: string;
  year?: string;
  query?: string; // 検索クエリを保存（再検索用）
  url?: string; // 論文の場合のURL
  viewMode?: 'grid' | 'list'; // 表示モード
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
  onDelete?: (id: string) => void;
}

export default function HistoryItem({
  id,
  title,
  timestamp,
  content,
  isFavorited = false,
  type,
  authors,
  journal,
  year,
  query,
  url,
  viewMode = 'grid',
  onToggleFavorite,
  onDelete,
}: HistoryItemProps) {
  const [isFavorite, setIsFavorite] = useState(isFavorited);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation(); // アイテムクリックイベントの伝播を防ぐ
    setIsLoading(true);

    try {
      const newFavoriteState = !isFavorite;
      setIsFavorite(newFavoriteState);

      if (onToggleFavorite) {
        await onToggleFavorite(id, newFavoriteState);
      }
    } catch (error) {
      // エラーが発生した場合は元の状態に戻す
      setIsFavorite(isFavorite);
      console.error('お気に入りの更新に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemClick = () => {
    if (type === 'search' && query) {
      // 検索履歴の場合は結果画面に遷移
      const encodedQuery = encodeURIComponent(query);
      router.push(`/results?q=${encodedQuery}&lang=ja&from=history&historyId=${id}`);
    } else if (type === 'paper' && url) {
      // 論文履歴の場合は外部リンクを開く
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // アイテムクリックイベントの伝播を防ぐ

    if (onDelete && window.confirm('この履歴を削除しますか？')) {
      try {
        await onDelete(id);
      } catch (error) {
        console.error('履歴の削除に失敗しました:', error);
      }
    }
  };

  // グリッド表示用の短縮コンテンツ
  const truncatedContent =
    viewMode === 'grid' && content.length > 120 ? content.substring(0, 120) + '...' : content;

  return (
    <div
      className={`
        group bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg
        border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600
        transition-all duration-200 cursor-pointer overflow-hidden
        theme-transition-colors transform hover:scale-[1.02] active:scale-[0.98]
        ${viewMode === 'grid' ? 'h-full flex flex-col' : ''}
        ${viewMode === 'list' ? 'p-4 sm:p-6' : 'p-4 sm:p-5'}
      `}
      data-type={`${type}-item`}
      data-favorited={isFavorite}
      onClick={handleItemClick}
    >
      {/* ヘッダー部分 */}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        {/* タイプアイコンとタイトル */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* タイプアイコン */}
          <div
            className={`
            flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center
            ${
              type === 'search'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                : 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
            }
          `}
          >
            {type === 'search' ? (
              <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>

          {/* タイトル */}
          <div className="flex-1 min-w-0">
            <h3
              className={`
                font-semibold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2 
                group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors
                ${viewMode === 'grid' ? 'text-sm sm:text-base line-clamp-2' : 'text-base sm:text-lg line-clamp-1'}
              `}
            >
              {title}
            </h3>

            {/* タイムスタンプ */}
            <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{timestamp}</span>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
          {/* お気に入りボタン */}
          <button
            onClick={toggleFavorite}
            disabled={isLoading}
            className={`
              p-1.5 sm:p-2 rounded-lg transition-all duration-200 group/fav
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              ${
                isFavorite
                  ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
                  : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
          >
            <Star
              className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover/fav:scale-110 ${
                isFavorite ? 'fill-current' : ''
              }`}
            />
          </button>

          {/* 削除ボタン */}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="
                p-1.5 sm:p-2 rounded-lg transition-all duration-200 group/del
                text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
              "
              title="削除"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover/del:scale-110" />
            </button>
          )}

          {/* 外部リンクアイコン */}
          <div className="p-1.5 sm:p-2">
            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* メタデータ（論文の場合） */}
      {type === 'paper' && (
        <div className={`mb-3 sm:mb-4 ${viewMode === 'grid' ? 'space-y-1' : 'space-y-2'}`}>
          {authors && (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
              <span className="font-medium">著者:</span> {authors}
            </p>
          )}
          {(year || journal) && (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
              {year && <span className="font-medium">発表年:</span>} {year}
              {year && journal && ' | '}
              {journal && <span className="font-medium">ジャーナル:</span>} {journal}
            </p>
          )}
        </div>
      )}

      {/* コンテンツ */}
      <div className={`${viewMode === 'grid' ? 'flex-1' : ''} mb-4 sm:mb-6`}>
        <p
          className={`
            text-gray-700 dark:text-gray-300 leading-relaxed
            ${
              viewMode === 'grid'
                ? 'text-xs sm:text-sm line-clamp-3'
                : 'text-sm sm:text-base line-clamp-4'
            }
          `}
        >
          {truncatedContent}
        </p>
      </div>

      {/* フッター部分 */}
      <div
        className={`
        ${viewMode === 'grid' ? 'mt-auto pt-3 sm:pt-4' : 'pt-4 sm:pt-6'} 
        border-t border-gray-100 dark:border-gray-700
      `}
      >
        <div className="flex items-center justify-between">
          {/* アクションヒント */}
          <div className="flex-1">
            {type === 'search' && query && (
              <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                <SearchIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">クリックして検索結果を再表示</span>
                <span className="sm:hidden">再検索</span>
              </p>
            )}

            {type === 'paper' && url && (
              <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">クリックして論文を表示</span>
                <span className="sm:hidden">論文を表示</span>
              </p>
            )}
          </div>

          {/* タイプバッジ */}
          <div className="flex-shrink-0">
            <span
              className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${
                type === 'search'
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
              }
            `}
            >
              {type === 'search' ? '検索' : '論文'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
