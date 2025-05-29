import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchForm } from '../SearchForm';
import { act } from 'react-dom/test-utils';

describe('SearchForm', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    mockOnSearch.mockClear();
  });

  it('初期表示時に必要な要素が表示される', () => {
    render(<SearchForm onSearch={mockOnSearch} />);

    expect(screen.getByRole('textbox', { name: '検索クエリ' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '応答言語' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '検索' })).toBeInTheDocument();
  });

  it('空の検索キーワードでエラーが表示されること', async () => {
    render(<SearchForm onSearch={mockOnSearch} />);

    const searchButton = screen.getByRole('button', { name: '検索' });
    await act(async () => {
      await userEvent.click(searchButton);
      await userEvent.click(document.body);
    });

    await waitFor(
      () => {
        expect(screen.getByText('検索クエリを入力してください')).toBeInTheDocument();
      },
      { timeout: 30000 }
    );
    expect(mockOnSearch).not.toHaveBeenCalled();
  }, 35000);

  it('検索キーワードが長すぎる場合にエラーが表示されること', async () => {
    render(<SearchForm onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox', { name: '検索クエリ' });
    const longText = 'a'.repeat(201);

    await act(async () => {
      await userEvent.type(input, longText);
    });

    const searchButton = screen.getByRole('button', { name: '検索' });
    await act(async () => {
      await userEvent.click(searchButton);
      await userEvent.click(document.body);
    });

    await waitFor(
      () => {
        expect(screen.getByText('検索クエリは200文字以内で入力してください')).toBeInTheDocument();
      },
      { timeout: 30000 }
    );
    expect(mockOnSearch).not.toHaveBeenCalled();
  }, 35000);

  it('有効な検索キーワードで検索が実行されること', async () => {
    render(<SearchForm onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox', { name: '検索クエリ' });
    const searchButton = screen.getByRole('button', { name: '検索' });

    await act(async () => {
      await userEvent.type(input, 'テスト検索');
    });

    await act(async () => {
      await userEvent.click(searchButton);
      await userEvent.click(document.body);
    });

    await waitFor(
      () => {
        expect(mockOnSearch).toHaveBeenCalledWith({
          query: 'テスト検索',
          responseLanguage: 'ja',
        });
      },
      { timeout: 30000 }
    );
  }, 35000);

  it('ローディング中は入力とボタンが無効化されること', () => {
    render(<SearchForm onSearch={mockOnSearch} isLoading={true} />);

    expect(screen.getByRole('textbox', { name: '検索クエリ' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '検索中...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '検索中...' })).toHaveTextContent('検索中...');
  });
});
