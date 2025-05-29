'use client';

import { useState, useRef } from 'react';
import { Search, ArrowRight, AlertCircle, Sparkles, BookOpen, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MainContent() {
  const [selectedLanguage, setSelectedLanguage] = useState('ja');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      setError('検索クエリを入力してください');
      inputRef.current?.focus();
      return;
    }

    if (trimmedQuery.length < 3) {
      setError('検索クエリは3文字以上で入力してください');
      inputRef.current?.focus();
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const encodedQuery = encodeURIComponent(trimmedQuery);
      await router.push(`/results?q=${encodedQuery}&lang=${selectedLanguage}`);
    } catch (error) {
      console.error('検索エラー:', error);
      setError('検索中にエラーが発生しました。再度お試しください。');
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (error) setError(null); // エラーをクリア
  };

  const languageOptions = [
    { value: 'ja', label: '日本語', flag: '🇯🇵' },
    { value: 'en', label: 'English', flag: '🇺🇸' },
  ];

  return (
    <main className="flex-grow bg-gradient-to-br from-slate-50 via-blue-50/30 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* ヒーローセクション */}
          <div className="mb-12 lg:mb-16 space-y-6">
            {/* バッジ */}
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800">
              <Sparkles className="w-4 h-4 mr-2" />
              最新のAI技術で医学論文を検索
            </div>

            {/* メインタイトル */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent">
                エビデンス
              </span>
              に基づく
              <br />
              医療情報検索
            </h1>

            {/* サブタイトル */}
            <p className="text-lg sm:text-xl lg:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              医学的な質問を入力して、最新の研究論文と
              <br className="hidden sm:block" />
              エビデンスに基づいた信頼できる回答を取得
            </p>
          </div>

          {/* 検索フォーム */}
          <div className="mb-16 lg:mb-20">
            <form onSubmit={handleSearch} className="space-y-6">
              {/* メイン検索カード */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl lg:rounded-3xl shadow-xl border border-white/20 dark:border-slate-700 p-6 sm:p-8 lg:p-10 backdrop-blur-sm">
                <div className="space-y-6">
                  {/* 検索入力フィールド */}
                  <div className="relative">
                    <label
                      htmlFor="search-input"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 text-left"
                    >
                      医学的な質問を入力してください
                    </label>

                    <div className="relative group">
                      <input
                        ref={inputRef}
                        id="search-input"
                        type="text"
                        value={searchQuery}
                        onChange={handleInputChange}
                        placeholder="例：糖尿病の最新治療法について、高血圧の食事療法について..."
                        className={`
                          w-full px-6 py-4 lg:py-5 pr-14 text-base lg:text-lg
                          border-2 rounded-xl lg:rounded-2xl
                          transition-all duration-300
                          placeholder:text-slate-400 placeholder:text-sm sm:placeholder:text-base
                          ${
                            error
                              ? 'border-red-300 bg-red-50 dark:bg-red-900/10 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-blue-500 focus:ring-blue-500/20 group-hover:border-blue-300 dark:group-hover:border-blue-600'
                          }
                          ${isLoading ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}
                          text-slate-900 dark:text-white
                          focus:ring-4 focus:outline-none
                        `}
                        disabled={isLoading}
                        maxLength={200}
                      />

                      {/* 検索アイコン */}
                      <div className="absolute right-4 lg:right-5 top-1/2 transform -translate-y-1/2">
                        <Search
                          className={`w-5 h-5 lg:w-6 lg:h-6 transition-colors duration-300 ${
                            isLoading
                              ? 'text-slate-400 animate-pulse'
                              : 'text-slate-400 group-hover:text-blue-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* エラーメッセージ */}
                    {error && (
                      <div className="flex items-center mt-3 text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* ヘルプテキスト */}
                    {!error && (
                      <div className="flex justify-between items-center mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        <span>💡 詳細で具体的な質問ほど、より正確な回答が得られます</span>
                        <span className="font-mono">{searchQuery.length}/200</span>
                      </div>
                    )}
                  </div>

                  {/* 言語選択 */}
                  <div className="text-left">
                    <label
                      htmlFor="language-select"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3"
                    >
                      回答言語を選択
                    </label>

                    <div className="relative">
                      <select
                        id="language-select"
                        value={selectedLanguage}
                        onChange={e => setSelectedLanguage(e.target.value)}
                        className="
                          w-full px-6 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl lg:rounded-2xl
                          bg-white dark:bg-slate-700 text-base lg:text-lg font-medium text-slate-900 dark:text-white
                          focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none
                          hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300
                          disabled:bg-slate-50 disabled:cursor-not-allowed appearance-none cursor-pointer
                        "
                        disabled={isLoading}
                      >
                        {languageOptions.map(({ value, label, flag }) => (
                          <option key={value} value={value}>
                            {flag} {label}
                          </option>
                        ))}
                      </select>

                      {/* ドロップダウンアイコン */}
                      <div className="absolute right-4 lg:right-5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 検索ボタン */}
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="
                  w-full bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800
                  hover:from-blue-700 hover:via-blue-800 hover:to-blue-900
                  disabled:from-slate-300 disabled:via-slate-400 disabled:to-slate-500
                  text-white font-bold text-lg lg:text-xl
                  py-4 lg:py-5 px-8 rounded-2xl lg:rounded-3xl
                  shadow-xl hover:shadow-2xl disabled:shadow-md
                  transition-all duration-300
                  flex items-center justify-center space-x-3
                  disabled:cursor-not-allowed
                  focus:outline-none focus:ring-4 focus:ring-blue-500/30
                  transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none
                  min-h-[60px] lg:min-h-[70px]
                  group
                "
              >
                {isLoading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>検索中...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                    <span>医学的エビデンスを検索</span>
                    <ArrowRight className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 特徴カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                icon: BookOpen,
                title: 'エビデンスベース',
                description: '最新の研究論文に基づく信頼できる医学情報を提供',
                color: 'blue',
              },
              {
                icon: Sparkles,
                title: '高速AI検索',
                description: '数秒で関連する医学論文を検索・分析・要約',
                color: 'indigo',
              },
              {
                icon: Globe,
                title: '多言語対応',
                description: '日本語・英語での質問と回答に対応',
                color: 'cyan',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group bg-white dark:bg-slate-800 rounded-2xl p-6 lg:p-8 shadow-lg hover:shadow-xl border border-slate-100 dark:border-slate-700 transition-all duration-300 hover:scale-[1.02]"
              >
                <div
                  className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${
                    feature.color === 'blue'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : feature.color === 'indigo'
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'
                  }`}
                >
                  <feature.icon className="w-6 h-6 lg:w-7 lg:h-7" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {feature.title}
                </h3>

                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
