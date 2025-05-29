interface LoadingStateProps {
  query?: string;
}

export function LoadingState({ query }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
          role="status"
        />
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
          <div className="w-6 h-6 bg-white rounded-full" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-gray-600 font-medium">検索結果を取得中...</p>
        {query && <p className="text-gray-500 text-sm mt-1">検索クエリ: {query}</p>}
      </div>
    </div>
  );
}
