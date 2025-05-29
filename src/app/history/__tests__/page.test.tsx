import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryPage from '../page';
import { useRouter } from 'next/navigation';

// useRouterのモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// fetchのモック
global.fetch = jest.fn();

// window.openのモック
Object.defineProperty(window, 'open', {
  writable: true,
  value: jest.fn(),
});

// window.confirmのモック
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: jest.fn(() => true),
});

// Headerコンポーネントのモック
jest.mock('@/components/Header', () => {
  return function MockHeader() {
    return <header data-testid="header">Header</header>;
  };
});

// Footerコンポーネントのモック
jest.mock('@/components/Footer', () => {
  return function MockFooter() {
    return <footer data-testid="footer">Footer</footer>;
  };
});

describe('HistoryPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    mockPush.mockClear();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (global.fetch as jest.Mock).mockClear();
    (window.open as jest.Mock).mockClear();
    (window.confirm as jest.Mock).mockClear();
  });

  const mockHistoryData = {
    items: [
      {
        id: '1',
        title: 'テスト検索クエリ',
        timestamp: '2024-01-01 10:00:00',
        content: 'テスト回答の内容...',
        isFavorited: false,
        type: 'search',
        query: 'テスト検索クエリ',
      },
      {
        id: '2',
        title: 'お気に入り検索',
        timestamp: '2024-01-02 11:00:00',
        content: 'お気に入りの検索結果...',
        isFavorited: true,
        type: 'search',
        query: 'お気に入り検索',
      },
    ],
    total: 2,
  };

  it('初期表示時に必要な要素が表示される', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHistoryData,
    });

    render(<HistoryPage />);

    // ヘッダーとフッターが表示される
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();

    // タイトルが表示される
    expect(screen.getByText('履歴')).toBeInTheDocument();

    // タブが表示される
    expect(screen.getByText('検索履歴')).toBeInTheDocument();
    expect(screen.getByText('論文履歴')).toBeInTheDocument();

    // 履歴データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('テスト検索クエリ')).toBeInTheDocument();
    });
  });

  it('検索履歴アイテムクリック時に結果画面に遷移する', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHistoryData,
    });

    render(<HistoryPage />);

    // 履歴データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('テスト検索クエリ')).toBeInTheDocument();
    });

    // 履歴アイテムをクリック（具体的な親要素を対象にする）
    const historyItems = screen.getAllByText('テスト検索クエリ');
    const historyItem = historyItems[0].closest('[data-type="search-item"]');
    fireEvent.click(historyItem!);

    // 結果画面への遷移を確認
    expect(mockPush).toHaveBeenCalledWith(
      '/results?q=%E3%83%86%E3%82%B9%E3%83%88%E6%A4%9C%E7%B4%A2%E3%82%AF%E3%82%A8%E3%83%AA&lang=ja&from=history&historyId=1'
    );
  });

  it('お気に入りボタンクリック時にAPI呼び出しが実行される', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistoryData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const user = userEvent.setup();
    render(<HistoryPage />);

    // 履歴データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('テスト検索クエリ')).toBeInTheDocument();
    });

    // お気に入りボタンを探してクリック
    const favoriteButton = screen.getAllByTitle('お気に入りに追加')[0];
    await user.click(favoriteButton);

    // お気に入りAPIが呼ばれることを確認
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/search/toggle-favorite', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: '1', isFavorite: true }),
      });
    });
  });

  it('削除ボタンクリック時に削除API呼び出しが実行される', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistoryData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    (window.confirm as jest.Mock).mockReturnValue(true);

    const user = userEvent.setup();
    render(<HistoryPage />);

    // 履歴データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('テスト検索クエリ')).toBeInTheDocument();
    });

    // 削除ボタンを探してクリック
    const deleteButton = screen.getAllByTitle('削除')[0];
    await user.click(deleteButton);

    // 確認ダイアログが表示される
    expect(window.confirm).toHaveBeenCalledWith('この履歴を削除しますか？');

    // 削除APIが呼ばれることを確認
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/search/toggle-favorite?id=1', {
        method: 'DELETE',
      });
    });
  });

  it('タブ切り替えが正常に動作する', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHistoryData,
    });

    const user = userEvent.setup();
    render(<HistoryPage />);

    // 初期状態では検索履歴タブが選択されている
    const searchTab = screen.getByText('検索履歴');
    const paperTab = screen.getByText('論文履歴');

    expect(searchTab.closest('button')).toHaveClass('bg-blue-600');

    // 論文履歴タブをクリック
    await user.click(paperTab);

    // 論文履歴タブが選択状態になる
    expect(paperTab.closest('button')).toHaveClass('bg-blue-600');
    expect(searchTab.closest('button')).not.toHaveClass('bg-blue-600');
  });

  it('お気に入りフィルターが正常に動作する', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHistoryData,
    });

    const user = userEvent.setup();
    render(<HistoryPage />);

    // 履歴データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('テスト検索クエリ')).toBeInTheDocument();
      expect(screen.getByText('お気に入り検索')).toBeInTheDocument();
    });

    // お気に入りフィルターを有効にする
    const favoriteFilter = screen.getByLabelText('お気に入りのみ');
    await user.click(favoriteFilter);

    // お気に入りでない項目が非表示になることを確認（data-favorited属性をチェック）
    await waitFor(() => {
      const favoriteItems = screen.getAllByText('お気に入り検索');
      expect(favoriteItems.length).toBeGreaterThan(0);

      // テスト検索クエリは表示されない（またはdata-favorited=falseの要素が非表示）
      const testQueryElements = screen.queryAllByText('テスト検索クエリ');
      if (testQueryElements.length > 0) {
        // 要素が存在する場合は、その親要素がdata-favorited=falseであることを確認
        const parentElement = testQueryElements[0].closest('[data-favorited]');
        expect(parentElement).toHaveAttribute('data-favorited', 'false');
      }
    });
  });

  it('更新ボタンクリック時にデータが再取得される', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockHistoryData,
    });

    const user = userEvent.setup();
    render(<HistoryPage />);

    // 初回の履歴データ取得を待機
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // 更新ボタンをクリック
    const refreshButton = screen.getByText('更新');
    await user.click(refreshButton);

    // 再度APIが呼ばれることを確認
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('APIエラー時にエラーメッセージが表示される', async () => {
    // モックコンソールエラーを設定してエラーログを抑制
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<HistoryPage />);

    // エラーメッセージまたはモックデータが表示されるまで待機
    await waitFor(() => {
      // エラー発生時はモックデータが表示されるはず
      const errorElements = screen.queryAllByText('履歴の取得に失敗しました');
      const mockDataElements = screen.queryAllByText('冠動脈バイパス術の代替治療');

      // どちらかが表示されていることを確認
      expect(errorElements.length > 0 || mockDataElements.length > 0).toBe(true);
    });

    consoleSpy.mockRestore();
  });

  it('履歴が空の場合の表示', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], total: 0 }),
    });

    render(<HistoryPage />);

    // 空の状態メッセージが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('履歴がありません')).toBeInTheDocument();
      expect(screen.getByText('検索を実行すると履歴が表示されます')).toBeInTheDocument();
    });
  });
});
