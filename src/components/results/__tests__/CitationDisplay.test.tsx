import { render, screen, fireEvent } from '@testing-library/react';
import { CitationDisplay } from '../CitationDisplay';
import sampleArticle from '../../../tests/fixtures/pubmed-sample.json';

describe('CitationDisplay', () => {
  const mockCitation = {
    ...sampleArticle,
    authors: Array.isArray(sampleArticle.authors)
      ? sampleArticle.authors.join(', ')
      : sampleArticle.authors,
    year: new Date(sampleArticle.publicationDate).getFullYear().toString(),
  };

  it('論文の基本情報を正しく表示', () => {
    render(<CitationDisplay citation={mockCitation} index={1} />);

    // タイトルの表示を確認
    expect(
      screen.getByText(
        '1. COVID-19 vaccine effectiveness among healthcare workers during the Omicron period in the country of Georgia, January - June 2022.'
      )
    ).toBeInTheDocument();

    // 著者情報の表示を確認
    expect(screen.getByText(/Ward Caleb L/)).toBeInTheDocument();

    // ジャーナル名の表示を確認
    expect(screen.getByText('PloS one')).toBeInTheDocument();

    // DOIの表示を確認
    expect(screen.getByText('10.1371/journal.pone.1234567')).toBeInTheDocument();

    // PMIDの表示を確認
    expect(screen.getByText('PMID: 12345678')).toBeInTheDocument();
  });

  it('DOIリンクが正しく機能', () => {
    render(<CitationDisplay citation={mockCitation} index={1} />);

    const doiLink = screen.getByText('10.1371/journal.pone.1234567');
    expect(doiLink).toHaveAttribute('href', 'https://doi.org/10.1371/journal.pone.1234567');
    expect(doiLink).toHaveAttribute('target', '_blank');
    expect(doiLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('PubMedリンクが正しく機能', () => {
    render(<CitationDisplay citation={mockCitation} index={1} />);

    const pubmedLink = screen.getByText('PubMed');
    expect(pubmedLink).toHaveAttribute('href', 'https://pubmed.ncbi.nlm.nih.gov/12345678/');
    expect(pubmedLink).toHaveAttribute('target', '_blank');
    expect(pubmedLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('引用コピーボタンが機能する', async () => {
    const mockClipboard = {
      writeText: jest.fn(),
    };
    Object.assign(navigator, {
      clipboard: mockClipboard,
    });

    render(<CitationDisplay citation={mockCitation} index={1} />);

    const copyButton = screen.getByTitle('引用をコピー');
    fireEvent.click(copyButton);

    expect(mockClipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('Ward Caleb L'));
  });

  it('引用ボタンが機能する', () => {
    const onCite = jest.fn();
    render(<CitationDisplay citation={mockCitation} index={1} onCite={onCite} />);

    const citeButton = screen.getByText('引用');
    fireEvent.click(citeButton);

    expect(onCite).toHaveBeenCalledWith(mockCitation);
  });
});
