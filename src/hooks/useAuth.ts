import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    // 初期認証状態を取得
    const getInitialSession = async () => {
      try {
        console.log('認証状態の初期取得開始');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('初期セッション取得エラー:', error);
        }
        
        console.log('初期セッション:', session?.user ? 'ログイン済み' : 'ログアウト状態');
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('初期認証状態取得エラー:', error);
        setUser(null);
        setLoading(false);
      }
    };

    getInitialSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('認証状態変更:', event, session?.user ? 'ログイン済み' : 'ログアウト状態');
        
        // 明示的にユーザー状態を更新
        const newUser = session?.user ?? null;
        setUser(newUser);
        setLoading(false);
        
        // ログアウト時の追加処理
        if (event === 'SIGNED_OUT') {
          console.log('ログアウトイベント検出 - ユーザー状態をクリア');
          setUser(null);
        }
      }
    );

    return () => {
      console.log('認証監視を停止');
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // デバッグ用のログ
  useEffect(() => {
    console.log('useAuth状態更新:', { 
      user: user ? `ログイン済み (${user.email})` : 'ログアウト状態', 
      loading 
    });
  }, [user, loading]);

  return {
    user,
    loading,
  };
}; 