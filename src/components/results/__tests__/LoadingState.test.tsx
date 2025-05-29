import { render, screen } from '@testing-library/react';
import { LoadingState } from '../LoadingState';

describe('LoadingState', () => {
  it('クエリなしでローディング状態を表示', () => {
    render(<LoadingState />);

    expect(screen.getByText('検索結果を取得中...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('クエリありでローディング状態を表示', () => {
    const query = 'COVID-19 vaccine';
    render(<LoadingState query={query} />);

    expect(screen.getByText('検索結果を取得中...')).toBeInTheDocument();
    expect(screen.getByText(`検索クエリ: ${query}`)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('スピナーが表示される', () => {
    render(<LoadingState />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('animate-spin');
  });
});
