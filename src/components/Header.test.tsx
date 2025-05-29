import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from './Header';

// JestやViteのテスト環境でReact Testing Libraryが使えることを前提としています。
// 必要に応じてjest-domのセットアップを行ってください。

describe('Header', () => {
  test('renders the site title', () => {
    render(<Header />);
    // サイトタイトル 'メドエビデンス' が表示されているかを確認
    const siteTitle = screen.getByText('メドエビデンス');
    expect(siteTitle).toBeTruthy();
  });

  // ナビゲーションリンクのテスト（現在の実装に合わせて調整してください）
  test('renders navigation links', () => {
    render(<Header />);
    // 複数のナビゲーションリンクが存在するため、getAllByRoleを使用
    const homeLinks = screen.getAllByRole('link', { name: /ホーム/i });
    const historyLinks = screen.getAllByRole('link', { name: /履歴/i });

    // 少なくとも1つのホームリンクと履歴リンクが存在することを確認
    expect(homeLinks.length > 0).toBe(true);
    expect(historyLinks.length > 0).toBe(true);

    // 最初のリンクが存在することを確認
    expect(homeLinks[0]).toBeTruthy();
    expect(historyLinks[0]).toBeTruthy();
  });

  // 必要に応じて他のテストケースを追加してください（例: レスポンシブメニューの表示/非表示など）
});
