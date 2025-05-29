import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '../page'; // インポートパスを修正

// useRouterをモック
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Supabaseクライアントをモック
const mockSignUp = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
    },
    from: (_tableName: string) => ({
      insert: (_data: any[]) => ({
        select: mockSelect, // insert().select() のモック
      }),
      // 他に必要なfromからのメソッドがあればここに追加
    }),
    // 他に必要なメソッドがあればここに追加
  }),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    mockPush.mockClear();
    mockSignUp.mockClear();
    mockInsert.mockClear();
    mockSelect.mockClear();
  });

  it('フォーム送信成功後に検索画面にリダイレクトされること', async () => {
    // signUpが成功し、かつprofile insertも成功したとみなすようにモックを設定
    // 非同期処理の解決を模倣するために短い遅延を入れる
    mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'test-user-id' } }, error: null });
    // profile insert (from().insert().select()) が成功したとみなすモック
    // 非同期処理の解決を模倣するために短い遅延を入れる
    mockSelect.mockResolvedValueOnce({ data: [{ id: 'test-user-id' }], error: null });

    render(<RegisterPage />);

    const user = userEvent.setup();

    // フォームに必要事項を入力
    await act(async () => {
      await user.type(screen.getByLabelText('氏名'), 'テストユーザー');
      await user.selectOptions(screen.getByLabelText('性別'), 'male'); // 性別
      await user.type(screen.getByLabelText('生年月日'), '1990-01-01'); // 生年月日
      await user.type(screen.getByLabelText('出身大学'), 'テスト大学'); // 出身大学
      await user.type(screen.getByLabelText('大学卒業年度'), '2015'); // 卒業年度
      await user.type(screen.getByLabelText('専門診療科'), '内科'); // 専門診療科
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await user.type(screen.getByLabelText('パスワード'), 'password123');
    });

    // フォームを送信
    const submitButton = screen.getByRole('button', { name: '登録' });
    await act(async () => {
      await user.click(submitButton);
    });

    // 非同期処理の解決を少し待つ
    await Promise.resolve();

    // useRouter.pushが呼ばれるまで待機
    // 登録処理が非同期で行われ、その後にリダイレクトするuseEffectが発火するためwaitForで待機します。
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith('/');
      },
      { timeout: 10000 }
    ); // タイムアウトを10秒に設定

    // オプション: Supabaseの各モックが期待通りに呼ばれたか確認することもできます
    expect(mockSignUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }));
    expect(mockSelect).toHaveBeenCalled(); // insert().select() が呼ばれたこと
    // mockInsertが呼ばれたことの検証は、from().insert()のチェーンになっているため直接は難しいですが、
    // select()が呼ばれたことを確認することで間接的に確認できます。
  });
});
