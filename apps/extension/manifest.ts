import { defineManifest } from '@crxjs/vite-plugin';
import packageJson from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'Meeting Transcriber',
  version: packageJson.version,
  description: 'AI-powered meeting transcription for Google Meet, Zoom, and Teams',

  permissions: [
    'storage',
    'tabs',
    'tabCapture',
    'offscreen',
    'sidePanel',
  ],

  host_permissions: [
    'https://meet.google.com/*',
    'https://*.zoom.us/*',
    'https://teams.microsoft.com/*',
    'https://teams.live.com/*',
  ],

  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },

  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  },

  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },

  content_scripts: [
    {
      matches: ['https://meet.google.com/*'],
      js: ['src/content/google-meet/index.ts'],
      css: ['src/content/shared/styles.css'],
      run_at: 'document_idle',
    },
  ],

  icons: {
    '16': 'icons/icon-16.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },

  web_accessible_resources: [
    {
      resources: [
        'src/content/shared/styles.css',
        'icons/icon-16.png',
        'icons/icon-48.png',
        'icons/icon-128.png',
      ],
      matches: [
        'https://meet.google.com/*',
        'https://*.zoom.us/*',
        'https://teams.microsoft.com/*',
        'https://teams.live.com/*',
      ],
    },
  ],
});
