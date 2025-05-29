# Supabase認証設定の修正手順

## 問題: Email signups are disabled

### 解決手順

#### 1. Supabaseダッシュボードにアクセス
1. [Supabaseダッシュボード](https://supabase.com/dashboard)にログイン
2. プロジェクト「cziiajkjurugkxstggat」を選択

#### 2. 認証設定の修正
1. 左サイドバーから **Authentication** をクリック
2. **Settings** タブをクリック
3. 以下の設定を確認・修正：

**重要な設定項目**:

```
✅ Enable email confirmations: OFF（無効）
✅ Enable email signups: ON（有効）
✅ Enable phone confirmations: OFF（無効、オプション）
✅ Enable phone signups: OFF（無効、オプション）
```

#### 3. 具体的な修正箇所

**「User Management」セクション**:
- **Enable email signups**: ✅ チェックを入れる（有効化）
- **Enable email confirmations**: ❌ チェックを外す（無効化）

**「Email Auth」セクション**:
- **Confirm email**: ❌ 無効にする
- **Secure email change**: ❌ 無効にする（開発環境）

#### 4. 設定保存
- **Save** ボタンをクリック
- 設定が反映されるまで1-2分待機

#### 5. 追加設定（オプション）

**「Site URL」の設定**:
```
Site URL: http://localhost:3000
Additional redirect URLs: http://localhost:3000/auth/callback
```

**「JWT Settings」の確認**:
```
JWT expiry: 3600 (1時間)
```

## 設定後のテスト手順

1. ブラウザでアプリケーションをリフレッシュ
2. 新規登録を再試行
3. エラーが解消されることを確認

## その他のエラーについて

### manifest.json (404エラー)
- これは重要ではない警告です
- PWA設定が不完全なため発生
- 登録機能には影響しません

### icon.svg (404エラー)
- ファビコンが見つからない警告
- 登録機能には影響しません

### React DevTools
- 開発ツールの推奨メッセージ
- 無視して問題ありません 