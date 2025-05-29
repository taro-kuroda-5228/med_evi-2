'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useApi } from '@/hooks/useApi';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface HistoryItem {
  id: string;
  question: string;
  timestamp: string;
  category: string;
  answered?: boolean;
  isFavorite?: boolean;
}

interface FavoritePaper {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  timestamp: string;
  folder: string;
  doi?: string;
}

interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

export default function AnimatedHistory() {
  const [activeTab, setActiveTab] = useState<'search' | 'papers'>('search');
  const [isLoading, setIsLoading] = useState(true);
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>([]);
  const [favoritePapers, setFavoritePapers] = useState<FavoritePaper[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [user, setUser] = useState<any>(null);
  
  const { preferences, announce } = useAccessibility();
  const { loading: apiLoading, error: apiError, folders: foldersApi, favoritePapers: favoritePapersApi } = useApi();
  const tabListRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dataLoadedRef = useRef(false); // データ読み込み済みフラグ
  const supabase = createClient();
  const router = useRouter();

  // ユーザー認証状態を確認
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        dataLoadedRef.current = false; // ユーザーがいない場合はフラグをリセット
        return;
      }

      // 既にデータが読み込まれている場合はスキップ
      if (dataLoadedRef.current) {
        return;
      }

      setIsLoading(true);
      
      try {
        // フォルダーデータを取得
        const foldersData = await foldersApi.getAll();
        const formattedFolders: Folder[] = [
          {
            id: 'all',
            name: 'すべて',
            createdAt: '2024-01-01',
          },
          ...foldersData.map(folder => ({
            id: folder.id,
            name: folder.name,
            createdAt: folder.created_at,
          }))
        ];
        setFolders(formattedFolders);

        // お気に入り論文データを取得
        const papersData = await favoritePapersApi.getAll();
        const formattedPapers: FavoritePaper[] = papersData.map(paper => ({
          id: paper.id,
          title: paper.title,
          authors: paper.authors,
          journal: paper.journal,
          year: paper.publication_year?.toString() || '',
          timestamp: paper.created_at,
          folder: paper.folder_id || 'all',
          doi: paper.doi,
        }));
        setFavoritePapers(formattedPapers);

        // 検索履歴データを取得
        try {
          console.log('検索履歴取得開始...');
          const historyResponse = await fetch('/api/search-history');
          console.log('検索履歴レスポンス状態:', historyResponse.status, historyResponse.statusText);
          
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            console.log('検索履歴データ:', historyData);
            
            // 重複を除去（同じクエリの場合は最新のもののみ保持）
            const uniqueHistory = new Map<string, any>();
            historyData.searchHistory.forEach((item: any) => {
              const existingItem = uniqueHistory.get(item.query);
              if (!existingItem || new Date(item.created_at) > new Date(existingItem.created_at)) {
                uniqueHistory.set(item.query, item);
              }
            });
            
            const formattedHistory: HistoryItem[] = Array.from(uniqueHistory.values()).map((item: any) => ({
              id: item.id,
              question: item.query,
              timestamp: new Date(item.created_at).toLocaleString('ja-JP'),
              category: '検索',
              answered: true,
              isFavorite: item.is_favorite || false,
            }));
            
            // 作成日時で降順ソート
            formattedHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            setSearchHistory(formattedHistory);
            console.log('検索履歴設定完了:', formattedHistory.length, '件（重複除去後）');
          } else {
            const errorData = await historyResponse.json();
            console.error('検索履歴取得失敗:', {
              status: historyResponse.status,
              statusText: historyResponse.statusText,
              errorData: errorData
            });
            setSearchHistory([]);
          }
        } catch (historyError) {
          console.error('検索履歴取得エラー:', historyError);
          setSearchHistory([]);
        }

        dataLoadedRef.current = true; // データ読み込み完了をマーク

        if (preferences.screenReader) {
          announce('履歴データが読み込まれました', 'polite');
        }
      } catch (error) {
        console.error('データ読み込みエラー:', error);
        if (preferences.screenReader) {
          announce('データの読み込みに失敗しました', 'assertive');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]); // 依存配列はuserのみ

  const handleTabChange = (tab: 'search' | 'papers') => {
    setActiveTab(tab);
    
    if (preferences.screenReader) {
      const tabName = tab === 'search' ? '検索履歴' : 'お気に入り論文';
      announce(`${tabName}タブに切り替えました`, 'assertive');
    }
  };

  const handleSearchItemClick = (item: HistoryItem) => {
    // 会話継続ページに遷移
    router.push(`/conversation/${item.id}`);
    
    if (preferences.screenReader) {
      announce(`${item.question}の会話を開いています`, 'assertive');
    }
  };

  const handlePaperItemClick = (paper: FavoritePaper) => {
    if (preferences.screenReader) {
      announce(`論文: ${paper.title}`, 'polite');
    }
  };

  const toggleFavorite = async (itemId: string) => {
    const item = searchHistory.find(item => item.id === itemId);
    if (!item) return;

    const newFavoriteState = !item.isFavorite;

    try {
      const response = await fetch('/api/search-history', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: itemId,
          is_favorite: newFavoriteState,
        }),
      });

      if (response.ok) {
        // ローカル状態を更新
        setSearchHistory(prev => 
          prev.map(historyItem => 
            historyItem.id === itemId 
              ? { ...historyItem, isFavorite: newFavoriteState }
              : historyItem
          )
        );
        
        if (preferences.screenReader) {
          const action = newFavoriteState ? '追加しました' : '削除しました';
          announce(`お気に入りから${action}`, 'assertive');
        }
      } else {
        const errorData = await response.json();
        console.error('お気に入り更新失敗:', errorData);
        if (preferences.screenReader) {
          announce('お気に入りの更新に失敗しました', 'assertive');
        }
      }
    } catch (error) {
      console.error('お気に入り更新エラー:', error);
      if (preferences.screenReader) {
        announce('お気に入りの更新に失敗しました', 'assertive');
      }
    }
  };

  const toggleFavoritesFilter = () => {
    setShowFavoritesOnly(prev => !prev);
    
    if (preferences.screenReader) {
      const action = !showFavoritesOnly ? 'お気に入りのみ' : 'すべての検索履歴';
      announce(`${action}を表示しています`, 'assertive');
    }
  };

  // フィルターされた検索履歴を取得
  const getFilteredSearchHistory = () => {
    return showFavoritesOnly 
      ? searchHistory.filter(item => item.isFavorite)
      : searchHistory;
  };

  // フィルターされたお気に入り論文を取得
  const getFilteredFavoritePapers = () => {
    if (selectedFolder === 'all') {
      return favoritePapers;
    }
    return favoritePapers.filter(paper => paper.folder === selectedFolder);
  };

  // データを再読み込みする関数
  const reloadData = async () => {
    if (!user) return;
    
    try {
      // フォルダーデータを再取得
      const foldersData = await foldersApi.getAll();
      const formattedFolders: Folder[] = [
        {
          id: 'all',
          name: 'すべて',
          createdAt: '2024-01-01',
        },
        ...foldersData.map(folder => ({
          id: folder.id,
          name: folder.name,
          createdAt: folder.created_at,
        }))
      ];
      setFolders(formattedFolders);

      // お気に入り論文データを再取得
      const papersData = await favoritePapersApi.getAll();
      const formattedPapers: FavoritePaper[] = papersData.map(paper => ({
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        journal: paper.journal,
        year: paper.publication_year?.toString() || '',
        timestamp: paper.created_at,
        folder: paper.folder_id || 'all',
        doi: paper.doi,
      }));
      setFavoritePapers(formattedPapers);

      // 検索履歴データを再取得
      try {
        const historyResponse = await fetch('/api/search-history');
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          
          // 重複を除去（同じクエリの場合は最新のもののみ保持）
          const uniqueHistory = new Map<string, any>();
          historyData.searchHistory.forEach((item: any) => {
            const existingItem = uniqueHistory.get(item.query);
            if (!existingItem || new Date(item.created_at) > new Date(existingItem.created_at)) {
              uniqueHistory.set(item.query, item);
            }
          });
          
          const formattedHistory: HistoryItem[] = Array.from(uniqueHistory.values()).map((item: any) => ({
            id: item.id,
            question: item.query,
            timestamp: new Date(item.created_at).toLocaleString('ja-JP'),
            category: '検索',
            answered: true,
            isFavorite: item.is_favorite || false,
          }));
          
          // 作成日時で降順ソート
          formattedHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          setSearchHistory(formattedHistory);
        }
      } catch (historyError) {
        console.error('検索履歴再取得エラー:', historyError);
      }
    } catch (error) {
      console.error('データ再読み込みエラー:', error);
    }
  };

  // 新しいフォルダーを作成
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const newFolder = await foldersApi.create(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderForm(false);
      
      // データを再読み込み
      await reloadData();
      
      if (preferences.screenReader) {
        announce(`フォルダー「${newFolder.name}」を作成しました`, 'assertive');
      }
    } catch (error) {
      console.error('フォルダー作成エラー:', error);
      if (preferences.screenReader) {
        announce('フォルダーの作成に失敗しました', 'assertive');
      }
    }
  };

  // フォルダーを削除
  const deleteFolder = async (folderId: string) => {
    if (folderId === 'all') return; // 「すべて」フォルダーは削除不可
    
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    try {
      await foldersApi.delete(folderId);
      
      if (selectedFolder === folderId) {
        setSelectedFolder('all');
      }
      
      // データを再読み込み
      await reloadData();
      
      if (preferences.screenReader) {
        announce(`フォルダー「${folder.name}」を削除しました`, 'assertive');
      }
    } catch (error) {
      console.error('フォルダー削除エラー:', error);
      if (preferences.screenReader) {
        announce('フォルダーの削除に失敗しました', 'assertive');
      }
    }
  };

  // 論文のフォルダーを変更
  const movePaperToFolder = async (paperId: string, folderId: string) => {
    try {
      const targetFolderId = folderId === 'all' ? undefined : folderId;
      await favoritePapersApi.moveToFolder(paperId, targetFolderId);
      
      // データを再読み込み
      await reloadData();
      
      const folder = folders.find(f => f.id === folderId);
      if (folder && preferences.screenReader) {
        announce(`論文を「${folder.name}」フォルダーに移動しました`, 'assertive');
      }
    } catch (error) {
      console.error('論文移動エラー:', error);
      if (preferences.screenReader) {
        announce('論文の移動に失敗しました', 'assertive');
      }
    }
  };

  const removeFavoritePaper = async (paperId: string) => {
    try {
      await favoritePapersApi.delete(paperId);
      
      // データを再読み込み
      await reloadData();
      
      if (preferences.screenReader) {
        announce('お気に入り論文から削除しました', 'assertive');
      }
    } catch (error) {
      console.error('論文削除エラー:', error);
      if (preferences.screenReader) {
        announce('論文の削除に失敗しました', 'assertive');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: preferences.reduceMotion ? 0 : 0.1,
        delayChildren: preferences.reduceMotion ? 0 : 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: preferences.reduceMotion ? 0 : 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: preferences.reduceMotion ? 'tween' : 'spring',
        stiffness: 100,
        damping: 12,
        duration: preferences.reduceMotion ? 0.1 : undefined,
      },
    },
    exit: {
      y: preferences.reduceMotion ? 0 : -20,
      opacity: 0,
      transition: {
        duration: preferences.reduceMotion ? 0.1 : 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { scale: preferences.reduceMotion ? 1 : 0.95, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: preferences.reduceMotion ? 'tween' : 'spring',
        stiffness: 100,
        damping: 15,
        duration: preferences.reduceMotion ? 0.1 : undefined,
      },
    },
    hover: {
      scale: preferences.reduceMotion ? 1 : 1.02,
      y: preferences.reduceMotion ? 0 : -2,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
      },
    },
  };

  const filteredSearchHistory = getFilteredSearchHistory();

  // 認証されていない場合の表示
  if (!user) {
    return (
      <main 
        className="bg-gradient-to-br from-blue-50 via-white to-blue-50 min-h-screen p-8"
        id="main-content"
        role="main"
        aria-label="履歴ページ"
      >
        <motion.div
          className="max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <motion.h1
              className="text-4xl font-bold text-blue-600 mb-4"
              initial={{ scale: preferences.reduceMotion ? 1 : 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: preferences.reduceMotion ? 'tween' : 'spring',
                stiffness: 100,
                damping: 15,
                delay: preferences.reduceMotion ? 0 : 0.1,
                duration: preferences.reduceMotion ? 0.1 : undefined,
              }}
            >
              履歴
            </motion.h1>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center"
          >
            <div className="text-6xl mb-4" aria-hidden="true">🔒</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              ログインが必要です
            </h2>
            <p className="text-gray-600 mb-6">
              履歴機能を利用するには、ログインまたは新規登録が必要です。
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="/login"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                ログイン
              </a>
              <a
                href="/register"
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                新規登録
              </a>
            </div>
          </motion.div>
        </motion.div>
      </main>
    );
  }

  return (
    <main 
      className="bg-gradient-to-br from-blue-50 via-white to-blue-50 min-h-screen p-8"
      id="main-content"
      role="main"
      aria-label="履歴ページ"
    >
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ヘッダー */}
        <motion.div variants={itemVariants} className="mb-8">
          <motion.h1
            className="text-4xl font-bold text-blue-600 mb-4"
            initial={{ scale: preferences.reduceMotion ? 1 : 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: preferences.reduceMotion ? 'tween' : 'spring',
              stiffness: 100,
              damping: 15,
              delay: preferences.reduceMotion ? 0 : 0.1,
              duration: preferences.reduceMotion ? 0.1 : undefined,
            }}
          >
            履歴
          </motion.h1>
          
          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-600"
            id="page-description"
          >
            過去の検索履歴とお気に入りに登録した論文を確認できます
          </motion.p>
        </motion.div>

        {/* エラー表示 */}
        {apiError && (
          <motion.div
            variants={itemVariants}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center">
              <span className="text-red-500 mr-2" aria-hidden="true">⚠️</span>
              <span className="text-red-700 font-medium">エラーが発生しました</span>
            </div>
            <p className="text-red-600 mt-1">{apiError}</p>
          </motion.div>
        )}

        {/* タブナビゲーション */}
        <motion.div
          variants={itemVariants}
          className="mb-8"
        >
          <div 
            ref={tabListRef}
            className="flex bg-white rounded-xl p-2 shadow-lg border border-gray-200"
            role="tablist"
            aria-label="ページナビゲーション"
          >
            {[
              { key: 'home', label: 'ホーム', description: 'メイン検索ページに移動', isExternal: true, href: '/' },
              { key: 'search', label: '検索履歴', description: '過去の検索クエリとお気に入り検索を表示' },
              { key: 'papers', label: 'お気に入り論文', description: 'お気に入りに登録した論文を表示' }
            ].map((tab) => (
              <motion.button
                key={tab.key}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  tab.isExternal
                    ? 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-200'
                    : activeTab === tab.key
                    ? 'text-white'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => {
                  if (tab.isExternal) {
                    if (preferences.screenReader) {
                      announce('ホームページに移動しています', 'assertive');
                    }
                    router.push(tab.href!);
                  } else {
                    handleTabChange(tab.key as 'search' | 'papers');
                  }
                }}
                {...(!preferences.reduceMotion && {
                  whileHover: (!tab.isExternal && activeTab !== tab.key) || tab.isExternal ? { scale: 1.05 } : {},
                  whileTap: { scale: 0.95 }
                })}
                role={tab.isExternal ? 'link' : 'tab'}
                aria-selected={!tab.isExternal && activeTab === tab.key}
                aria-controls={!tab.isExternal ? `${tab.key}-panel` : undefined}
                aria-label={tab.description}
                tabIndex={(!tab.isExternal && activeTab === tab.key) ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    if (tab.key === 'home') {
                      if (e.key === 'ArrowRight') {
                        handleTabChange('search');
                      }
                    } else if (tab.key === 'search') {
                      if (e.key === 'ArrowLeft') {
                        router.push('/');
                      } else if (e.key === 'ArrowRight') {
                        handleTabChange('papers');
                      }
                    } else if (tab.key === 'papers') {
                      if (e.key === 'ArrowLeft') {
                        handleTabChange('search');
                      }
                    }
                  }
                }}
              >
                <span className="relative z-10">
                  {tab.isExternal && (
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {tab.label}
                    </span>
                  )}
                  {!tab.isExternal && tab.label}
                </span>
                {!tab.isExternal && activeTab === tab.key && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-blue-600 rounded-lg"
                    {...(!preferences.reduceMotion && {
                      transition: { type: 'spring', bounce: 0.2, duration: 0.6 }
                    })}
                    aria-hidden="true"
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* フィルターボタン（検索履歴タブのみ） */}
          {activeTab === 'search' && (
            <motion.div
              className="mt-4 flex justify-end"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <button
                onClick={toggleFavoritesFilter}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  showFavoritesOnly
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                aria-label={showFavoritesOnly ? 'すべての検索履歴を表示' : 'お気に入りのみ表示'}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">{showFavoritesOnly ? '★' : '☆'}</span>
                  {showFavoritesOnly ? 'お気に入りのみ' : 'すべて表示'}
                </span>
              </button>
            </motion.div>
          )}

          {/* タブパネル */}
          <div className="mt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                id={`${activeTab}-panel`}
                role="tabpanel"
                aria-labelledby={`${activeTab}-tab`}
                aria-label={activeTab === 'search' ? '検索履歴一覧' : 'お気に入り論文一覧'}
                ref={contentRef}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
              >
                {isLoading ? (
                  <div 
                    className="p-8 text-center"
                    role="status"
                    aria-live="polite"
                    aria-label="データを読み込み中"
                  >
                    <motion.div
                      className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
                      animate={{ rotate: preferences.reduceMotion ? 0 : 360 }}
                      transition={{
                        duration: preferences.reduceMotion ? 0 : 1,
                        repeat: preferences.reduceMotion ? 0 : Infinity,
                        ease: 'linear',
                      }}
                      aria-hidden="true"
                    />
                    <p className="text-gray-600">データを読み込み中...</p>
                  </div>
                ) : activeTab === 'search' ? (
                  // 検索履歴タブ
                  filteredSearchHistory.length === 0 ? (
                    <div 
                      className="p-8 text-center text-gray-500"
                      role="status"
                      aria-live="polite"
                    >
                      <p>
                        {showFavoritesOnly 
                          ? 'お気に入りの検索履歴がありません' 
                          : '検索履歴がありません'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {/* テーブルヘッダー */}
                      <div 
                        className="px-6 py-4 bg-gray-50 grid grid-cols-1 md:grid-cols-5 gap-4 font-semibold text-gray-700"
                        role="row"
                      >
                        <div role="columnheader">質問</div>
                        <div role="columnheader" className="hidden md:block">カテゴリ</div>
                        <div role="columnheader" className="hidden md:block">日時</div>
                        <div role="columnheader" className="hidden md:block">ステータス</div>
                        <div role="columnheader" className="hidden md:block">お気に入り</div>
                      </div>

                      {/* データ行 */}
                      <div role="table" aria-label="検索履歴テーブル">
                        {filteredSearchHistory.map((item, index) => (
                          <motion.div
                            key={item.id}
                            variants={cardVariants}
                            {...(!preferences.reduceMotion && { whileHover: "hover" })}
                            className="px-6 py-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-center transition-colors duration-200 hover:bg-blue-50 focus-within:bg-blue-50"
                            role="row"
                            aria-label={`検索項目 ${index + 1}: ${item.question}`}
                          >
                            <div 
                              className="min-w-0 cursor-pointer" 
                              role="cell"
                              onClick={() => handleSearchItemClick(item)}
                              onKeyDown={(e) => handleKeyDown(e, () => handleSearchItemClick(item))}
                              tabIndex={0}
                            >
                              <h3 className="font-medium text-gray-900 truncate">
                                {item.question}
                              </h3>
                              <div className="md:hidden text-sm text-gray-500 mt-1">
                                {item.category} • {item.timestamp}
                              </div>
                            </div>
                            
                            <div className="hidden md:block text-sm text-gray-600" role="cell">
                              <span 
                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                                aria-label={`カテゴリ: ${item.category}`}
                              >
                                {item.category}
                              </span>
                            </div>
                            
                            <div className="hidden md:block text-sm text-gray-500" role="cell">
                              <time dateTime={item.timestamp} aria-label={`日時: ${item.timestamp}`}>
                                {item.timestamp}
                              </time>
                            </div>
                            
                            <div className="hidden md:block" role="cell">
                              <span 
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  item.answered 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                                aria-label={`ステータス: ${item.answered ? '回答済み' : '未回答'}`}
                              >
                                {item.answered ? '回答済み' : '未回答'}
                              </span>
                            </div>

                            <div className="hidden md:block" role="cell">
                              <button
                                onClick={() => toggleFavorite(item.id)}
                                onKeyDown={(e) => handleKeyDown(e, () => toggleFavorite(item.id))}
                                className={`p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                  item.isFavorite 
                                    ? 'text-yellow-500 hover:text-yellow-600' 
                                    : 'text-gray-400 hover:text-yellow-500'
                                }`}
                                aria-label={`${item.isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}: ${item.question}`}
                              >
                                <span className="text-xl" aria-hidden="true">
                                  {item.isFavorite ? '★' : '☆'}
                                </span>
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  // お気に入り論文タブ
                  <div>
                    {/* フォルダー管理UI */}
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">フォルダー</h3>
                        <button
                          onClick={() => setShowNewFolderForm(true)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          aria-label="新しいフォルダーを作成"
                        >
                          + フォルダー作成
                        </button>
                      </div>

                      {/* 新規フォルダー作成フォーム */}
                      {showNewFolderForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-4 p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newFolderName}
                              onChange={(e) => setNewFolderName(e.target.value)}
                              placeholder="フォルダー名を入力"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  createFolder();
                                } else if (e.key === 'Escape') {
                                  setShowNewFolderForm(false);
                                  setNewFolderName('');
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={createFolder}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            >
                              作成
                            </button>
                            <button
                              onClick={() => {
                                setShowNewFolderForm(false);
                                setNewFolderName('');
                              }}
                              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            >
                              キャンセル
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* フォルダー一覧 */}
                      <div className="flex flex-wrap gap-2">
                        {folders.map((folder) => (
                          <div
                            key={folder.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                              selectedFolder === folder.id
                                ? 'bg-blue-100 border-blue-300 text-blue-800'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <button
                              onClick={() => setSelectedFolder(folder.id)}
                              className="flex items-center gap-2 focus:outline-none"
                              aria-label={`${folder.name}フォルダーを選択`}
                            >
                              <span className="text-sm font-medium">{folder.name}</span>
                              <span className="text-xs text-gray-500">
                                ({favoritePapers.filter(p => folder.id === 'all' || p.folder === folder.id).length})
                              </span>
                            </button>
                            {folder.id !== 'all' && (
                              <button
                                onClick={() => deleteFolder(folder.id)}
                                className="text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                                aria-label={`${folder.name}フォルダーを削除`}
                              >
                                <span className="text-sm">×</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 論文一覧 */}
                    {getFilteredFavoritePapers().length === 0 ? (
                      <div 
                        className="p-8 text-center text-gray-500"
                        role="status"
                        aria-live="polite"
                      >
                        <p>
                          {selectedFolder === 'all' 
                            ? 'お気に入り論文がありません' 
                            : `${folders.find(f => f.id === selectedFolder)?.name}フォルダーに論文がありません`
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {getFilteredFavoritePapers().map((paper, index) => (
                          <motion.div
                            key={paper.id}
                            variants={cardVariants}
                            {...(!preferences.reduceMotion && { whileHover: "hover" })}
                            className="p-6 transition-colors duration-200 hover:bg-blue-50 focus-within:bg-blue-50"
                            role="article"
                            aria-label={`お気に入り論文 ${index + 1}: ${paper.title}`}
                          >
                            <div className="flex justify-between items-start">
                              <div 
                                className="flex-1 cursor-pointer"
                                onClick={() => handlePaperItemClick(paper)}
                                onKeyDown={(e) => handleKeyDown(e, () => handlePaperItemClick(paper))}
                                tabIndex={0}
                              >
                                <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                                  {paper.title}
                                </h3>
                                
                                <div className="text-sm text-gray-600 mb-2">
                                  <span className="font-medium">著者:</span> {paper.authors}
                                </div>
                                
                                <div className="text-sm text-gray-600 mb-2">
                                  <span className="font-medium">雑誌:</span> {paper.journal} ({paper.year})
                                </div>
                                
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  {/* フォルダー移動セレクト */}
                                  <select
                                    value={paper.folder}
                                    onChange={(e) => movePaperToFolder(paper.id, e.target.value)}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-label={`フォルダーを変更: ${paper.title}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {folders.filter(f => f.id !== 'all').map(folder => (
                                      <option key={folder.id} value={folder.id}>
                                        {folder.name}
                                      </option>
                                    ))}
                                  </select>
                                  
                                  <time dateTime={paper.timestamp} aria-label={`追加日時: ${paper.timestamp}`}>
                                    追加: {paper.timestamp}
                                  </time>
                                  
                                  {paper.doi && (
                                    <span aria-label={`DOI: ${paper.doi}`}>
                                      DOI: {paper.doi}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => removeFavoritePaper(paper.id)}
                                onKeyDown={(e) => handleKeyDown(e, () => removeFavoritePaper(paper.id))}
                                className="ml-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                aria-label={`お気に入りから削除: ${paper.title}`}
                              >
                                <span className="text-lg" aria-hidden="true">🗑️</span>
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* キーボードショートカットヘルプ */}
        <div className="sr-only" aria-live="polite">
          キーボードナビゲーション: 左右矢印キーでタブ切り替え、Enterキーでアイテム選択、スペースキーでお気に入り切り替え
        </div>
      </motion.div>
    </main>
  );
}