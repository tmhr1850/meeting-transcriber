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
        <div className="w-72 p-4 bg-white">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-red-700 font-semibold mb-2">エラーが発生しました</h2>
            <p className="text-red-600 text-sm mb-3">
              拡張機能の読み込みに失敗しました。ページをリロードしてください。
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="text-xs text-red-500">
                <summary className="cursor-pointer">詳細を表示</summary>
                <pre className="mt-2 overflow-auto">{this.state.error.message}</pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-3 w-full py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
