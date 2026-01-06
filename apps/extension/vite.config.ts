import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        offscreen: 'src/offscreen/index.html',
      },
      output: {
        // chunk分割戦略
        manualChunks: {
          'audio-processor': ['@meeting-transcriber/audio-processor'],
          'api-client': ['@meeting-transcriber/api-client'],
          shared: ['@meeting-transcriber/shared'],
        },
      },
    },
    // ソースマップを有効化（開発用）
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
    // 最小化設定（esbuildを使用）
    minify: 'esbuild',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
