/**
 * Side Panel App
 * リアルタイムで文字起こし結果を表示するサイドパネル
 */

export function App() {
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">M</span>
          </div>
          <h1 className="text-lg font-bold">Meeting Transcriber</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">文字起こし</h2>
          <p className="text-sm text-gray-500">
            録音を開始すると、ここにリアルタイムで文字起こし結果が表示されます。
          </p>
        </div>

        <div className="bg-white rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">要約</h2>
          <p className="text-sm text-gray-500">
            会議終了後、AI要約が生成されます。
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <button className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          録音を開始
        </button>
      </div>
    </div>
  );
}
