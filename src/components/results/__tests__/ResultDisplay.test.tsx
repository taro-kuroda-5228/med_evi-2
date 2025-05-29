import { render, screen, fireEvent, within } from '@testing-library/react';
import { ResultDisplay } from '../ResultDisplay';
import sampleArticle from '../../../tests/fixtures/pubmed-sample.json';

describe('ResultDisplay', () => {
  // authorsをstringに変換し、yearを追加
  const citation = {
    ...sampleArticle,
    authors: Array.isArray(sampleArticle.authors)
      ? sampleArticle.authors.join(', ')
      : sampleArticle.authors,
    year: new Date(sampleArticle.publicationDate).getFullYear().toString(),
  };
  const mockResults = {
    answer: 'COVID-19ワクチンの効果に関する研究結果です。',
    citations: [citation],
  };

  it('結果がnullの場合、何も表示しない', () => {
    const { container } = render(<ResultDisplay results={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('検索結果を正しく表示', () => {
    render(<ResultDisplay results={mockResults} />);

    expect(screen.getByText('検索結果')).toBeInTheDocument();
    expect(screen.getByText('COVID-19ワクチンの効果に関する研究結果です。')).toBeInTheDocument();
  });

  it('引用文献を正しく表示', () => {
    render(<ResultDisplay results={mockResults} />);

    expect(screen.getByText('引用文献')).toBeInTheDocument();
    const titles = screen.getAllByText(/COVID-19 vaccine effectiveness/);
    expect(titles).toHaveLength(1);
    expect(titles[0]).toHaveTextContent(
      '1. COVID-19 vaccine effectiveness among healthcare workers during the Omicron period in the country of Georgia, January - June 2022.'
    );
  });

  it('引用機能が正しく動作する', () => {
    render(<ResultDisplay results={mockResults} />);

    // 最初の論文を引用
    const citeButtons = screen.getAllByText('引用');
    fireEvent.click(citeButtons[0]);

    // "引用した文献" セクション内だけを対象にする
    const citedSection = screen.getByText('引用した文献').closest('div');
    const citedTitles = within(citedSection!).getAllByText(/COVID-19 vaccine effectiveness/);
    expect(citedTitles).toHaveLength(1);

    // 引用を解除
    fireEvent.click(citeButtons[0]);

    // 引用した文献セクションが消える
    expect(screen.queryByText('引用した文献')).not.toBeInTheDocument();
  });

  it('複数の引用を正しく管理', () => {
    const citation2 = { ...citation, pmid: '87654321' };
    const multipleResults = {
      ...mockResults,
      citations: [citation, citation2],
    };

    render(<ResultDisplay results={multipleResults} />);

    const citeButtons = screen.getAllByText('引用');

    // 両方の論文を引用
    fireEvent.click(citeButtons[0]);
    fireEvent.click(citeButtons[1]);

    // "引用した文献" セクション内だけを対象にする
    const citedSection = screen.getByText('引用した文献').closest('div');
    const citedTitles = within(citedSection!).getAllByText(/COVID-19 vaccine effectiveness/);
    expect(citedTitles).toHaveLength(2);

    // 1つ目の引用を解除
    fireEvent.click(citeButtons[0]);

    // 2つ目の論文のみが残る
    const citedSectionAfter = screen.getByText('引用した文献').closest('div');
    const remainingTitles = within(citedSectionAfter!).getAllByText(
      /COVID-19 vaccine effectiveness/
    );
    expect(remainingTitles).toHaveLength(1);
  });
});
