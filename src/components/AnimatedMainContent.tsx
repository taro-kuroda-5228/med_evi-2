'use client';

import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccessibility } from '@/hooks/useAccessibility';

export default function AnimatedMainContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { preferences, announce } = useAccessibility();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.focus();
    }
  }, []);

  const validateInput = (value: string) => {
    if (!value.trim()) {
      return '検索クエリを入力してください';
    }
    if (value.length < 3) {
      return '検索クエリは3文字以上で入力してください';
    }
    if (value.length > 200) {
      return '検索クエリは200文字以内で入力してください';
    }
    return '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    const validationError = validateInput(value);
    setError(validationError);
    
    if (preferences.screenReader && validationError) {
      announce(validationError, 'assertive');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateInput(searchQuery);
    if (validationError) {
      setError(validationError);
      announce(validationError, 'assertive');
      searchInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setError('');
    
    if (preferences.screenReader) {
      announce('検索を開始しています', 'assertive');
    }

    try {
      const searchUrl = `/results?q=${encodeURIComponent(searchQuery)}`;
      console.log('=== ホームページ検索フォーム ===');
      console.log('検索クエリ:', searchQuery);
      console.log('遷移先URL:', searchUrl);
      console.log('router.push実行前');
      
      router.push(searchUrl);
      
      console.log('router.push実行後');
    } catch (error) {
      console.error('router.push エラー:', error);
      setError('検索中にエラーが発生しました。もう一度お試しください。');
      announce('検索中にエラーが発生しました', 'assertive');
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: preferences.reduceMotion ? 0 : 0.2,
        delayChildren: preferences.reduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: preferences.reduceMotion ? 0 : 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: preferences.reduceMotion ? 'tween' : 'spring',
        stiffness: 100,
        damping: 12,
        duration: preferences.reduceMotion ? 0.3 : undefined,
      },
    },
  };

  return (
    <main 
      ref={mainRef}
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 px-6 py-12"
      id="main-content"
      tabIndex={-1}
      role="main"
    >
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ヒーローセクション */}
        <div className="text-center mb-16">
          {/* ロゴとタイトル */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center justify-center mb-6">
              <motion.div
                className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mr-4"
                {...(!preferences.reduceMotion && {
                  whileHover: { scale: 1.1, rotate: 5 },
                  transition: { type: 'spring', stiffness: 400, damping: 17 }
                })}
              >
                <span className="text-2xl text-white font-bold">M</span>
              </motion.div>
              <motion.h1
                className="text-5xl font-bold text-blue-600"
                {...(!preferences.reduceMotion && {
                  whileHover: {
                    background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  },
                  transition: { duration: 0.3 }
                })}
              >
                メドエビデンス
              </motion.h1>
            </div>
            
            <motion.p
              className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
              variants={itemVariants}
            >
              医師のための医学的エビデンス検索プラットフォーム
              <br />
              <span className="text-lg text-gray-500">
                AI技術を活用して、最新の医学論文から必要な情報を瞬時に取得
              </span>
            </motion.p>
          </motion.div>

          {/* 検索フォーム */}
          <motion.div variants={itemVariants} className="max-w-2xl mx-auto mb-16">
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
              role="search"
            >
              <div className="relative">
                <motion.input
                  ref={searchInputRef}
                  type="text"
                  placeholder="例：急性心不全の治療方法は？、糖尿病の最新治療薬について..."
                  value={searchQuery}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200"
                  maxLength={200}
                  {...(!preferences.reduceMotion && {
                    whileFocus: { scale: 1.02 },
                    transition: { type: 'spring', stiffness: 300, damping: 20 }
                  })}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* エラーメッセージ */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200"
                >
                  {error}
                </motion.div>
              )}

              {/* 文字数カウンター */}
              <div className="text-right text-xs text-gray-500">
                {searchQuery.length}/200文字
              </div>

              <motion.button
                type="submit"
                disabled={isLoading || !!error}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200"
                {...(!preferences.reduceMotion && {
                  whileHover: { scale: 1.02, y: -2 },
                  whileTap: { scale: 0.98 },
                  transition: { type: 'spring', stiffness: 400, damping: 17 }
                })}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <motion.div
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    検索中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    医学的エビデンスを検索
                  </span>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>

        {/* 使用例セクション */}
        <motion.div variants={itemVariants} className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            検索例
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              '急性心不全の治療方法は？',
              '糖尿病の最新治療薬について',
              '高血圧の食事療法のエビデンス',
              '脳梗塞の予防薬の効果',
              'COVID-19の後遺症治療',
              '認知症の早期診断方法'
            ].map((example, index) => (
              <motion.button
                key={index}
                onClick={() => setSearchQuery(example)}
                className="p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors text-sm"
                {...(!preferences.reduceMotion && {
                  whileHover: { scale: 1.05 },
                  whileTap: { scale: 0.95 },
                  transition: { type: 'spring', stiffness: 400, damping: 17 }
                })}
              >
                {example}
              </motion.button>
            ))}
          </div>
          
          <p className="text-gray-500 text-sm mt-6">
            💡 上記の例をクリックすると検索フォームに入力されます
          </p>
        </motion.div>
      </motion.div>
    </main>
  );
} 