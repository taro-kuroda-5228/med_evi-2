import { useCallback, useEffect, useState } from 'react';
import { HistoryItem } from '../components/history/HistoryList';

const STORAGE_KEY = 'search_history';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 初期化: localStorageから読み込み
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setHistory(JSON.parse(raw));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  // 履歴をlocalStorageに保存
  const saveHistory = useCallback((items: HistoryItem[]) => {
    setHistory(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  // 履歴追加
  const addHistory = useCallback(
    (query: string) => {
      const newItem: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        query,
        timestamp: Date.now(),
      };
      // 既存の同一クエリは削除して先頭に追加
      const filtered = history.filter(item => item.query !== query);
      const updated = [newItem, ...filtered].slice(0, 20); // 最大20件
      saveHistory(updated);
    },
    [history, saveHistory]
  );

  // 履歴削除
  const deleteHistory = useCallback(
    (id: string) => {
      const updated = history.filter(item => item.id !== id);
      saveHistory(updated);
    },
    [history, saveHistory]
  );

  // 全履歴クリア
  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  return {
    history,
    addHistory,
    deleteHistory,
    clearHistory,
  };
}
