import { useEffect, useState } from 'react';
import type { RecordingState, ExtensionMessage } from '@meeting-transcriber/shared';

export function App() {
  const [status, setStatus] = useState<RecordingState>({
    isRecording: false,
    currentMeetingId: null,
    currentTabId: null,
    startTime: null,
  });
  const [isOnMeetingPage, setIsOnMeetingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // エラーハンドリング付きでステータス取得
    const fetchStatus = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_STATUS',
        } as ExtensionMessage);
        if (response && isMounted) {
          setStatus(response);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('Failed to get status:', err);
        }
        if (isMounted) {
          setError('ステータスの取得に失敗しました');
        }
      }
    };

    // 認証状態を確認
    chrome.storage.local.get('authToken', (result) => {
      if (isMounted) {
        setIsAuthenticated(!!result.authToken);
      }
    });

    // 現在のタブを確認（エラーハンドリング付き）
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        if (import.meta.env.DEV) {
          console.error('Failed to query tabs:', chrome.runtime.lastError);
        }
        if (isMounted) {
          setError('タブ情報の取得に失敗しました');
        }
        return;
      }
      const url = tabs[0]?.url || '';
      if (isMounted) {
        setIsOnMeetingPage(
          url.includes('meet.google.com') ||
            url.includes('zoom.us') ||
            url.includes('teams.microsoft.com') ||
            url.includes('teams.live.com')
        );
      }
    });

    fetchStatus();

    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  }, []);

  const openDashboard = () => {
    try {
      chrome.tabs.create({ url: import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3000' });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to open dashboard:', err);
      }
      setError('ダッシュボードを開けませんでした');
    }
  };

  return (
    <div className="w-72 p-4 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-lg">M</span>
        </div>
        <h1 className="text-lg font-bold">Meeting Transcriber</h1>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* 認証状態の確認 */}
      {!isAuthenticated && !error && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <span className="text-yellow-700 text-sm">
            ダッシュボードからログインしてください
          </span>
        </div>
      )}

      {/* 録音状態表示 */}
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
        className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!!error}
      >
        ダッシュボードを開く
      </button>
    </div>
  );
}
