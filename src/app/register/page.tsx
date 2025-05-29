'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion } from 'framer-motion';
import { useAccessibility } from '@/hooks/useAccessibility';

export default function RegisterPage() {
  const router = useRouter();
  const { preferences, announce } = useAccessibility();
  
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    dateOfBirth: '',
    almaMater: '',
    graduationYear: '',
    specialty: '',
    email: '',
    password: '',
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'form' | 'auth' | 'profile' | 'complete'>('form');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    if (!formData.name) errors.name = '氏名は必須です';
    if (!formData.gender) errors.gender = '性別は必須です';
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = '生年月日は必須です';
    } else if (isNaN(new Date(formData.dateOfBirth).getTime())) {
      errors.dateOfBirth = '有効な生年月日を入力してください';
    }
    if (!formData.almaMater) errors.almaMater = '出身大学は必須です';
    if (!formData.graduationYear) {
      errors.graduationYear = '大学卒業年度は必須です';
    } else if (isNaN(Number(formData.graduationYear))) {
      errors.graduationYear = '有効な卒業年度（数値）を入力してください';
    }
    if (!formData.specialty) errors.specialty = '専門診療科は必須です';
    if (!formData.email) {
      errors.email = 'メールアドレスは必須です';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }
    if (!formData.password) {
      errors.password = 'パスワードは必須です';
    } else if (formData.password.length < 6) {
      errors.password = 'パスワードは6文字以上である必要があります';
    }
    return errors;
  };

  // 認証状態を待機する関数
  const waitForAuthenticatedSession = async (supabase: any, maxAttempts = 10): Promise<string | null> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session check error:', error);
        continue;
      }
      
      if (session?.user?.id && session.access_token) {
        console.log('Authenticated session found:', {
          userId: session.user.id,
          role: session.user.role || 'authenticated',
          aud: session.user.aud
        });
        return session.user.id;
      }
      
      // 500ms待機してから再試行
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return null;
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
    setRegistrationStep('auth');

    const supabase = createClient();

    try {
      if (preferences.screenReader) {
        announce('ユーザー登録を開始しています', 'polite');
      }

      // Step 1: ユーザー認証登録
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: formData.name,
            gender: formData.gender,
            university: formData.almaMater,
            graduation_year: formData.graduationYear,
            specialization: formData.specialty,
          },
        },
      });

      if (signUpError) {
        // 既存ユーザーの場合はサインインを試行
        if (signUpError.message === 'User already registered') {
          console.log('User already exists, attempting sign in...');
          
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });

          if (signInError) {
            throw new Error('このメールアドレスは既に登録されていますが、パスワードが正しくありません。');
          }

          if (!signInData?.user?.id) {
            throw new Error('サインインに成功しましたが、ユーザー情報を取得できませんでした。');
          }

          // 既存ユーザーの場合、プロフィール更新を試行
          await updateExistingProfile(supabase, signInData.user.id);
          return;
        } else {
          throw signUpError;
        }
      }

      if (!authData?.user?.id) {
        throw new Error('ユーザー登録に成功しましたが、ユーザーIDを取得できませんでした。');
      }

      console.log('Auth registration successful, waiting for authenticated session...');
      
      if (preferences.screenReader) {
        announce('認証が完了しました。プロフィール情報を保存しています', 'polite');
      }

      setRegistrationStep('profile');

      // Step 2: 認証済みセッションを待機
      const authenticatedUserId = await waitForAuthenticatedSession(supabase);
      
      if (!authenticatedUserId) {
        throw new Error('認証セッションの確立に失敗しました。しばらく待ってから再度お試しください。');
      }

      // Step 3: プロフィール情報をデータベースに挿入
      await insertUserProfile(supabase, authenticatedUserId);

    } catch (error: any) {
      console.error('Registration error:', error);
      setSubmissionError(
        error instanceof Error ? error.message : '登録中に不明なエラーが発生しました'
      );
      
      if (preferences.screenReader) {
        announce(`登録エラー: ${error.message}`, 'assertive');
      }
      
      setRegistrationStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  const insertUserProfile = async (supabase: any, userId: string) => {
    // 現在のセッション情報をログ出力
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current session before profile insert:', {
      userId: session?.user?.id,
      accessToken: session?.access_token ? 'present' : 'missing',
      role: session?.user?.role || session?.user?.aud
    });

    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          name: formData.name,
          gender: formData.gender,
          birth_date: formData.dateOfBirth,
          university: formData.almaMater,
          graduation_year: parseInt(formData.graduationYear),
          specialization: formData.specialty,
          email: formData.email,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (insertError) {
      console.error('Profile insertion error:', {
        error: insertError,
        userId: userId,
        sessionInfo: session
      });

      if (insertError.code === '23505') {
        throw new Error('このメールアドレスは既に登録されています。');
      } else if (insertError.code === '42501' || insertError.message?.includes('permission')) {
        throw new Error('データベースへのアクセス権限がありません。メール確認が必要な可能性があります。');
      } else {
        throw new Error(`プロフィールの登録に失敗しました: ${insertError.message}`);
      }
    }

    console.log('Profile inserted successfully:', insertData);
    setRegistrationStep('complete');
    setIsSubmitted(true);
    
    if (preferences.screenReader) {
      announce('登録が完了しました。メインページに移動します', 'polite');
    }
  };

  const updateExistingProfile = async (supabase: any, userId: string) => {
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({
        name: formData.name,
        gender: formData.gender,
        birth_date: formData.dateOfBirth,
        university: formData.almaMater,
        graduation_year: parseInt(formData.graduationYear),
        specialization: formData.specialty,
      })
      .eq('id', userId)
      .select();

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw new Error(`プロフィールの更新に失敗しました: ${updateError.message}`);
    }

    console.log('Profile updated successfully:', updateData);
    setRegistrationStep('complete');
    setIsSubmitted(true);
    
    if (preferences.screenReader) {
      announce('プロフィールが更新されました。メインページに移動します', 'polite');
    }
  };

  // 登録完了時にホームページへリダイレクト
  useEffect(() => {
    if (isSubmitted && registrationStep === 'complete') {
      const timer = setTimeout(() => {
        router.push('/');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSubmitted, registrationStep, router]);

  const getStepMessage = () => {
    switch (registrationStep) {
      case 'auth':
        return 'ユーザー認証を処理中...';
      case 'profile':
        return 'プロフィール情報を保存中...';
      case 'complete':
        return '登録完了！メインページに移動します...';
      default:
        return '';
    }
  };

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
            アカウント登録
          </motion.h2>
          <p className="text-sm text-gray-600">
            必要な情報を入力して登録してください
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
            <p className="text-sm text-blue-700">{getStepMessage()}</p>
          </motion.div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* 氏名 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                formErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="山田 太郎"
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
              aria-describedby={formErrors.name ? 'name-error' : undefined}
              aria-invalid={!!formErrors.name}
            />
            {formErrors.name && (
              <p id="name-error" className="mt-1 text-xs text-red-500" role="alert">
                {formErrors.name}
              </p>
            )}
          </div>

          {/* 性別 */}
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
              性別 <span className="text-red-500">*</span>
            </label>
            <select
              id="gender"
              name="gender"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                formErrors.gender ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              value={formData.gender}
              onChange={handleChange}
              disabled={isLoading}
              aria-describedby={formErrors.gender ? 'gender-error' : undefined}
              aria-invalid={!!formErrors.gender}
            >
              <option value="">選択してください</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
            {formErrors.gender && (
              <p id="gender-error" className="mt-1 text-xs text-red-500" role="alert">
                {formErrors.gender}
              </p>
            )}
          </div>

          {/* 生年月日 */}
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
              生年月日 <span className="text-red-500">*</span>
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                formErrors.dateOfBirth ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              value={formData.dateOfBirth}
              onChange={handleChange}
              disabled={isLoading}
              aria-describedby={formErrors.dateOfBirth ? 'dateOfBirth-error' : undefined}
              aria-invalid={!!formErrors.dateOfBirth}
            />
            {formErrors.dateOfBirth && (
              <p id="dateOfBirth-error" className="mt-1 text-xs text-red-500" role="alert">
                {formErrors.dateOfBirth}
              </p>
            )}
          </div>

          {/* 出身大学 */}
          <div>
            <label htmlFor="almaMater" className="block text-sm font-medium text-gray-700 mb-1">
              出身大学 <span className="text-red-500">*</span>
            </label>
            <input
              id="almaMater"
              name="almaMater"
              type="text"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                formErrors.almaMater ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="○○大学医学部"
              value={formData.almaMater}
              onChange={handleChange}
              disabled={isLoading}
              aria-describedby={formErrors.almaMater ? 'almaMater-error' : undefined}
              aria-invalid={!!formErrors.almaMater}
            />
            {formErrors.almaMater && (
              <p id="almaMater-error" className="mt-1 text-xs text-red-500" role="alert">
                {formErrors.almaMater}
              </p>
            )}
          </div>

          {/* 卒業年度 */}
          <div>
            <label htmlFor="graduationYear" className="block text-sm font-medium text-gray-700 mb-1">
              卒業年度 <span className="text-red-500">*</span>
            </label>
            <input
              id="graduationYear"
              name="graduationYear"
              type="number"
              min="1950"
              max="2030"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                formErrors.graduationYear ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="2020"
              value={formData.graduationYear}
              onChange={handleChange}
              disabled={isLoading}
              aria-describedby={formErrors.graduationYear ? 'graduationYear-error' : undefined}
              aria-invalid={!!formErrors.graduationYear}
            />
            {formErrors.graduationYear && (
              <p id="graduationYear-error" className="mt-1 text-xs text-red-500" role="alert">
                {formErrors.graduationYear}
              </p>
            )}
          </div>

          {/* 専門診療科 */}
          <div>
            <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1">
              専門診療科 <span className="text-red-500">*</span>
            </label>
            <input
              id="specialty"
              name="specialty"
              type="text"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                formErrors.specialty ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="内科、外科、小児科など"
              value={formData.specialty}
              onChange={handleChange}
              disabled={isLoading}
              aria-describedby={formErrors.specialty ? 'specialty-error' : undefined}
              aria-invalid={!!formErrors.specialty}
            />
            {formErrors.specialty && (
              <p id="specialty-error" className="mt-1 text-xs text-red-500" role="alert">
                {formErrors.specialty}
              </p>
            )}
          </div>

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
              autoComplete="new-password"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                formErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="6文字以上"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              aria-describedby={formErrors.password ? 'password-error' : 'password-help'}
              aria-invalid={!!formErrors.password}
            />
            {formErrors.password ? (
              <p id="password-error" className="mt-1 text-xs text-red-500" role="alert">
                {formErrors.password}
              </p>
            ) : (
              <p id="password-help" className="mt-1 text-xs text-gray-500">
                6文字以上で入力してください
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
          {isSubmitted && registrationStep === 'complete' && (
            <motion.div 
              className="bg-green-50 border border-green-200 rounded-lg p-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              role="status"
              aria-live="polite"
            >
              <p className="text-sm text-green-700 flex items-center">
                <span className="mr-2" aria-hidden="true">✅</span>
                登録が完了しました！メインページに移動します...
              </p>
            </motion.div>
          )}

          {/* 送信ボタン */}
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
            {isLoading ? getStepMessage() || '登録中...' : '登録'}
          </motion.button>

          <p id="submit-help" className="sr-only">
            フォームを送信してアカウントを作成します
          </p>
        </form>

        {/* ログインリンク */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            既にアカウントをお持ちですか？{' '}
            <a 
              href="/login" 
              className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            >
              ログイン
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
