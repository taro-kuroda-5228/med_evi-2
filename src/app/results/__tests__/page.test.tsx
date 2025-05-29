import { render, screen, waitFor } from '@testing-library/react';
import ResultsPage from '../page';
import { useSearchParams } from 'next/navigation';

// useSearchParamsのモック
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

// fetchのモック
global.fetch = jest.fn();

// SearchResultsコンポーネントのモック
jest.mock('@/components/SearchResults', () => {
  return function MockSearchResults(props: any) {
    return (
      <div data-testid="search-results">
        <h1>{props.question}</h1>
        <div>{props.answer}</div>
        {props.references &&
          props.references.map((ref: any) => (
            <div key={ref.id} data-testid="reference">
              <div>{ref.title}</div>
              <div>{ref.authors}</div>
            </div>
          ))}
      </div>
    );
  };
});

// LoadingStateコンポーネントのモック
jest.mock('@/components/results/LoadingState', () => {
  return {
    LoadingState: function MockLoadingState({ query }: { query: string }) {
      return (
        <div data-testid="loading-state">
          <div>検索結果を取得中...</div>
          <div>検索クエリ: {query}</div>
        </div>
      );
    },
  };
});

describe('ResultsPage', () => {
  const mockSearchParams = {
    get: jest.fn(),
  };

  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (global.fetch as jest.Mock).mockReset();
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'q') return null;
      if (key === 'lang') return 'ja';
      return null;
    });
  });

  it('検索パラメータがない場合、エラーメッセージを表示', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'q') return null;
      if (key === 'lang') return 'ja';
      return null;
    });

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('検索クエリが指定されていません')).toBeInTheDocument();
    });
  });

  it('検索クエリがある場合、ローディング状態を表示', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'q') return 'テスト検索';
      if (key === 'lang') return 'ja';
      return null;
    });

    // fetchを永続的にpendingにする
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<ResultsPage />);

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByText('検索結果を取得中...')).toBeInTheDocument();
    expect(screen.getByText('検索クエリ: テスト検索')).toBeInTheDocument();
  });

  it('検索結果を取得して表示', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'q') return 'テスト検索';
      if (key === 'lang') return 'ja';
      return null;
    });

    const mockResults = {
      question: 'テスト検索',
      expandedQuestion: 'Test Search',
      answer: 'テスト回答',
      references: [
        {
          id: 'ref-1',
          title: 'テスト論文',
          authors: '著者1, 著者2',
          citation: 'テスト引用',
          url: 'https://example.com/1',
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResults,
    });

    render(<ResultsPage />);

    // 検索結果が表示されるまで待機
    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
    });

    // 結果内容の確認
    expect(screen.getByText('テスト検索')).toBeInTheDocument();
    expect(screen.getByText('テスト回答')).toBeInTheDocument();

    // 参考文献が表示されることを確認
    expect(screen.getByText('テスト論文')).toBeInTheDocument();
    expect(screen.getByText('著者1, 著者2')).toBeInTheDocument();
  });

  it('検索結果の取得に失敗した場合、エラーメッセージを表示', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'q') return 'テスト検索';
      if (key === 'lang') return 'ja';
      return null;
    });

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('APIエラー'));

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('APIエラー')).toBeInTheDocument();
    });
  });

  it('異なる言語で検索結果を取得', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'q') return 'テスト検索';
      if (key === 'lang') return 'en';
      return null;
    });

    const mockResults = {
      question: 'テスト検索',
      expandedQuestion: 'Test Search',
      answer: 'Test Answer',
      references: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResults,
    });

    render(<ResultsPage />);

    // 英語の検索結果が表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('Test Answer')).toBeInTheDocument();
    });

    // APIが正しい言語パラメータで呼ばれたことを確認
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('lang=en'));
  });

  it('useSearchParamsがnullの場合のエラーハンドリング', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(null);

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('検索パラメータが取得できません')).toBeInTheDocument();
    });
  });

  it('APIレスポンスが404の場合のエラーハンドリング', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'q') return 'テスト検索';
      if (key === 'lang') return 'ja';
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('検索結果の取得に失敗しました')).toBeInTheDocument();
    });
  });
});
