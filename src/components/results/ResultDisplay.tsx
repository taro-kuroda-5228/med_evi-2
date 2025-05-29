import { CitationDisplay } from './CitationDisplay';
import { Citation } from '@/types/citation';
import { useState } from 'react';

interface SearchResult {
  answer: string;
  citations: Citation[];
}

interface ResultDisplayProps {
  results: SearchResult | null;
}

export function ResultDisplay({ results }: ResultDisplayProps) {
  const [citedReferences, setCitedReferences] = useState<Citation[]>([]);

  if (!results) {
    return null;
  }

  const handleCite = (citation: Citation) => {
    setCitedReferences(prev => {
      const exists = prev.some(ref => ref.pmid === citation.pmid);
      if (exists) {
        return prev.filter(ref => ref.pmid !== citation.pmid);
      }
      return [...prev, citation];
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">検索結果</h2>
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap">{results.answer}</p>
        </div>
      </div>

      {citedReferences.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">引用した文献</h3>
          <div className="space-y-4">
            {citedReferences.map((citation, index) => (
              <CitationDisplay
                key={citation.pmid}
                citation={citation}
                index={index + 1}
                onCite={handleCite}
              />
            ))}
          </div>
        </div>
      )}

      {results.citations && results.citations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">引用文献</h3>
          <div className="space-y-4">
            {results.citations.map((citation, index) => (
              <CitationDisplay
                key={citation.pmid}
                citation={citation}
                index={index + 1}
                onCite={handleCite}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
