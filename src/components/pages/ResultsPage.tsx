import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '~/client/api';
import { SearchResults } from '~/components/SearchResults';
import { Button } from '~/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: results,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['searchResults', id],
    queryFn: async () => {
      if (!id) throw new Error('検索IDが指定されていません');
      const response = await apiClient.getSearchResults(id);
      if (!response.success) {
        throw new Error(response.error?.message || '検索結果の取得に失敗しました');
      }
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-red-500">
            エラーが発生しました: {error instanceof Error ? error.message : '予期せぬエラー'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          検索ページに戻る
        </Button>

        {results && <SearchResults results={results} />}
      </div>
    </div>
  );
}
