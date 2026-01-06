import { useEffect, useState } from 'react';

interface Status {
  isRecording: boolean;
  currentMeetingId: string | null;
}

export function App() {
  const [status, setStatus] = useState<Status>({ isRecording: false, currentMeetingId: null });
  const [isOnMeetingPage, setIsOnMeetingPage] = useState(false);

  useEffect(() => {
    // ステータス取得
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      setStatus(response);
    });

    // 現在のタブを確認
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || '';
      setIsOnMeetingPage(
        url.includes('meet.google.com') ||
        url.includes('zoom.us') ||
        url.includes('teams.microsoft.com')
      );
    });
  }, []);

  const openDashboard = () => {
    chrome.tabs.create({ url: import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3000' });
  };

  return (
    <div className="w-72 p-4 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-lg">M</span>
        </div>
        <h1 className="text-lg font-bold">Meeting Transcriber</h1>
      </div>

      {status.isRecording ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-700 font-medium">録音中</span>
          </div>
        </div>
      ) : isOnMeetingPage ? (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
          <span className="text-green-700">会議ページで録音ボタンをクリックしてください</span>
        </div>
      ) : (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
          <span className="text-gray-600">Google Meet/Zoom/Teamsで使用できます</span>
        </div>
      )}

      <button
        onClick={openDashboard}
        className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        ダッシュボードを開く
      </button>
    </div>
  );
}
