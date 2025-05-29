// カスタムコマンドの型定義
declare global {
  namespace Cypress {
    interface Chainable {
      // 必要に応じてカスタムコマンドを追加
    }
  }
}

// テスト実行前に実行される処理
beforeEach(() => {
  // 必要に応じて前処理を追加
});

// テスト実行後に実行される処理
afterEach(() => {
  // 必要に応じて後処理を追加
});

// ファイルをモジュールとして扱うためのexport
export {};
