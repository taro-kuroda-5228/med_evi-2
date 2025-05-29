-- =====================================================
-- メドエビデンス (MedEvidence) - Supabase RLS設定
-- =====================================================

-- 1. usersテーブルの作成
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  birth_date DATE,
  university TEXT,
  graduation_year INTEGER CHECK (graduation_year >= 1950 AND graduation_year <= 2030),
  specialization TEXT,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. search_queriesテーブルの作成
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  translated_query TEXT,
  answer TEXT,
  citations TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  web_results TEXT,
  user_evidence TEXT,
  use_only_user_evidence BOOLEAN DEFAULT FALSE,
  use_pubmed_only BOOLEAN DEFAULT FALSE,
  max_results INTEGER DEFAULT 10,
  response_language TEXT DEFAULT 'ja',
  previous_query_id UUID REFERENCES search_queries(id),
  feedback TEXT,
  feedback_comment TEXT,
  feedback_submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. favorite_papersテーブルの作成（お気に入り論文用）
CREATE TABLE IF NOT EXISTS favorite_papers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  authors TEXT,
  journal TEXT,
  publication_year INTEGER,
  doi TEXT,
  pmid TEXT,
  abstract TEXT,
  url TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- RLS (Row Level Security) の有効化
-- =====================================================

-- usersテーブルのRLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- search_queriesテーブルのRLS有効化
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- favorite_papersテーブルのRLS有効化
ALTER TABLE favorite_papers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- usersテーブルのRLSポリシー
-- =====================================================

-- 既存のポリシーを削除（再実行時のため）
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- INSERT: ユーザーは自分のプロフィールのみ作成可能
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- SELECT: ユーザーは自分のプロフィールのみ閲覧可能
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- UPDATE: ユーザーは自分のプロフィールのみ更新可能
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: ユーザーは自分のプロフィールのみ削除可能
CREATE POLICY "Users can delete their own profile" ON users
  FOR DELETE 
  USING (auth.uid() = id);

-- =====================================================
-- search_queriesテーブルのRLSポリシー
-- =====================================================

-- 既存のポリシーを削除（再実行時のため）
DROP POLICY IF EXISTS "Users can insert their own search queries" ON search_queries;
DROP POLICY IF EXISTS "Users can view their own search queries" ON search_queries;
DROP POLICY IF EXISTS "Users can update their own search queries" ON search_queries;
DROP POLICY IF EXISTS "Users can delete their own search queries" ON search_queries;

-- INSERT: ユーザーは自分の検索クエリのみ作成可能
CREATE POLICY "Users can insert their own search queries" ON search_queries
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- SELECT: ユーザーは自分の検索クエリのみ閲覧可能
CREATE POLICY "Users can view their own search queries" ON search_queries
  FOR SELECT 
  USING (auth.uid() = user_id);

-- UPDATE: ユーザーは自分の検索クエリのみ更新可能（お気に入り切り替えなど）
CREATE POLICY "Users can update their own search queries" ON search_queries
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: ユーザーは自分の検索クエリのみ削除可能
CREATE POLICY "Users can delete their own search queries" ON search_queries
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- favorite_papersテーブルのRLSポリシー
-- =====================================================

-- 既存のポリシーを削除（再実行時のため）
DROP POLICY IF EXISTS "Users can insert their own favorite papers" ON favorite_papers;
DROP POLICY IF EXISTS "Users can view their own favorite papers" ON favorite_papers;
DROP POLICY IF EXISTS "Users can update their own favorite papers" ON favorite_papers;
DROP POLICY IF EXISTS "Users can delete their own favorite papers" ON favorite_papers;

-- INSERT: ユーザーは自分のお気に入り論文のみ追加可能
CREATE POLICY "Users can insert their own favorite papers" ON favorite_papers
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- SELECT: ユーザーは自分のお気に入り論文のみ閲覧可能
CREATE POLICY "Users can view their own favorite papers" ON favorite_papers
  FOR SELECT 
  USING (auth.uid() = user_id);

-- UPDATE: ユーザーは自分のお気に入り論文のみ更新可能
CREATE POLICY "Users can update their own favorite papers" ON favorite_papers
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: ユーザーは自分のお気に入り論文のみ削除可能
CREATE POLICY "Users can delete their own favorite papers" ON favorite_papers
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- インデックスの作成（パフォーマンス向上）
-- =====================================================

-- usersテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- search_queriesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at);
CREATE INDEX IF NOT EXISTS idx_search_queries_is_favorite ON search_queries(is_favorite);

-- favorite_papersテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_favorite_papers_user_id ON favorite_papers(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_papers_added_at ON favorite_papers(added_at);

-- =====================================================
-- 関数とトリガーの作成（updated_atの自動更新）
-- =====================================================

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- usersテーブルのupdated_at自動更新トリガー
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 権限の確認クエリ（デバッグ用）
-- =====================================================

-- 現在のユーザーとロールを確認
-- SELECT 
--   auth.uid() as current_user_id,
--   auth.role() as current_role,
--   auth.jwt() ->> 'aud' as audience;

-- RLSポリシーの一覧を確認
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname; 