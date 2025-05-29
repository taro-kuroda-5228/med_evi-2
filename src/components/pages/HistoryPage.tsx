import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchHistory } from '~/components/SearchHistory';
import { SearchQuery } from '@prisma/client';

export function HistoryPage() {
  const navigate = useNavigate();

  const handleSearch = (query: SearchQuery) => {
    navigate(`/results/${query.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">検索履歴</h1>
        <SearchHistory onSelectQuery={handleSearch} />
      </div>
    </div>
  );
}
