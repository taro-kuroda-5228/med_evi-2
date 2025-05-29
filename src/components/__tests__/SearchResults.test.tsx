import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchResults from '../SearchResults';

// モックデータ
const mockArticles = [
  {
    id: '12345678',
    title: 'テスト論文タイトル',
    abstract: 'これはテスト論文のアブストラクトです。',
    authors: '著者1, 著者2',
    journal: 'テストジャーナル',
    publicationDate: '2024-01-01',
    doi: '10.1234/test.2024',
    keywords: ['キーワード1', 'キーワード2'],
    url: 'https://example.com/12345678',
    citation: '著者1, 著者2 (2024). テスト論文タイトル. テストジャーナル. PMID: 12345678',
  },
  {
    id: '87654321',
    title: '別のテスト論文',
    abstract: '別のテスト論文のアブストラクトです。',
    authors: '著者3',
    journal: '別のジャーナル',
    publicationDate: '2024-02-01',
    keywords: ['キーワード3'],
    url: 'https://example.com/87654321',
    citation: '著者3 (2024). 別のテスト論文. 別のジャーナル. PMID: 87654321',
  },
];

// クリップボードAPIのモック
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe('SearchResults', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('検索結果が空の場合、メッセージを表示', () => {
    render(<SearchResults references={[]} question="" expandedQuestion="" answer="" />);
    expect(screen.getByText('検索結果が見つかりませんでした。')).toBeInTheDocument();
  });

  it('検索結果が表示される', () => {
    render(<SearchResults references={mockArticles} question="" expandedQuestion="" answer="" />);

    // タイトル
    expect(screen.getByText('テスト論文タイトル')).toBeInTheDocument();
    expect(screen.getByText('別のテスト論文')).toBeInTheDocument();

    // 著者
    expect(screen.getByText('著者1, 著者2')).toBeInTheDocument();
    expect(screen.getByText('著者3')).toBeInTheDocument();

    // アブストラクト
    expect(screen.getByText('これはテスト論文のアブストラクトです。')).toBeInTheDocument();
    expect(screen.getByText('別のテスト論文のアブストラクトです。')).toBeInTheDocument();

    // キーワード
    expect(screen.getByText('キーワード1')).toBeInTheDocument();
    expect(screen.getByText('キーワード2')).toBeInTheDocument();
    expect(screen.getByText('キーワード3')).toBeInTheDocument();
  });

  it('引用コピー機能が動作する', async () => {
    render(<SearchResults references={mockArticles} question="" expandedQuestion="" answer="" />);

    // 引用コピーボタンをクリック
    const copyButton = screen.getAllByText('引用をコピー')[0];
    fireEvent.click(copyButton);

    // クリップボードに正しい形式でコピーされることを確認
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '著者1, 著者2 (2024). テスト論文タイトル. テストジャーナル. PMID: 12345678'
      );
    });

    // コピー成功メッセージが表示されることを確認
    expect(await screen.findByText('コピーしました')).toBeInTheDocument();

    // 2秒後に元のテキストに戻ることを確認
    jest.advanceTimersByTime(2000);
    expect(await screen.findByText('引用をコピー')).toBeInTheDocument();
  });

  it('DOIリンクが正しく表示される', () => {
    render(<SearchResults references={mockArticles} question="" expandedQuestion="" answer="" />);

    // DOIリンクの存在を確認
    const doiLink = screen.getByText('DOI: 10.1234/test.2024');
    expect(doiLink).toBeInTheDocument();
    expect(doiLink).toHaveAttribute('href', 'https://doi.org/10.1234/test.2024');

    // DOIがない論文にはDOIリンクが表示されないことを確認
    expect(screen.queryByText('DOI: 87654321')).not.toBeInTheDocument();
  });

  it('論文のリンクが正しく設定される', () => {
    render(<SearchResults references={mockArticles} question="" expandedQuestion="" answer="" />);

    const titleLinks = screen.getAllByRole('link');
    expect(titleLinks[0]).toHaveAttribute('href', 'https://example.com/12345678');
    expect(titleLinks[0]).toHaveAttribute('target', '_blank');
    expect(titleLinks[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
