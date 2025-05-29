import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Folder {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface FavoritePaper {
  id: string;
  title: string;
  authors: string;
  journal: string;
  publication_year: number;
  doi?: string;
  pmid?: string;
  abstract?: string;
  url?: string;
  folder_id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // フォルダー関連API
  const folders = {
    // フォルダー一覧取得
    getAll: useCallback(async (): Promise<Folder[]> => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/folders`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'フォルダーの取得に失敗しました');
        }

        return data.folders;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    // フォルダー作成
    create: useCallback(async (name: string): Promise<Folder> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/folders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'フォルダーの作成に失敗しました');
        }

        return data.folder;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    // フォルダー削除
    delete: useCallback(async (folderId: string): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/folders?folderId=${folderId}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'フォルダーの削除に失敗しました');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),
  };

  // お気に入り論文関連API
  const favoritePapers = {
    // お気に入り論文一覧取得
    getAll: useCallback(async (folderId?: string): Promise<FavoritePaper[]> => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (folderId) params.append('folderId', folderId);

        const response = await fetch(`/api/favorite-papers?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'お気に入り論文の取得に失敗しました');
        }

        return data.papers;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    // お気に入り論文追加
    add: useCallback(async (paper: Omit<FavoritePaper, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<FavoritePaper> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/favorite-papers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paper),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'お気に入り論文の追加に失敗しました');
        }

        return data.paper;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    // お気に入り論文のフォルダー移動
    moveToFolder: useCallback(async (paperId: string, folderId?: string): Promise<FavoritePaper> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/favorite-papers', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paperId, folderId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '論文のフォルダー移動に失敗しました');
        }

        return data.paper;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    // お気に入り論文削除
    delete: useCallback(async (paperId: string): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/favorite-papers?paperId=${paperId}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'お気に入り論文の削除に失敗しました');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),
  };

  return {
    loading,
    error,
    folders,
    favoritePapers,
  };
}; 