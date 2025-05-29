import React from 'react';
import { Paper } from '../../lib/response-parser';

interface SummaryDisplayProps {
  papers: Paper[];
  summary: string | null;
  isLoading: boolean;
  error: string | null;
}

export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({
  papers,
  summary,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse delay-100"></div>
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse delay-200"></div>
          <span className="text-gray-600">要約を生成中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center text-red-600">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">エビデンス要約</h2>
        <div className="prose max-w-none">
          {summary.split('\n').map((line, index) => {
            if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')) {
              return (
                <h3 key={index} className="text-lg font-medium text-gray-900 mt-4 mb-2">
                  {line}
                </h3>
              );
            } else if (line.startsWith('-')) {
              return (
                <p key={index} className="text-gray-700 ml-4">
                  {line}
                </p>
              );
            } else {
              return (
                <p key={index} className="text-gray-700">
                  {line}
                </p>
              );
            }
          })}
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">引用文献</h3>
        <div className="space-y-4">
          {papers.map((paper, index) => (
            <div key={index} className="text-sm text-gray-600">
              <p className="font-medium text-gray-900">{paper.title}</p>
              <p>{paper.authors.join(', ')}</p>
              <p>
                {paper.journal}, {paper.year}
              </p>
              {paper.doi && (
                <p>
                  DOI:{' '}
                  <a
                    href={`https://doi.org/${paper.doi}`}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {paper.doi}
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
