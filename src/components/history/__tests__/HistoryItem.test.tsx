import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryItem from '../HistoryItem';
import { useRouter } from 'next/navigation';

// useRouterのモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

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

describe('HistoryItem', () => {
  const mockPush = jest.fn();
  const mockOnToggleFavorite = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    mockPush.mockClear();
    mockOnToggleFavorite.mockClear();
    mockOnDelete.mockClear();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (window.open as jest.Mock).mockClear();
    (window.confirm as jest.Mock).mockClear();
  });

  const mockSearchItem = {
    id: '1',
    title: 'テスト検索',
    timestamp: '2024-01-01 10:00:00',
    content: 'テスト回答の内容です。',
    isFavorited: false,
    type: 'search' as const,
    query: 'テスト検索',
    onToggleFavorite: mockOnToggleFavorite,
    onDelete: mockOnDelete,
  };

  const mockPaperItem = {
    id: '2',
    title: 'Test Paper Title',
    timestamp: '2024-01-02 11:00:00',
    content: 'Test paper abstract content.',
    isFavorited: true,
    type: 'paper' as const,
    authors: 'Smith J, et al.',
    journal: 'Test Journal',
    year: '2024',
    url: 'https://pubmed.ncbi.nlm.nih.gov/test',
    onToggleFavorite: mockOnToggleFavorite,
    onDelete: mockOnDelete,
  };

  it('検索履歴アイテムの表示', () => {
    render(<HistoryItem {...mockSearchItem} />);

    expect(screen.getByText('テスト検索')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01 10:00:00')).toBeInTheDocument();
    expect(screen.getByText('テスト回答の内容です。')).toBeInTheDocument();
    expect(screen.getByText('クリックして検索結果を再表示')).toBeInTheDocument();
  });

  it('論文履歴アイテムの表示', () => {
    render(<HistoryItem {...mockPaperItem} />);

    expect(screen.getByText('Test Paper Title')).toBeInTheDocument();
    expect(screen.getByText('著者: Smith J, et al.')).toBeInTheDocument();
    expect(screen.getByText('発表年: 2024 | ジャーナル: Test Journal')).toBeInTheDocument();
    expect(screen.getByText('クリックして論文を表示')).toBeInTheDocument();
  });

  it('検索履歴アイテムクリック時に結果画面に遷移', () => {
    render(<HistoryItem {...mockSearchItem} />);

    const item = screen.getByText('テスト検索').closest('div');
    fireEvent.click(item!);

    expect(mockPush).toHaveBeenCalledWith(
      '/results?q=%E3%83%86%E3%82%B9%E3%83%88%E6%A4%9C%E7%B4%A2&lang=ja&from=history&historyId=1'
    );
  });

  it('論文アイテムクリック時に外部リンクを開く', () => {
    render(<HistoryItem {...mockPaperItem} />);

    const item = screen.getByText('Test Paper Title').closest('div');
    fireEvent.click(item!);

    expect(window.open).toHaveBeenCalledWith(
      'https://pubmed.ncbi.nlm.nih.gov/test',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('お気に入りボタンクリック時にコールバックが呼ばれる', async () => {
    mockOnToggleFavorite.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<HistoryItem {...mockSearchItem} />);

    const favoriteButton = screen.getByTitle('お気に入りに追加');
    await user.click(favoriteButton);

    await waitFor(() => {
      expect(mockOnToggleFavorite).toHaveBeenCalledWith('1', true);
    });
  });

  it('お気に入り状態がtrueの場合のボタン表示', () => {
    render(<HistoryItem {...mockPaperItem} />);

    const favoriteButton = screen.getByTitle('お気に入りから削除');
    expect(favoriteButton).toBeInTheDocument();
  });

  it('削除ボタンクリック時に確認ダイアログが表示される', async () => {
    mockOnDelete.mockResolvedValue(undefined);
    (window.confirm as jest.Mock).mockReturnValue(true);

    const user = userEvent.setup();
    render(<HistoryItem {...mockSearchItem} />);

    const deleteButton = screen.getByTitle('削除');
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('この履歴を削除しますか？');

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });
  });

  it('削除確認ダイアログでキャンセルした場合は削除されない', async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);

    const user = userEvent.setup();
    render(<HistoryItem {...mockSearchItem} />);

    const deleteButton = screen.getByTitle('削除');
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('この履歴を削除しますか？');
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('お気に入り更新エラー時に状態が元に戻る', async () => {
    mockOnToggleFavorite.mockRejectedValue(new Error('API Error'));

    const user = userEvent.setup();
    render(<HistoryItem {...mockSearchItem} />);

    const favoriteButton = screen.getByTitle('お気に入りに追加');
    await user.click(favoriteButton);

    // エラー後も元の状態（お気に入りでない）が保持される
    await waitFor(() => {
      expect(screen.getByTitle('お気に入りに追加')).toBeInTheDocument();
    });
  });

  it('削除エラー時にコンソールエラーが出力される', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockOnDelete.mockRejectedValue(new Error('Delete Error'));
    (window.confirm as jest.Mock).mockReturnValue(true);

    const user = userEvent.setup();
    render(<HistoryItem {...mockSearchItem} />);

    const deleteButton = screen.getByTitle('削除');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('履歴の削除に失敗しました:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('お気に入りボタンとアイテムクリックが干渉しない', async () => {
    mockOnToggleFavorite.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<HistoryItem {...mockSearchItem} />);

    // お気に入りボタンをクリック
    const favoriteButton = screen.getByTitle('お気に入りに追加');
    await user.click(favoriteButton);

    // お気に入りAPIが呼ばれるがナビゲーションは発生しない
    await waitFor(() => {
      expect(mockOnToggleFavorite).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('削除ボタンとアイテムクリックが干渉しない', async () => {
    mockOnDelete.mockResolvedValue(undefined);
    (window.confirm as jest.Mock).mockReturnValue(true);

    const user = userEvent.setup();
    render(<HistoryItem {...mockSearchItem} />);

    // 削除ボタンをクリック
    const deleteButton = screen.getByTitle('削除');
    await user.click(deleteButton);

    // 削除APIが呼ばれるがナビゲーションは発生しない
    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
