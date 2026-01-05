export const PLATFORMS = {
  GOOGLE_MEET: 'google-meet',
  ZOOM: 'zoom',
  TEAMS: 'teams',
  UPLOAD: 'upload',
} as const;

export const PLATFORM_URLS = {
  'google-meet': ['meet.google.com'],
  'zoom': ['zoom.us'],
  'teams': ['teams.microsoft.com', 'teams.live.com'],
} as const;
