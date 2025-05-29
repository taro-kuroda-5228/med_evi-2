'use client';

import { useState, useEffect } from 'react';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import AutoLogoutWarning from '@/components/AutoLogoutWarning';
import { useAccessibility } from '@/hooks/useAccessibility';
import { createClient } from '@/utils/supabase/client';

interface AutoLogoutProviderProps {
  children: React.ReactNode;
}

export default function AutoLogoutProvider({ children }: AutoLogoutProviderProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [debugTime, setDebugTime] = useState(0);
  const { announce } = useAccessibility();
  const supabase = createClient();

  // 自動ログアウト機能を初期化
  const { resetTimer, getRemainingTime } = useAutoLogout({
    timeoutMinutes: process.env.NODE_ENV === 'development' ? 2 : 30, // 開発環境では2分、本番では30分
    warningMinutes: process.env.NODE_ENV === 'development' ? 1.5 : 25, // 開発環境では1.5分、本番では25分
    onWarning: () => {
      console.log('自動ログアウト警告表示');
      setShowWarning(true);
    },
    onLogout: () => {
      console.log('自動ログアウト実行');
      setShowWarning(false);
      if (announce) {
        announce('セッションが期限切れになりました。ログアウトします。', 'assertive');
      }
    }
  });

  // 開発環境でのデバッグ情報更新
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const interval = setInterval(() => {
      setDebugTime(getRemainingTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [getRemainingTime]);

  // セッション延長処理
  const handleExtendSession = () => {
    console.log('セッション延長');
    setShowWarning(false);
    resetTimer();
  };

  // 手動ログアウト処理
  const handleLogoutNow = async () => {
    try {
      console.log('手動ログアウト実行');
      setShowWarning(false);
      
      // Supabaseからログアウト
      await supabase.auth.signOut({ scope: 'global' });
      
      // ローカルストレージクリア
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('supabase')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();
      
      // ホームページにリダイレクト
      window.location.href = '/';
      
    } catch (error) {
      console.error('手動ログアウトエラー:', error);
      // エラーが発生してもリダイレクト
      window.location.href = '/';
    }
  };

  return (
    <>
      {children}
      
      {/* 自動ログアウト警告モーダル */}
      <AutoLogoutWarning
        isVisible={showWarning}
        remainingSeconds={getRemainingTime()}
        onExtendSession={handleExtendSession}
        onLogoutNow={handleLogoutNow}
      />
      
      {/* 開発環境でのデバッグ情報 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black text-white text-xs p-3 rounded-lg opacity-75 pointer-events-none z-40 max-w-xs">
          <div className="font-bold mb-1">自動ログアウト デバッグ</div>
          <div>残り時間: {Math.floor(debugTime / 60)}分{debugTime % 60}秒</div>
          <div>警告表示: {showWarning ? 'ON' : 'OFF'}</div>
          <div className="text-yellow-300 mt-1">
            開発環境: 2分でログアウト
          </div>
        </div>
      )}
    </>
  );
} 