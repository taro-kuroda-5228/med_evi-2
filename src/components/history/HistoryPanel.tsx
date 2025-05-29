import React from 'react';
import HistoryList from './HistoryList';
import { useHistory } from '../../hooks/useHistory';

interface HistoryPanelProps {
  onSearch: (query: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ onSearch }) => {
  const { history, deleteHistory, clearHistory } = useHistory();

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">検索履歴</h3>
        <button
          className="text-xs text-gray-500 hover:text-red-600 border px-2 py-1 rounded"
          onClick={clearHistory}
          disabled={history.length === 0}
        >
          全て削除
        </button>
      </div>
      <HistoryList items={history} onSearch={onSearch} onDelete={deleteHistory} />
    </div>
  );
};
