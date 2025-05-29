-- =====================================================
-- テスト用サンプルデータの追加
-- =====================================================

-- 現在認証されているユーザーのIDを取得
DO $$
DECLARE
    current_user_id UUID;
BEGIN
    -- 現在のユーザーIDを取得（認証されている場合）
    SELECT auth.uid() INTO current_user_id;
    
    -- ユーザーが認証されていない場合は処理を終了
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'ユーザーが認証されていません。ログインしてから実行してください。';
        RETURN;
    END IF;

    -- サンプルフォルダーの追加
    INSERT INTO folders (name, user_id) VALUES
    ('内分泌', current_user_id),
    ('循環器', current_user_id),
    ('感染症', current_user_id),
    ('手術関連', current_user_id)
    ON CONFLICT (user_id, name) DO NOTHING;

    -- サンプルお気に入り論文の追加
    WITH folder_ids AS (
      SELECT id, name FROM folders WHERE user_id = current_user_id
    )
    INSERT INTO favorite_papers (
      title, 
      authors, 
      journal, 
      publication_year, 
      doi, 
      folder_id, 
      user_id
    ) VALUES
    (
      'Efficacy and Safety of Novel GLP-1 Receptor Agonists in Type 2 Diabetes',
      'Smith J, Johnson A, Brown K',
      'New England Journal of Medicine',
      2024,
      '10.1056/NEJMoa2024001',
      (SELECT id FROM folder_ids WHERE name = '内分泌'),
      current_user_id
    ),
    (
      'Dietary Approaches to Stop Hypertension: Updated Guidelines',
      'Wilson M, Davis L, Taylor R',
      'Circulation',
      2023,
      '10.1161/CIR.2023.147.15.e123',
      (SELECT id FROM folder_ids WHERE name = '循環器'),
      current_user_id
    ),
    (
      'Long-term Effectiveness of COVID-19 mRNA Vaccines',
      'Anderson P, Garcia M, Lee S',
      'The Lancet',
      2024,
      '10.1016/S0140-6736(24)00123-4',
      (SELECT id FROM folder_ids WHERE name = '感染症'),
      current_user_id
    ),
    (
      'Minimally Invasive Surgical Techniques in Cardiac Surgery',
      'Johnson R, Williams T, Brown M',
      'Journal of Thoracic Surgery',
      2024,
      '10.1016/j.jtcvs.2024.01.001',
      (SELECT id FROM folder_ids WHERE name = '手術関連'),
      current_user_id
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'サンプルデータが正常に追加されました。';
END $$; 