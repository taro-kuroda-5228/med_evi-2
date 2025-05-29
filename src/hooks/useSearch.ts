import { useState } from 'react';
import { PubMedClient, SearchResult } from '../lib/pubmed-client';

export const useSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const client = new PubMedClient();

  const search = async (query: string, page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await client.search(query, page);
      setSearchResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '検索中にエラーが発生しました');
      setSearchResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    searchResult,
    search,
  };
};
