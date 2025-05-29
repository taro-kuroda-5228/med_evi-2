'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useAccessibility } from '@/hooks/useAccessibility';

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
  id: string;
}

interface ConversationData {
  id: string;
  query: string;
  answer: string;
  citations: PubMedArticle[];
  created_at: string;
  results_count: number;
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { preferences, announce } = useAccessibility();
  
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [searchSessions, setSearchSessions] = useState<SearchSession[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedAbstracts, setExpandedAbstracts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user && params?.id) {
      loadConversation(params.id as string);
    }
  }, [user, loading, params?.id, router]);

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/search-history/${conversationId}`);
      if (!response.ok) {
        throw new Error('会話データの取得に失敗しました');
      }

      const data = await response.json();
      setConversation(data);

      // 初期セッションを作成
      const initialSession: SearchSession = {
        id: data.id,
        query: data.query,
        result: {
          articles: JSON.parse(data.citations || '[]'),
          summary: data.answer,
          totalResults: data.results_count,
          searchQuery: data.query,
        },
        timestamp: new Date(data.created_at),
      };

      setSearchSessions([initialSession]);
    } catch (error) {
      console.error('会話読み込みエラー:', error);
      setError('会話データの読み込みに失敗しました');
    }
  };

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    setError('');

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

      // 新しいセッションを追加
      const newSession: SearchSession = {
        id: `temp-${Date.now()}`,
        query: searchQuery,
        result,
        timestamp: new Date(),
      };

      setSearchSessions(prev => [...prev, newSession]);
      setCurrentQuery('');

      // 検索履歴を保存
      if (user) {
        try {
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

          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            // セッションIDを更新
            setSearchSessions(prev => 
              prev.map(session => 
                session.id === newSession.id 
                  ? { ...session, id: historyData.data.id }
                  : session
              )
            );
          }
        } catch (historyError) {
          console.error('検索履歴保存エラー:', historyError);
        }
      }

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

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentQuery.trim()) {
      performSearch(currentQuery.trim());
    }
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

  const formatSummaryAsReadableText = (summary: string, articleCount: number) => {
    let cleanedSummary = summary
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1');

    cleanedSummary = cleanedSummary
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p class="mb-4">${line}</p>`)
      .join('');

    cleanedSummary = cleanedSummary
      .replace(/\[(\d+)\]/g, (match, num) => {
        const refNum = parseInt(num);
        if (refNum > articleCount || refNum < 1) {
          return '';
        }
        return `<sup class="text-blue-600 font-medium ml-1">[${refNum}]</sup>`;
      });

    return cleanedSummary;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="inline-block w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="mt-4 text-gray-600">読み込み中...</p>
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
            onClick={() => router.push('/history')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← 履歴に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/history')}
            className="text-gray-500 hover:text-gray-700 mb-4 text-sm"
          >
            ← 履歴に戻る
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">会話の続き</h1>
          {conversation && (
            <p className="text-gray-600">
              開始: {new Date(conversation.created_at).toLocaleString('ja-JP')}
            </p>
          )}
        </div>

        {/* 検索セッション一覧 */}
        <div className="space-y-12">
          <AnimatePresence>
            {searchSessions.map((session, sessionIndex) => (
              <motion.div
                key={session.id}
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

        {/* 追加質問フォーム */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">追加で質問する</h3>
          
          <form onSubmit={handleQuestionSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="関連する質問を入力してください"
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                maxLength={200}
              />
              
              {error && (
                <div className="mt-2 text-red-600 text-sm">
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !currentQuery.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '検索中...' : '質問する'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 