import { render, screen, fireEvent } from '@testing-library/react';
import { HistoryPanel } from '../HistoryPanel';
import { useHistory } from '../../../hooks/useHistory';
import { useRouter } from 'next/navigation';

// useHistoryフックをモック
jest.mock('../../../hooks/useHistory');

// useRouterのモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('HistoryPanel', () => {
  const mockPush = jest.fn();
  const mockHistory = [
    {
      id: '1',
      query: 'COVID-19 vaccine',
      timestamp: String(Date.now()),
      title: 'COVID-19 vaccine',
      content: 'test content',
      isFavorited: false,
      type: 'search' as const,
    },
    {
      id: '2',
      query: 'influenza',
      timestamp: String(Date.now() - 1000),
      title: 'influenza',
      content: 'test content 2',
      isFavorited: false,
      type: 'search' as const,
    },
  ];

  beforeEach(() => {
    mockPush.mockClear();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useHistory as jest.Mock).mockReturnValue({
      history: mockHistory,
      deleteHistory: jest.fn(),
      clearHistory: jest.fn(),
    });
  });

  it('履歴を正しく表示', () => {
    render(<HistoryPanel onSearch={() => {}} />);
    expect(screen.getByText('COVID-19 vaccine')).toBeTruthy();
    expect(screen.getByText('influenza')).toBeTruthy();
  });

  it('全削除ボタンが正しく機能', () => {
    const { clearHistory } = useHistory();
    render(<HistoryPanel onSearch={() => {}} />);
    fireEvent.click(screen.getByText('全て削除'));
    expect(clearHistory).toHaveBeenCalled();
  });
});
