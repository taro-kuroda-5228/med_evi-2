-- ユーザープロフィール自動作成の完全なセットアップ
-- Supabaseダッシュボードで実行してください

-- 0. 問題のある既存の関数とトリガーを削除（CASCADE使用）
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 0-1. 他のテーブル用にupdate_updated_at_column関数を再作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 0-2. 他のテーブルのトリガーを再作成
CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_favorite_papers_updated_at
    BEFORE UPDATE ON favorite_papers
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_search_queries_updated_at
    BEFORE UPDATE ON search_queries
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 1. usersテーブルの構造確認（最初に実行）
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. 既存の認証ユーザーでプロフィールが未作成のものを一括作成
INSERT INTO public.users (id, email, name, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as name,
  au.created_at
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;

-- 3. ユーザープロフィール自動作成関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.created_at
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 既存のトリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 5. 新しいトリガーを作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. 既存の検索履歴データ（user_id=null）を現在のユーザーに関連付け
-- 注意：これは今日作成されたデータのみを対象とします
UPDATE search_queries 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = (
    SELECT email FROM auth.users 
    ORDER BY created_at DESC 
    LIMIT 1
  )
)
WHERE user_id IS NULL 
AND created_at > NOW() - INTERVAL '1 day';

-- 7. 確認クエリ
SELECT 'ユーザー数' as type, COUNT(*) as count FROM users
UNION ALL
SELECT '認証ユーザー数' as type, COUNT(*) as count FROM auth.users
UNION ALL
SELECT '検索履歴数' as type, COUNT(*) as count FROM search_queries;

-- 8. 特定ユーザーの確認
SELECT 
  u.id,
  u.email,
  u.name,
  u.created_at,
  (SELECT COUNT(*) FROM search_queries sq WHERE sq.user_id = u.id) as search_count
FROM users u
ORDER BY u.created_at DESC; 