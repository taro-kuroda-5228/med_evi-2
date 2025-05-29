'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  pubDate: string;
  abstract: string;
  doi?: string;
}

interface SearchResult {
  articles: PubMedArticle[];
  summary: string;
  totalResults: number;
  searchQuery: string;
}

interface SearchSession {
  query: string;
  result: SearchResult;
  timestamp: Date;
}

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams?.get('q') || '';
  
  console.log('=== Results Page 初期化 ===');
  console.log('searchParams:', searchParams);
  console.log('initialQuery:', initialQuery);
  console.log('router:', router);
  
  const [searchSessions, setSearchSessions] = useState<SearchSession[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedAbstracts, setExpandedAbstracts] = useState<Set<string>>(new Set());
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [savedQueries, setSavedQueries] = useState<Set<string>>(new Set());
  const [favoritePaperIds, setFavoritePaperIds] = useState<Set<string>>(new Set());
  
  const { preferences, announce } = useAccessibility();
  const { user, loading } = useAuth();
  const { favoritePapers } = useApi();
  
  // 認証状態の初期化ログ
  useEffect(() => {
    console.log('=== Results Page 認証状態初期化 ===');
    console.log('user:', user);
    console.log('user type:', typeof user);
    console.log('user truthy:', !!user);
    console.log('=== Results Page 認証状態初期化終了 ===');
  }, [user]);

  // お気に入り論文の初期取得
  useEffect(() => {
    const loadFavoritePapers = async () => {
      if (!user || loading) return;
      
      try {
        const favorites = await favoritePapers.getAll();
        const favoriteIds = new Set(
          favorites
            .map(paper => paper.pmid)
            .filter((pmid): pmid is string => Boolean(pmid))
        );
        setFavoritePaperIds(favoriteIds);
        console.log('お気に入り論文を読み込みました:', favoriteIds.size, '件');
      } catch (error) {
        console.error('お気に入り論文の読み込みエラー:', error);
      }
    };

    loadFavoritePapers();
  }, [user, loading, favoritePapers]);
  
  const mainRef = useRef<HTMLElement>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);
  const hasInitialSearchRef = useRef(false);

  useEffect(() => {
    console.log('=== Results Page useEffect ===');
    console.log('initialQuery:', initialQuery);
    console.log('hasInitialSearchRef.current:', hasInitialSearchRef.current);
    console.log('searchSessions.length:', searchSessions.length);
    console.log('loading:', loading);
    console.log('user:', user);
    
    if (initialQuery && !hasInitialSearchRef.current && !loading) {
      console.log('初回検索を実行します');
      hasInitialSearchRef.current = true;
      performSearch(initialQuery);
    } else if (!initialQuery && searchSessions.length === 0) {
      console.log('クエリがないためホームページにリダイレクトします');
      router.push('/');
    } else if (initialQuery && !hasInitialSearchRef.current && loading) {
      console.log('認証状態読み込み中のため、検索実行を待機します');
    }
  }, [initialQuery, router, loading, user]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    setError('');
    setCurrentQuery('');
    
    if (preferences.screenReader) {
      announce(`"${searchQuery}" の検索を開始しています`, 'assertive');
    }

    try {
      // 前のクエリのコンテキストを取得
      const previousQueries = searchSessions.map(session => session.query);
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          maxResults: 3,
          previousQueries: previousQueries, // コンテキストを送信
        }),
      });

      if (!response.ok) {
        throw new Error('検索に失敗しました');
      }

      const result: SearchResult = await response.json();
      
      // 検索セッションに追加
      const newSession: SearchSession = {
        query: searchQuery,
        result,
        timestamp: new Date(),
      };
      
      setSearchSessions(prev => [...prev, newSession]);
      setCurrentQuery('');
      
      // 認証読み込み中でない場合のみ履歴保存を試行（重複防止）
      if (!loading && user && !savedQueries.has(searchQuery)) {
        setSavedQueries(prev => new Set([...prev, searchQuery])); // 保存処理開始をマーク
        
        try {
          console.log('検索履歴保存開始:', { 
            query: searchQuery, 
            results: result.totalResults,
            userId: user.id 
          });
          
          const historyResponse = await fetch('/api/search-history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: searchQuery,
              results_count: result.totalResults,
              is_favorite: false,
              answer: result.summary,
              articles: result.articles,
            }),
          });
          
          console.log('検索履歴保存レスポンス:', {
            status: historyResponse.status,
            statusText: historyResponse.statusText,
            ok: historyResponse.ok
          });
          
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            console.log('検索履歴保存成功:', historyData);
          } else {
            const errorData = await historyResponse.json();
            console.error('検索履歴保存失敗:', {
              status: historyResponse.status,
              statusText: historyResponse.statusText,
              errorData: errorData
            });
            // 保存失敗時はマークを削除
            setSavedQueries(prev => {
              const newSet = new Set(prev);
              newSet.delete(searchQuery);
              return newSet;
            });
          }
        } catch (historyError) {
          console.error('検索履歴保存エラー:', historyError);
          // エラー時はマークを削除
          setSavedQueries(prev => {
            const newSet = new Set(prev);
            newSet.delete(searchQuery);
            return newSet;
          });
        }
      } else if (loading) {
        console.log('認証状態読み込み中のため、検索履歴保存をスキップします');
      } else if (!user) {
        console.log('ユーザーがログインしていないため、検索履歴は保存されません');
      } else if (savedQueries.has(searchQuery)) {
        console.log('既に保存処理中のため、重複保存をスキップします');
      }
      
      // 関連する質問を生成
      await generateSuggestedQuestions(searchQuery, result);
      
      if (preferences.screenReader) {
        announce(`${result.totalResults}件の論文が見つかりました`, 'assertive');
      }
    } catch (error) {
      console.error('検索エラー:', error);
      setError('検索中にエラーが発生しました。もう一度お試しください。');
      
      if (preferences.screenReader) {
        announce('検索中にエラーが発生しました', 'assertive');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateSuggestedQuestions = async (query: string, result: SearchResult) => {
    // 前のクエリのコンテキストを取得
    const previousQueries = searchSessions.map(session => session.query);
    const hasContext = previousQueries.length > 0;
    
    if (hasContext) {
      // 前の検索結果の要約から関連質問を生成
      const lastSession = searchSessions[searchSessions.length - 1];
      const lastSummary = lastSession.result.summary;
      
      try {
        const response = await fetch('/api/generate-questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: lastSummary,
            currentQuery: query,
            previousQuery: lastSession.query,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setSuggestedQuestions(data.questions || []);
          return;
        }
      } catch (error) {
        console.error('関連質問生成エラー:', error);
      }
    } else {
      // 初回検索時：現在の検索結果から関連質問を生成
      try {
        const response = await fetch('/api/generate-questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: result.summary,
            currentQuery: '',
            previousQuery: query,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setSuggestedQuestions(data.questions || []);
          return;
        }
      } catch (error) {
        console.error('初回関連質問生成エラー:', error);
      }
    }
    
    // フォールバック：従来の定型質問生成
    generateFallbackQuestions(query, result);
  };

  const generateFallbackQuestions = (query: string, result: SearchResult) => {
    // 検索クエリと結果に基づいて関連質問を生成（従来のロジック）
    const suggestions: string[] = [];
    
    // 基本的な関連質問パターン
    if (query.includes('予後因子') || query.includes('予後')) {
      suggestions.push(
        'TNM分類とは何か？',
        '治療選択における予後因子の重要性は？',
        '患者の年齢や性別、喫煙歴は具体的にどれぐらい影響を与える？'
      );
    }
    
    if (query.includes('肺がん') || query.includes('肺癌')) {
      suggestions.push(
        '小細胞肺癌の予後因子は？',
        '非小細胞肺癌の治療法は？',
        'EGFR変異陽性肺癌の治療戦略は？'
      );
    }
    
    if (query.includes('治療') || query.includes('療法')) {
      suggestions.push(
        '副作用はどのようなものがある？',
        '治療効果の評価方法は？',
        '他の治療法との比較は？'
      );
    }
    
    if (query.includes('診断')) {
      suggestions.push(
        '診断基準は？',
        '鑑別診断で注意すべき疾患は？',
        '検査の精度は？'
      );
    }
    
    // 一般的な医学的質問（他に該当しない場合）
    if (suggestions.length < 3) {
      suggestions.push(
        '最新の治療ガイドラインは？',
        '臨床試験の結果は？',
        '日本での治療状況は？'
      );
    }
    
    // 重複を除去し、最大6個まで
    const uniqueSuggestions = [...new Set(suggestions)];
    setSuggestedQuestions(uniqueSuggestions.slice(0, 6));
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentQuery.trim()) {
      // 重複チェック
      const isDuplicate = searchSessions.some(session => 
        session.query.toLowerCase().trim() === currentQuery.toLowerCase().trim()
      );
      
      if (isDuplicate) {
        setError('この質問は既に検索済みです。別の質問をお試しください。');
        setTimeout(() => setError(''), 3000); // 3秒後にエラーメッセージを消去
        return;
      }
      
      performSearch(currentQuery.trim());
    }
  };

  const handleSuggestedQuestionClick = (question: string) => {
    // 重複チェック
    const isDuplicate = searchSessions.some(session => 
      session.query.toLowerCase().trim() === question.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('この質問は既に検索済みです。別の質問をお試しください。');
      setTimeout(() => setError(''), 3000); // 3秒後にエラーメッセージを消去
      return;
    }

    performSearch(question);
  };

  const toggleAbstract = (pmid: string) => {
    const newExpanded = new Set(expandedAbstracts);
    if (newExpanded.has(pmid)) {
      newExpanded.delete(pmid);
    } else {
      newExpanded.add(pmid);
    }
    setExpandedAbstracts(newExpanded);
  };

  const handleAddToFavorites = async (article: PubMedArticle) => {
    if (!user) {
      announce('お気に入りに追加するにはログインが必要です', 'assertive');
      return;
    }

    const isAlreadyFavorite = favoritePaperIds.has(article.pmid);
    
    if (isAlreadyFavorite) {
      announce('この論文は既にお気に入りに追加されています', 'polite');
      return;
    }

    try {
      // 楽観的更新：先にUIを更新
      setFavoritePaperIds(prev => new Set([...prev, article.pmid]));
      
      const result = await favoritePapers.add({
        title: article.title,
        authors: article.authors.join(', '),
        journal: article.journal,
        publication_year: parseInt(article.pubDate.split('-')[0]) || 0,
        doi: article.doi || '',
        pmid: article.pmid,
        abstract: article.abstract,
        folder_id: undefined,
      });
      
      console.log('お気に入り追加成功:', result);
      announce(`"${article.title}" をお気に入りに追加しました`, 'assertive');
      
    } catch (error) {
      console.error('お気に入り追加エラー:', error);
      // エラー時は状態を元に戻す
      setFavoritePaperIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(article.pmid);
        return newSet;
      });
      announce('お気に入りの追加に失敗しました', 'assertive');
    }
  };

  // 要約を読みやすい文章形式に整形する関数
  const formatSummaryAsReadableText = (summary: string, articleCount: number) => {
    // Markdownの太字記号を削除
    let cleanedSummary = summary
      .replace(/\*\*(.*?)\*\*/g, '$1') // **text** → text
      .replace(/\*(.*?)\*/g, '$1')     // *text* → text
      .replace(/__(.*?)__/g, '$1')     // __text__ → text
      .replace(/_([^_]+)_/g, '$1');    // _text_ → text

    // 段落分けを改善
    cleanedSummary = cleanedSummary
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p class="mb-4">${line}</p>`) // 各段落をpタグで囲む
      .join('');

    // 参考文献番号のスタイリングを改善（実際の論文数に基づいて検証）
    cleanedSummary = cleanedSummary
      .replace(/\[(\d+)\]/g, (match, num) => {
        const refNum = parseInt(num);
        // 実際の論文数を超える参考文献番号は削除
        if (refNum > articleCount || refNum < 1) {
          return '';
        }
        return `<sup class="text-blue-600 font-medium ml-1">[${refNum}]</sup>`;
      });

    return cleanedSummary;
  };

  if (isLoading && searchSessions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="inline-block w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="mt-4 text-gray-600">検索中...</p>
        </div>
      </div>
    );
  }

  if (error && searchSessions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← 戻る
          </button>
        </div>
      </div>
    );
  }

  if (searchSessions.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-gray-700 mb-4 text-sm"
          >
            ← 新しい検索
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">検索セッション</h1>
        </div>

        {/* 検索セッション一覧 */}
        <div className="space-y-12">
          <AnimatePresence>
            {searchSessions.map((session, sessionIndex) => (
              <motion.div
                key={sessionIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="border-b border-gray-200 pb-12 last:border-b-0"
              >
                {/* 検索クエリ表示 */}
                <div className="mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {sessionIndex > 0 && (
                          <div className="text-sm text-gray-500 mb-2">
                            <span className="inline-flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                              前の質問「{searchSessions[sessionIndex - 1].query}」に関連
                            </span>
                          </div>
                        )}
                        <p className="text-lg font-medium text-gray-900">{session.query}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">
                          {session.timestamp.toLocaleTimeString('ja-JP', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {sessionIndex > 0 && (
                          <div className="text-xs text-blue-600 mt-1">
                            質問 {sessionIndex + 1}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI要約 */}
                <div className="mb-8">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="prose prose-gray max-w-none">
                      <div 
                        className="text-gray-800 leading-relaxed font-normal"
                        dangerouslySetInnerHTML={{ 
                          __html: formatSummaryAsReadableText(session.result.summary, session.result.articles.length) 
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 参考文献 */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">参考文献</h3>
                  
                  <div className="space-y-4">
                    {session.result.articles.map((article, index) => (
                      <div
                        key={article.pmid}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm text-gray-600 mb-1">
                              [{index + 1}] {article.authors.slice(0, 2).join(', ')}
                              {article.authors.length > 2 && ' et al.'}
                            </p>
                            
                            <h4 className="text-base font-medium text-gray-900 mb-2">
                              {article.title}
                            </h4>
                            
                            <p className="text-sm text-gray-600">
                              {article.journal} ({article.pubDate})
                            </p>
                            
                            {article.pmid && (
                              <a 
                                href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                PMID: {article.pmid}
                              </a>
                            )}
                          </div>
                          
                          {user && (
                            <motion.button
                              onClick={() => handleAddToFavorites(article)}
                              className={`ml-4 p-2 rounded-lg transition-all duration-200 ${
                                favoritePaperIds.has(article.pmid)
                                  ? 'text-yellow-500 bg-yellow-50 border border-yellow-200'
                                  : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 border border-transparent'
                              }`}
                              title={favoritePaperIds.has(article.pmid) ? 'お気に入り済み' : 'お気に入りに追加'}
                              data-pmid={article.pmid}
                              disabled={favoritePaperIds.has(article.pmid)}
                              {...(!preferences.reduceMotion && {
                                whileHover: favoritePaperIds.has(article.pmid) ? {} : { scale: 1.1 },
                                whileTap: favoritePaperIds.has(article.pmid) ? {} : { scale: 0.95 },
                                transition: { type: 'spring', stiffness: 400, damping: 17 }
                              })}
                            >
                              <span className="text-lg">
                                {favoritePaperIds.has(article.pmid) ? '★' : '☆'}
                              </span>
                            </motion.button>
                          )}
                        </div>

                        {/* 抄録（オプション） */}
                        {article.abstract && (
                          <div className="mt-3">
                            <button
                              onClick={() => toggleAbstract(article.pmid)}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              {expandedAbstracts.has(article.pmid) ? '▼ 抄録を隠す' : '▶ 抄録を表示'}
                            </button>
                            
                            {expandedAbstracts.has(article.pmid) && (
                              <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700 leading-relaxed">
                                {article.abstract}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 関連質問の提案 */}
        {suggestedQuestions.length > 0 && (
          <div className="mt-8 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">関連する質問</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestionClick(question)}
                  className="text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                  disabled={isLoading}
                >
                  <span className="text-blue-700 text-sm">{question}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 追加質問フォーム */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">追加で質問する</h3>
          
          <form onSubmit={handleQuestionSubmit} className="space-y-4">
            <div>
              <input
                ref={queryInputRef}
                type="text"
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                placeholder="追加の質問を入力してください..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                これまでの検索結果を踏まえて、さらに詳しく質問できます
              </p>
              
              <button
                type="submit"
                disabled={isLoading || !currentQuery.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <motion.div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    検索中...
                  </div>
                ) : (
                  '検索'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
