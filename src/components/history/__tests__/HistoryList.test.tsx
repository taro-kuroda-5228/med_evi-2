import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryList } from '../HistoryList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

// useRouterのモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('HistoryList', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    mockPush.mockClear();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  const mockItems = [
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

  it('履歴を正しく表示', () => {
    render(
      <HistoryList
        items={mockItems}
        onSearch={async () => {}}
        onDelete={async () => {}}
        title="検索履歴"
        type="search"
      />
    );
    expect(screen.getByText('COVID-19 vaccine')).toBeTruthy();
    expect(screen.getByText('influenza')).toBeTruthy();
  });
});
