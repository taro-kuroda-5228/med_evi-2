'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion } from 'framer-motion';
import { useAccessibility } from '@/hooks/useAccessibility';

export default function LoginPage() {
  const router = useRouter();
  const { preferences, announce } = useAccessibility();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));

    // 入力時にエラーをクリア
    if (formErrors[name]) {
      setFormErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors[name];
        return newErrors;
      });
    }
    setSubmissionError(null);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    
    if (!formData.email) {
      errors.email = 'メールアドレスは必須です';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }
    
    if (!formData.password) {
      errors.password = 'パスワードは必須です';
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmissionError(null);

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (preferences.screenReader) {
        announce('フォームにエラーがあります。修正してください。', 'assertive');
      }
      return;
    }

    setFormErrors({});
    setIsLoading(true);

    const supabase = createClient();

    try {
      if (preferences.screenReader) {
        announce('ログインを開始しています', 'polite');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error('Login error:', error);
        
        if (error.message === 'Invalid login credentials') {
          throw new Error('メールアドレスまたはパスワードが正しくありません。');
        } else if (error.message === 'Email not confirmed') {
          throw new Error('メールアドレスの確認が完了していません。確認メールをご確認ください。');
        } else {
          throw new Error(`ログインに失敗しました: ${error.message}`);
        }
      }

      if (!data?.user?.id) {
        throw new Error('ログインに成功しましたが、ユーザー情報を取得できませんでした。');
      }

      console.log('Login successful:', {
        userId: data.user.id,
        email: data.user.email,
        role: data.user.role || 'authenticated'
      });

      setIsLoggedIn(true);
      
      if (preferences.screenReader) {
        announce('ログインが完了しました。メインページに移動します', 'polite');
      }

    } catch (error: any) {
      console.error('Login error:', error);
      setSubmissionError(
        error instanceof Error ? error.message : 'ログイン中に不明なエラーが発生しました'
      );
      
      if (preferences.screenReader) {
        announce(`ログインエラー: ${error.message}`, 'assertive');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ログイン成功時にホームページへリダイレクト
  useEffect(() => {
    if (isLoggedIn) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, router]);

  // 既にログイン済みかチェック
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Already logged in, redirecting...');
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  const animationProps = preferences.reduceMotion ? {} : {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-xl border border-blue-100"
        {...animationProps}
      >
        <div className="text-center">
          <motion.h2 
            className="text-3xl font-bold text-blue-600 mb-2"
            {...(!preferences.reduceMotion && {
              initial: { scale: 0.9 },
              animate: { scale: 1 },
              transition: { delay: 0.2 }
            })}
          >
            ログイン
          </motion.h2>
          <p className="text-sm text-gray-600">
            アカウントにログインしてください
          </p>
        </div>

        {/* 進行状況インジケーター */}
        {isLoading && (
          <motion.div 
            className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-center mb-2">
              <motion.div
                className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"
                animate={{ rotate: preferences.reduceMotion ? 0 : 360 }}
                transition={{
                  duration: preferences.reduceMotion ? 0 : 1,
                  repeat: preferences.reduceMotion ? 0 : Infinity,
                  ease: 'linear',
                }}
                aria-hidden="true"
              />
            </div>
            <p className="text-sm text-blue-700">ログイン中...</p>
          </motion.div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* メールアドレス */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                formErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="example@email.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              aria-describedby={formErrors.email ? 'email-error' : undefined}
              aria-invalid={!!formErrors.email}
            />
            {formErrors.email && (
              <p id="email-error" className="mt-1 text-xs text-red-500" role="alert">
                {formErrors.email}
              </p>
            )}
          </div>

          {/* パスワード */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              パスワード <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                formErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="パスワード"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              aria-describedby={formErrors.password ? 'password-error' : undefined}
              aria-invalid={!!formErrors.password}
            />
            {formErrors.password && (
              <p id="password-error" className="mt-1 text-xs text-red-500" role="alert">
                {formErrors.password}
              </p>
            )}
          </div>

          {/* エラーメッセージ */}
          {submissionError && (
            <motion.div 
              className="bg-red-50 border border-red-200 rounded-lg p-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              role="alert"
              aria-live="assertive"
            >
              <p className="text-sm text-red-700 flex items-center">
                <span className="mr-2" aria-hidden="true">⚠️</span>
                {submissionError}
              </p>
            </motion.div>
          )}

          {/* 成功メッセージ */}
          {isLoggedIn && (
            <motion.div 
              className="bg-green-50 border border-green-200 rounded-lg p-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              role="status"
              aria-live="polite"
            >
              <p className="text-sm text-green-700 flex items-center">
                <span className="mr-2" aria-hidden="true">✅</span>
                ログインが完了しました！メインページに移動します...
              </p>
            </motion.div>
          )}

          {/* ログインボタン */}
          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            {...(!preferences.reduceMotion && {
              whileHover: !isLoading ? { scale: 1.02 } : {},
              whileTap: { scale: 0.98 }
            })}
            aria-describedby="submit-help"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </motion.button>

          <p id="submit-help" className="sr-only">
            フォームを送信してログインします
          </p>
        </form>

        {/* パスワードリセットリンク */}
        <div className="text-center">
          <a 
            href="/reset-password" 
            className="text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            パスワードを忘れた方はこちら
          </a>
        </div>

        {/* 登録リンク */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は{' '}
            <a 
              href="/register" 
              className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            >
              新規登録
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
} 