'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccessibility } from '@/hooks/useAccessibility';

interface AutoLogoutWarningProps {
  isVisible: boolean;
  remainingSeconds: number;
  onExtendSession: () => void;
  onLogoutNow: () => void;
}

export default function AutoLogoutWarning({
  isVisible,
  remainingSeconds,
  onExtendSession,
  onLogoutNow
}: AutoLogoutWarningProps) {
  const { preferences, announce } = useAccessibility();
  const [countdown, setCountdown] = useState(remainingSeconds);

  useEffect(() => {
    if (isVisible) {
      setCountdown(remainingSeconds);
      
      if (preferences.screenReader) {
        announce(
          `セッションの有効期限が近づいています。あと${Math.floor(remainingSeconds / 60)}分でログアウトされます。`,
          'assertive'
        );
      }
    }
  }, [isVisible, remainingSeconds, preferences.screenReader, announce]);

  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        const newCount = prev - 1;
        
        // 残り1分、30秒、10秒でアナウンス
        if (preferences.screenReader && (newCount === 60 || newCount === 30 || newCount === 10)) {
          announce(`あと${newCount}秒でログアウトされます`, 'assertive');
        }
        
        return Math.max(0, newCount);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, preferences.screenReader, announce]);

  // キーボードショートカット
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onExtendSession();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onLogoutNow();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onExtendSession, onLogoutNow]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleExtendSession = () => {
    onExtendSession();
    if (preferences.screenReader) {
      announce('セッションが延長されました', 'polite');
    }
  };

  const handleLogoutNow = () => {
    onLogoutNow();
    if (preferences.screenReader) {
      announce('ログアウトしています', 'assertive');
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-warning-title"
            aria-describedby="logout-warning-description"
          >
            {/* モーダル */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200"
            >
              {/* アイコンとタイトル */}
              <div className="text-center mb-6">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <span className="text-2xl" role="img" aria-label="警告">⚠️</span>
                </motion.div>
                
                <h2 
                  id="logout-warning-title"
                  className="text-xl font-bold text-gray-900 mb-2"
                >
                  セッション期限切れ警告
                </h2>
                
                <p 
                  id="logout-warning-description"
                  className="text-gray-600"
                >
                  しばらく操作されていないため、セキュリティのため自動的にログアウトされます。
                </p>
              </div>

              {/* カウントダウン */}
              <div className="text-center mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600 mb-2">自動ログアウトまで</p>
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-3xl font-bold text-red-600"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {formatTime(countdown)}
                  </motion.div>
                </div>
              </div>

              {/* ボタン */}
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  onClick={handleExtendSession}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  {...(!preferences.reduceMotion && {
                    whileHover: { scale: 1.02 },
                    whileTap: { scale: 0.98 }
                  })}
                  autoFocus
                >
                  セッションを延長
                </motion.button>
                
                <motion.button
                  onClick={handleLogoutNow}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  {...(!preferences.reduceMotion && {
                    whileHover: { scale: 1.02 },
                    whileTap: { scale: 0.98 }
                  })}
                >
                  今すぐログアウト
                </motion.button>
              </div>

              {/* キーボードショートカット */}
              <div className="mt-4 text-xs text-gray-500 text-center">
                <p>Enter: セッション延長 | Escape: ログアウト</p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 