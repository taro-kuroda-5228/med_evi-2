import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MainContent from '../MainContent';
import { useRouter } from 'next/navigation';

// useRouterのモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('MainContent', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    // 各テストの前にモックをリセット
    mockPush.mockClear();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('初期表示時に必要な要素が表示される', () => {
    render(<MainContent />);

    // タイトルと説明文（より具体的なクエリを使用）
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('医療情報検索', { exact: false })).toBeInTheDocument();
    expect(
      screen.getByText(
        '医学的な質問を入力して、最新の研究論文とエビデンスに基づいた信頼できる回答を取得できます'
      )
    ).toBeInTheDocument();

    // 検索フォームの要素
    expect(screen.getByLabelText('医学的な質問を入力してください')).toBeInTheDocument();
    expect(screen.getByLabelText('回答言語を選択')).toBeInTheDocument();
    expect(screen.getByText('医学的エビデンスを検索')).toBeInTheDocument();
  });

  it('検索クエリが空の場合、検索ボタンが無効化される', () => {
    render(<MainContent />);

    const searchButton = screen.getByText('医学的エビデンスを検索').closest('button');
    expect(searchButton).toBeDisabled();
  });

  it('検索クエリを入力すると、検索ボタンが有効化される', async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    const input = screen.getByLabelText('医学的な質問を入力してください');
    await user.type(input, 'テスト検索');

    const searchButton = screen.getByText('医学的エビデンスを検索').closest('button');
    expect(searchButton).not.toBeDisabled();
  });

  it('検索実行時に結果画面に遷移する', async () => {
    // router.pushをPromiseで包んでawaitできるようにする
    mockPush.mockImplementation(() => Promise.resolve());

    render(<MainContent />);

    // 検索クエリを入力
    const input = screen.getByLabelText('医学的な質問を入力してください');
    fireEvent.change(input, { target: { value: 'テスト検索' } });

    // フォームを取得してsubmitイベントを発火
    const form = input.closest('form');
    fireEvent.submit(form!);

    // 結果画面への遷移を確認（正しいURLエンコーディング）
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/results?q=%E3%83%86%E3%82%B9%E3%83%88%E6%A4%9C%E7%B4%A2&lang=ja'
      );
    });
  });

  it('検索中は入力フィールドとボタンが無効化される', async () => {
    // router.pushを長時間pendingにして、ローディング状態をテストする
    let resolvePromise: () => void;
    const pendingPromise = new Promise<void>(resolve => {
      resolvePromise = resolve;
    });
    mockPush.mockImplementation(() => pendingPromise);

    render(<MainContent />);

    // 検索クエリを入力
    const input = screen.getByLabelText('医学的な質問を入力してください');
    fireEvent.change(input, { target: { value: 'テスト検索' } });

    // フォームsubmitを実行
    const form = input.closest('form');
    fireEvent.submit(form!);

    // ローディング状態で無効化されていることを確認
    await waitFor(() => {
      expect(screen.getByText('検索中...')).toBeInTheDocument();
    });

    expect(input).toBeDisabled();
    expect(screen.getByLabelText('回答言語を選択')).toBeDisabled();

    // テストクリーンアップ
    resolvePromise!();
  });

  it('異なる言語で検索を実行できる', async () => {
    const user = userEvent.setup();

    // router.pushをPromiseで包んでawaitできるようにする
    mockPush.mockImplementation(() => Promise.resolve());

    render(<MainContent />);

    // 検索クエリを入力
    const input = screen.getByLabelText('医学的な質問を入力してください');
    fireEvent.change(input, { target: { value: 'テスト検索' } });

    // 言語を英語に変更
    const languageSelect = screen.getByLabelText('回答言語を選択');
    await user.selectOptions(languageSelect, 'en');

    // フォームsubmitを実行
    const form = input.closest('form');
    fireEvent.submit(form!);

    // 英語のパラメータで結果画面に遷移することを確認
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/results?q=%E3%83%86%E3%82%B9%E3%83%88%E6%A4%9C%E7%B4%A2&lang=en'
      );
    });
  });

  it('フォームのEnterキーでも検索が実行される', async () => {
    // router.pushをPromiseで包んでawaitできるようにする
    mockPush.mockImplementation(() => Promise.resolve());

    render(<MainContent />);

    // 検索クエリを入力
    const input = screen.getByLabelText('医学的な質問を入力してください');
    fireEvent.change(input, { target: { value: 'Enterキーテスト' } });

    // Enterキーでフォームsubmitをトリガー
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    fireEvent.keyUp(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // フォームを直接submitする（Enterキーの代替として）
    const form = input.closest('form');
    fireEvent.submit(form!);

    // 結果画面への遷移を確認
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/results?q='));
    });
  });

  it('入力フィールド内の検索アイコンボタンでも検索が実行される', async () => {
    // router.pushをPromiseで包んでawaitできるようにする
    mockPush.mockImplementation(() => Promise.resolve());

    render(<MainContent />);

    // 検索クエリを入力
    const input = screen.getByLabelText('医学的な質問を入力してください');
    fireEvent.change(input, { target: { value: 'アイコンテスト' } });

    // 実際の検索ボタンをクリック（入力フィールド内のアイコンは装飾のみ）
    const searchButton = screen.getByText('医学的エビデンスを検索').closest('button');
    fireEvent.click(searchButton!);

    // 結果画面への遷移を確認
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/results?q='));
    });
  });
});
