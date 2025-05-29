'use client';

import { useState, useEffect } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  ChevronUp,
  ChevronDown,
  Star,
  ExternalLink,
  Copy,
} from 'lucide-react';

interface Reference {
  id: string;
  title: string;
  authors: string;
  citation: string;
  isLeadingJournal?: boolean;
  url: string;
  abstract?: string;
  keywords?: string[];
  doi?: string;
}

interface SearchResultsProps {
  question: string;
  expandedQuestion: string;
  answer: string;
  references: Reference[];
}

export default function SearchResults({
  question,
  expandedQuestion,
  answer,
  references,
}: SearchResultsProps) {
  const [isReferencesExpanded, setIsReferencesExpanded] = useState(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const savedFavorites = localStorage.getItem('referenceFavorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  const toggleFavorite = (refId: string) => {
    const newFavorites = {
      ...favorites,
      [refId]: !favorites[refId],
    };
    setFavorites(newFavorites);
    localStorage.setItem('referenceFavorites', JSON.stringify(newFavorites));
  };

  const handleCopyReference = async (ref: Reference) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(ref.citation);
      setCopiedId(ref.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 theme-transition-colors">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* 質問ヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl sm:rounded-2xl shadow-lg mb-4 sm:mb-6 lg:mb-8 overflow-hidden">
          <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold leading-tight">
              {question}
            </h1>
          </div>
        </div>

        {/* メインコンテンツエリア */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* 回答セクション */}
          <div className="xl:col-span-3 space-y-4 sm:space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden theme-transition-colors">
              {/* 拡張質問 */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 sm:p-6 border-b border-gray-100 dark:border-gray-600">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-shrink-0 w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                      拡張された検索クエリ:
                    </p>
                    <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 leading-relaxed">
                      {expandedQuestion}
                    </p>
                  </div>
                </div>
              </div>

              {/* 回答本文 */}
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none dark:prose-invert">
                  <div className="text-gray-800 dark:text-gray-200 space-y-3 sm:space-y-4 leading-relaxed">
                    {answer.split('\n').map((paragraph, index) => (
                      <p key={index} className="text-sm sm:text-base lg:text-lg">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {/* 評価ボタン */}
                <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                    この回答は役に立ちましたか？
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button className="flex-1 sm:flex-initial bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl flex items-center justify-center text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]">
                      <ThumbsUp className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      役に立った
                    </button>
                    <button className="flex-1 sm:flex-initial bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl flex items-center justify-center text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                      <ThumbsDown className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      改善が必要
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* サイドバー（デスクトップのみ） */}
          <div className="hidden xl:block xl:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 sticky top-6 theme-transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                検索情報
              </h3>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">参考文献数</p>
                  <p>{references.length}件</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                    検索データベース
                  </p>
                  <p>PubMed/MEDLINE</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">回答生成</p>
                  <p>AI要約システム</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 参考文献セクション */}
        <div className="mt-6 sm:mt-8 lg:mt-12 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden theme-transition-colors">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* 参考文献ヘッダー */}
            <div
              className="flex justify-between items-center cursor-pointer group mb-4 sm:mb-6"
              onClick={() => setIsReferencesExpanded(!isReferencesExpanded)}
            >
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                参考文献 ({references.length}件)
              </h2>
              {isReferencesExpanded ? (
                <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200" />
              ) : (
                <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200" />
              )}
            </div>

            {/* 参考文献リスト */}
            {isReferencesExpanded && (
              <div className="space-y-4 sm:space-y-6">
                {references.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                      参考文献が見つかりませんでした。
                    </p>
                  </div>
                ) : (
                  references.map((ref, index) => (
                    <div
                      key={ref.id}
                      className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-600 transition-all duration-200 hover:shadow-md"
                    >
                      {/* 文献番号とタイトル */}
                      <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-semibold text-sm sm:text-base lg:text-lg leading-tight block group"
                          >
                            <span className="line-clamp-2 sm:line-clamp-3">{ref.title}</span>
                            <ExternalLink className="inline-block h-3 w-3 sm:h-4 sm:w-4 ml-1 opacity-70 group-hover:opacity-100" />
                          </a>
                        </div>
                      </div>

                      {/* 著者情報 */}
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2 sm:mb-3 line-clamp-1">
                        <span className="font-medium">著者:</span> {ref.authors}
                      </p>

                      {/* 抄録 */}
                      {ref.abstract && (
                        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 line-clamp-3">
                          {ref.abstract}
                        </p>
                      )}

                      {/* キーワード */}
                      {ref.keywords && Array.isArray(ref.keywords) && ref.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                          {ref.keywords.slice(0, 5).map((kw: string, i: number) => (
                            <span
                              key={i}
                              className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full font-medium"
                            >
                              {kw}
                            </span>
                          ))}
                          {ref.keywords.length > 5 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                              +{ref.keywords.length - 5} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* 引用情報 */}
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4 italic">
                        {ref.citation}
                      </p>

                      {/* アクションボタン */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {ref.doi && (
                          <a
                            href={`https://doi.org/${ref.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/70 px-2 sm:px-3 py-1 rounded-md transition-colors"
                          >
                            DOI: {ref.doi}
                          </a>
                        )}

                        <button
                          onClick={() => handleCopyReference(ref)}
                          className="text-xs sm:text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-2 sm:px-3 py-1 rounded-md transition-all flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          {copiedId === ref.id ? 'コピー完了!' : '引用をコピー'}
                        </button>

                        {ref.isLeadingJournal && (
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 px-2 sm:px-3 py-1 rounded-full font-medium">
                            主要ジャーナル
                          </span>
                        )}

                        <button
                          onClick={() => toggleFavorite(ref.id)}
                          className={`p-1.5 sm:p-2 rounded-full transition-colors duration-200 ${
                            favorites[ref.id]
                              ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30'
                              : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                          }`}
                          title={favorites[ref.id] ? 'お気に入りから削除' : 'お気に入りに追加'}
                        >
                          <Star
                            className="h-4 w-4 sm:h-5 sm:w-5"
                            fill={favorites[ref.id] ? 'currentColor' : 'none'}
                          />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
