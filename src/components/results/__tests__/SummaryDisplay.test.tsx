import React from 'react';
import { render, screen } from '@testing-library/react';
import { SummaryDisplay } from '../SummaryDisplay';

const mockPapers = [
  {
    title: 'COVID-19ワクチンの有効性に関する研究',
    authors: ['山田太郎', '鈴木花子'],
    journal: '日本医学雑誌',
    year: '2023',
    abstract:
      '本研究では、COVID-19ワクチンの有効性について調査を行った。結果として、高い予防効果が確認された。',
    pmid: '12345678',
    doi: '10.1234/example',
    keywords: ['COVID-19', 'ワクチン', '有効性'],
  },
  {
    title: 'COVID-19ワクチンの副作用に関する研究',
    authors: ['佐藤次郎', '田中三郎'],
    journal: '国際医学雑誌',
    year: '2023',
    abstract:
      '本研究では、COVID-19ワクチンの副作用について調査を行った。重篤な副作用はまれであることが確認された。',
    pmid: '87654321',
    doi: '10.5678/example',
    keywords: ['COVID-19', 'ワクチン', '副作用'],
  },
];

const mockSummary = `
1. 背景・目的
COVID-19ワクチンの有効性と安全性について調査した2つの研究を統合した。

2. 主要な発見
- ワクチンは高い予防効果を示した（山田ら、2023）
- 重篤な副作用はまれであることが確認された（佐藤ら、2023）

3. 結論・提言
COVID-19ワクチンは高い有効性と安全性を有することが示された。
`;

describe('SummaryDisplay', () => {
  it('ローディング状態が正しく表示されること', () => {
    render(<SummaryDisplay papers={mockPapers} summary={null} isLoading={true} error={null} />);

    expect(screen.getByText('要約を生成中...')).toBeInTheDocument();
  });

  it('エラー状態が正しく表示されること', () => {
    const errorMessage = '要約の生成に失敗しました';
    render(
      <SummaryDisplay papers={mockPapers} summary={null} isLoading={false} error={errorMessage} />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('要約が正しく表示されること', () => {
    render(
      <SummaryDisplay papers={mockPapers} summary={mockSummary} isLoading={false} error={null} />
    );

    expect(screen.getByText('エビデンス要約')).toBeInTheDocument();
    expect(screen.getByText('1. 背景・目的')).toBeInTheDocument();
    expect(screen.getByText('2. 主要な発見')).toBeInTheDocument();
    expect(screen.getByText('3. 結論・提言')).toBeInTheDocument();
    expect(screen.getByText(/ワクチンは高い予防効果を示した（山田ら、2023）/)).toBeInTheDocument();
  });

  it('引用文献が正しく表示されること', () => {
    render(
      <SummaryDisplay papers={mockPapers} summary={mockSummary} isLoading={false} error={null} />
    );

    expect(screen.getByText('引用文献')).toBeInTheDocument();
    expect(screen.getByText('COVID-19ワクチンの有効性に関する研究')).toBeInTheDocument();
    expect(screen.getByText('COVID-19ワクチンの副作用に関する研究')).toBeInTheDocument();
    expect(screen.getByText('山田太郎, 鈴木花子')).toBeInTheDocument();
    expect(screen.getByText('佐藤次郎, 田中三郎')).toBeInTheDocument();
  });
});
