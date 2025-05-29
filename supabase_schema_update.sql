-- =====================================================
-- フォルダー機能とお気に入り論文のためのスキーマ更新
-- =====================================================

-- 1. フォルダーテーブルの作成
CREATE TABLE IF NOT EXISTS folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT folders_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT folders_user_name_unique UNIQUE (user_id, name)
);

-- 2. お気に入り論文テーブルの作成
CREATE TABLE IF NOT EXISTS favorite_papers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  authors TEXT,
  journal TEXT,
  year TEXT,
  doi TEXT,
  pmid TEXT,
  abstract TEXT,
  url TEXT,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT favorite_papers_title_not_empty CHECK (length(trim(title)) > 0)
);

-- 3. 検索履歴テーブルの更新（既存テーブルがある場合）
-- search_queriesテーブルにuser_idカラムを追加（まだない場合）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_queries' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE search_queries 
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- RLS (Row Level Security) の有効化
-- =====================================================

-- foldersテーブルのRLS有効化
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- favorite_papersテーブルのRLS有効化
ALTER TABLE favorite_papers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- foldersテーブルのRLSポリシー
-- =====================================================

-- 既存のポリシーを削除（再実行時のため）
DROP POLICY IF EXISTS "Users can manage their own folders" ON folders;

-- フォルダーの全操作（CRUD）を許可
CREATE POLICY "Users can manage their own folders" ON folders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- favorite_papersテーブルのRLSポリシー
-- =====================================================

-- 既存のポリシーを削除（再実行時のため）
DROP POLICY IF EXISTS "Users can manage their own favorite papers" ON favorite_papers;

-- お気に入り論文の全操作（CRUD）を許可
CREATE POLICY "Users can manage their own favorite papers" ON favorite_papers
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- インデックスの作成（パフォーマンス向上）
-- =====================================================

-- foldersテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_created_at ON folders(created_at);

-- favorite_papersテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_favorite_papers_user_id ON favorite_papers(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_papers_folder_id ON favorite_papers(folder_id);
CREATE INDEX IF NOT EXISTS idx_favorite_papers_created_at ON favorite_papers(created_at);

-- search_queriesテーブルのインデックス（user_idが追加された場合）
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON search_queries(user_id);

-- =====================================================
-- トリガーの作成（updated_atの自動更新）
-- =====================================================

-- foldersテーブルのupdated_at自動更新トリガー
DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- favorite_papersテーブルのupdated_at自動更新トリガー
DROP TRIGGER IF EXISTS update_favorite_papers_updated_at ON favorite_papers;
CREATE TRIGGER update_favorite_papers_updated_at
    BEFORE UPDATE ON favorite_papers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 初期データの挿入（オプション）
-- =====================================================

-- デフォルトフォルダーの作成は不要（ユーザーが自由に作成）

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
--   AND tablename IN ('folders', 'favorite_papers', 'search_queries')
-- ORDER BY tablename, policyname; 

-- search_queriesテーブルにユニーク制約を追加（重複防止）
ALTER TABLE search_queries 
ADD CONSTRAINT unique_user_query 
UNIQUE (user_id, query); 