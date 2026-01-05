---
name: meeting-summary
description: 会議の文字起こしから要約・アクションアイテム・決定事項を抽出する。要約、サマリー、アクションアイテム、議事録作成時に使用。
allowed-tools: Read, Write, Edit, Bash
---

# Meeting Summary Skill

会議文字起こしからAIで要約・アクションアイテムを抽出するスキル。

## クイックスタート

### 要約生成（GPT-4）

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MeetingSummary {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  decisions: string[];
  nextSteps: string[];
}

interface ActionItem {
  task: string;
  assignee?: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
}

async function generateSummary(transcript: string): Promise<MeetingSummary> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `あなたは会議議事録作成の専門家です。
文字起こしから以下を抽出してください：
- 会議タイトル（推測）
- 要約（3-5文）
- 重要ポイント（箇条書き）
- アクションアイテム（担当者・期限があれば含む）
- 決定事項
- 次のステップ

JSON形式で出力してください。`,
      },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  return JSON.parse(response.choices[0].message.content!);
}
```

## プロンプトテンプレート

### 標準要約

```
以下の会議文字起こしを分析し、構造化された議事録を作成してください。

【文字起こし】
{transcript}

【出力形式】
1. 会議概要（2-3文）
2. 主要な議題
3. 決定事項
4. アクションアイテム（担当者・期限）
5. 次回までの宿題
```

### 話者別要約

```
以下の会議文字起こしを話者別に分析してください。

【文字起こし】
{transcript}

【出力形式】
各話者について：
- 主な発言内容
- 担当するアクション
- 提案・意見
```

## ストリーミング要約（リアルタイム）

```typescript
async function streamingSummary(
  transcript: string,
  onChunk: (text: string) => void
): Promise<void> {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'この会議の要約を作成してください。' },
      { role: 'user', content: transcript },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) onChunk(content);
  }
}
```

## 話者識別との連携

```typescript
interface TranscriptSegment {
  speaker: string;
  timestamp: string;
  text: string;
}

function formatTranscriptForSummary(segments: TranscriptSegment[]): string {
  return segments
    .map(s => `[${s.timestamp}] ${s.speaker}: ${s.text}`)
    .join('\n');
}
```

## 出力フォーマット例

```markdown
# 会議要約: プロジェクトキックオフ

## 概要
2024年1月15日に開催されたキックオフミーティング。
主にスケジュールと役割分担について議論。

## 決定事項
- リリース日: 3月末
- 開発言語: TypeScript

## アクションアイテム
| タスク | 担当 | 期限 |
|--------|------|------|
| 要件定義書作成 | 田中 | 1/20 |
| 環境構築 | 鈴木 | 1/18 |

## 次回予定
1/22 14:00 進捗確認MTG
```

## コスト目安

- GPT-4o: $0.005 / 1K input tokens
- 1時間会議（約15,000トークン）= 約 $0.075
