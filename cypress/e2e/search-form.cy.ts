describe('SearchForm', () => {
  beforeEach(() => {
    // 各テスト前にトップページにアクセス
    cy.visit('/');
  });

  it('初期状態で正しくレンダリングされる', () => {
    // 検索クエリの入力フィールドが存在する
    cy.get('label').contains('検索クエリ').should('be.visible');
    cy.get('input[name="query"]').should('be.visible');

    // 応答言語のセレクトボックスが存在する
    cy.get('label').contains('応答言語').should('be.visible');
    cy.get('button[role="combobox"]').should('be.visible');

    // 検索ボタンが存在する
    cy.get('button').contains('検索').should('be.visible');
  });

  it('検索クエリが空の場合、エラーメッセージが表示される', () => {
    // 検索ボタンをクリック
    cy.get('button').contains('検索').click();

    // エラーメッセージが表示される
    cy.contains('検索クエリを入力してください').should('be.visible');
  });

  it('検索クエリが長すぎる場合、エラーメッセージが表示される', () => {
    // 長すぎる検索クエリを入力
    const longQuery = 'a'.repeat(201);
    cy.get('input[name="query"]').type(longQuery);

    // 検索ボタンをクリック
    cy.get('button').contains('検索').click();

    // エラーメッセージが表示される
    cy.contains('検索クエリは200文字以内で入力してください').should('be.visible');
  });

  it('有効な入力で検索が実行される', () => {
    // 検索クエリを入力
    cy.get('input[name="query"]').type('テストクエリ');

    // 応答言語を選択
    cy.get('button[role="combobox"]').click();
    cy.contains('日本語').click();

    // 検索ボタンをクリック
    cy.get('button').contains('検索').click();

    // 検索結果が表示される（この部分は実際のアプリケーションの実装に応じて調整が必要）
    cy.get('[data-testid="search-results"]').should('be.visible');
  });

  it('ローディング中は検索ボタンが無効化される', () => {
    // ローディング状態をシミュレート（この部分は実際のアプリケーションの実装に応じて調整が必要）
    cy.get('button').contains('検索中').should('be.disabled');
  });

  it('ローディング中は入力フィールドが無効化される', () => {
    // ローディング状態をシミュレート（この部分は実際のアプリケーションの実装に応じて調整が必要）
    cy.get('input[name="query"]').should('be.disabled');
    cy.get('button[role="combobox"]').should('be.disabled');
  });
});
