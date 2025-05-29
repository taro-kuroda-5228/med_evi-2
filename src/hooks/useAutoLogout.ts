import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UseAutoLogoutOptions {
  timeoutMinutes?: number; // 自動ログアウトまでの時間（分）
  warningMinutes?: number; // 警告表示までの時間（分）
  onWarning?: () => void; // 警告時のコールバック
  onLogout?: () => void; // ログアウト時のコールバック
}

export const useAutoLogout = ({
  timeoutMinutes = 30, // デフォルト30分
  warningMinutes = 25, // デフォルト25分で警告
  onWarning,
  onLogout
}: UseAutoLogoutOptions = {}) => {
  const { user } = useAuth();
  const supabase = createClient();
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // ログアウト処理
  const performLogout = useCallback(async () => {
    try {
      console.log('自動ログアウト実行');
      
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
      
      // コールバック実行
      onLogout?.();
      
      // ホームページにリダイレクト
      window.location.href = '/';
      
    } catch (error) {
      console.error('自動ログアウトエラー:', error);
      // エラーが発生してもリダイレクト
      window.location.href = '/';
    }
  }, [supabase, onLogout]);

  // タイマーをリセット
  const resetTimer = useCallback(() => {
    if (!user) return;

    lastActivityRef.current = Date.now();

    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // 警告タイマーを設定
    warningTimeoutRef.current = setTimeout(() => {
      console.log('自動ログアウト警告');
      onWarning?.();
    }, warningMinutes * 60 * 1000);

    // ログアウトタイマーを設定
    timeoutRef.current = setTimeout(() => {
      performLogout();
    }, timeoutMinutes * 60 * 1000);

  }, [user, timeoutMinutes, warningMinutes, onWarning, performLogout]);

  // アクティビティイベントのリスナー
  useEffect(() => {
    if (!user) {
      // ログインしていない場合はタイマーをクリア
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      return;
    }

    // 監視するイベント
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    // アクティビティハンドラー
    const handleActivity = () => {
      const now = Date.now();
      // 最後のアクティビティから1秒以上経過している場合のみリセット（過度なリセットを防ぐ）
      if (now - lastActivityRef.current > 1000) {
        resetTimer();
      }
    };

    // イベントリスナーを追加
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // 初期タイマー設定
    resetTimer();

    // クリーンアップ
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [user, resetTimer]);

  // 手動でタイマーをリセットする関数を返す
  return {
    resetTimer,
    getRemainingTime: () => {
      if (!user || !timeoutRef.current) return 0;
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = (timeoutMinutes * 60 * 1000) - elapsed;
      return Math.max(0, Math.floor(remaining / 1000)); // 秒単位で返す
    }
  };
}; 