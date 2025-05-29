-- =====================================================
-- search_queriesテーブルにresults_countカラムを追加
-- =====================================================

-- results_countカラムを追加（まだない場合）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_queries' AND column_name = 'results_count'
  ) THEN
    ALTER TABLE search_queries 
    ADD COLUMN results_count INTEGER DEFAULT 0;
    
    -- コメントを追加
    COMMENT ON COLUMN search_queries.results_count IS '検索結果の件数';
  END IF;
END $$;

-- is_favoriteカラムも追加（まだない場合）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_queries' AND column_name = 'is_favorite'
  ) THEN
    ALTER TABLE search_queries 
    ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
    
    -- コメントを追加
    COMMENT ON COLUMN search_queries.is_favorite IS 'お気に入りの検索クエリかどうか';
  END IF;
END $$;

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_search_queries_results_count ON search_queries(results_count);
CREATE INDEX IF NOT EXISTS idx_search_queries_is_favorite ON search_queries(is_favorite);

-- 現在のテーブル構造を確認（デバッグ用）
-- SELECT 
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'search_queries'
-- ORDER BY ordinal_position; 