/**
 * Chrome拡張のtabCapture用MediaStreamConstraints型定義
 */
interface ChromeMediaStreamConstraints {
  audio: {
    mandatory: {
      chromeMediaSource: 'tab' | 'desktop';
      chromeMediaSourceId: string;
    };
  };
}

declare global {
  interface MediaDevices {
    getUserMedia(constraints: ChromeMediaStreamConstraints): Promise<MediaStream>;
  }
}

export {};
