export interface Citation {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  url: string;
  doi?: string;
}

export interface CitationDisplayProps {
  citation: Citation;
  index: number;
  onCite?: (citation: Citation) => void;
}
