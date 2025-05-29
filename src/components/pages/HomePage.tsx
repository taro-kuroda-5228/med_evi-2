import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchForm } from '~/components/SearchForm';
import { SearchHistory } from '~/components/SearchHistory';
import { SearchQuery } from '@prisma/client';

export function HomePage() {
  const navigate = useNavigate();

  const handleSearch = (query: SearchQuery) => {
    navigate(`/results/${query.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">メドエビデンス</h1>
          <p className="text-gray-600">エビデンスに基づく医療情報を検索できます。</p>
        </div>

        <SearchForm />

        <div className="mt-8">
          <SearchHistory onSelectQuery={handleSearch} />
        </div>
      </div>
    </div>
  );
}
