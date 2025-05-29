export default function TestPage() {
  return (
    <div style={{ backgroundColor: '#3b82f6', minHeight: '100vh', padding: '2rem' }}>
      <div className="min-h-screen bg-blue-500 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">
            Tailwind CSS テスト
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                基本カラー
              </h2>
              <div className="space-y-2">
                <div className="w-full h-4 bg-red-500 rounded"></div>
                <div className="w-full h-4 bg-green-500 rounded"></div>
                <div className="w-full h-4 bg-blue-500 rounded"></div>
              </div>
            </div>
            
            <div className="bg-slate-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-4">
                ダークモード
              </h2>
              <p className="text-slate-300">
                このカードはダークモードスタイルです
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-4">
                グラデーション
              </h2>
              <p className="text-blue-100">
                美しいグラデーション背景
              </p>
            </div>
          </div>
          
          <div className="mt-8 bg-white rounded-2xl p-8 shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              フォントとサイズテスト
            </h2>
            
            <div className="space-y-4">
              <p className="text-xs text-slate-600">Extra Small Text (xs)</p>
              <p className="text-sm text-slate-600">Small Text (sm)</p>
              <p className="text-base text-slate-700">Base Text (base)</p>
              <p className="text-lg text-slate-800">Large Text (lg)</p>
              <p className="text-xl text-slate-900">Extra Large Text (xl)</p>
              <p className="text-2xl font-bold text-blue-600">2XL Bold Blue</p>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-2 gap-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200">
              ホバーエフェクト
            </button>
            
            <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transform hover:scale-105 transition-all duration-200">
              スケールエフェクト
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 