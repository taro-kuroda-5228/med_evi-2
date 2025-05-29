import { Citation } from '@/types/citation';
import { useState } from 'react';
import { ExternalLink, Copy } from 'lucide-react';

interface CitationDisplayProps {
  citation: Citation;
  index: number;
  onCite?: (citation: Citation) => void;
}

export function CitationDisplay({ citation, index, onCite }: CitationDisplayProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyCitation = async () => {
    const citationText = `${citation.authors} (${citation.year}). ${citation.title}. ${citation.journal}. PMID: ${citation.pmid}`;
    await navigator.clipboard.writeText(citationText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCite = () => {
    if (onCite) {
      onCite(citation);
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h4 className="text-lg font-medium mb-2 flex-1">
              {index}. {citation.title}
            </h4>
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={handleCopyCitation}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                title={isCopied ? 'コピーしました！' : '引用をコピー'}
              >
                <Copy size={16} />
              </button>
              {onCite && (
                <button
                  onClick={handleCite}
                  className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded border border-blue-600 hover:bg-blue-50"
                >
                  引用
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-2">
            {citation.authors} ({citation.year})
          </p>
          <p className="text-sm text-gray-600 mb-2">
            {citation.journal}
            {citation.doi && (
              <span className="ml-2">
                DOI:{' '}
                <a
                  href={`https://doi.org/${citation.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  {citation.doi}
                </a>
              </span>
            )}
          </p>
        </div>

        <div className="ml-4 flex-shrink-0 flex flex-col items-end">
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            PubMed
            <ExternalLink size={14} className="ml-1" />
          </a>
          <span className="text-gray-600 text-sm mt-1">PMID: {citation.pmid}</span>
        </div>
      </div>
    </div>
  );
}
