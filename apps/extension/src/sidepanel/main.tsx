import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

/**
 * Error Boundary
 * 予期しないエラーでUIが完全に壊れることを防ぐ
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full border border-red-200">
            <h2 className="text-red-700 font-semibold text-lg mb-2">
              エラーが発生しました
            </h2>
            <p className="text-red-600 text-sm mb-4">
              Side Panelの読み込みに失敗しました。ページをリロードしてください。
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="text-xs text-red-500 mb-4">
                <summary className="cursor-pointer">詳細を表示</summary>
                <pre className="mt-2 overflow-auto p-2 bg-red-50 rounded">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              リロード
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
