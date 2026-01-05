---
name: transcription
description: 音声ファイルをWhisper APIで文字起こしする。音声処理、transcription、文字起こし、Whisperに関する作業時に使用。
allowed-tools: Read, Write, Edit, Bash, WebFetch
---

# Transcription Skill (Whisper API)

OpenAI Whisper APIを使用した音声文字起こしの実装ガイド。

## クイックスタート

### API呼び出し（Node.js）

```typescript
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function transcribe(audioPath: string): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-1',
    language: 'ja', // 日本語
    response_format: 'verbose_json', // タイムスタンプ付き
  });
  return transcription.text;
}
```

### チャンク処理（ストリーミング用）

```typescript
interface TranscriptionChunk {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

async function transcribeChunk(
  audioBlob: Blob,
  chunkIndex: number
): Promise<TranscriptionChunk[]> {
  const formData = new FormData();
  formData.append('file', audioBlob, `chunk-${chunkIndex}.webm`);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });

  const result = await response.json();
  return result.segments.map((seg: any) => ({
    start: seg.start + chunkIndex * 5, // 5秒チャンクのオフセット
    end: seg.end + chunkIndex * 5,
    text: seg.text,
  }));
}
```

## Whisper API パラメータ

| パラメータ | 値 | 説明 |
|-----------|-----|------|
| `model` | `whisper-1` | 現在唯一のモデル |
| `language` | `ja` | ISO-639-1コード（精度向上） |
| `response_format` | `verbose_json` | タイムスタンプ取得用 |
| `temperature` | `0` | 決定論的出力 |
| `timestamp_granularities` | `segment` / `word` | 粒度指定 |

## 最適な音声フォーマット

```
サンプルレート: 16kHz（Whisper推奨）
チャンネル: Mono
フォーマット: WebM/Opus または WAV
ファイルサイズ: 最大25MB
```

## エラーハンドリング

```typescript
async function transcribeWithRetry(
  audioPath: string,
  maxRetries = 3
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await transcribe(audioPath);
    } catch (error: any) {
      if (error.status === 429) {
        // Rate limit - exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

## コスト最適化

- Whisper API: $0.006 / 分
- 1時間会議 = 約 $0.36
- 無音部分はスキップしてコスト削減
