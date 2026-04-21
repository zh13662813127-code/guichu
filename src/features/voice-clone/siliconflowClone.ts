/**
 * SiliconFlow（硅基流动）声音克隆客户端
 * 文档：https://docs.siliconflow.cn/api-reference/audio/upload-voice
 *
 * 一步到位：
 *   POST https://api.siliconflow.cn/v1/uploads/audio/voice
 *   接受 multipart/form-data（file）或 JSON（base64 audio）两种形式
 *   成功返回 { uri: "speech:your-name:xxxxxxx:yyyyyyy" }
 *
 * 该 uri 直接作为 TTS /v1/audio/speech 的 voice 字段使用，无需"下单音色槽"。
 *
 * 支持的 model（任选其一）：
 *   - FunAudioLLM/CosyVoice2-0.5B    ← 推荐，中文+方言+多语种，最便宜
 *   - IndexTeam/IndexTTS-2           ← 2026 新，B 站开源，1:1 情感复刻
 *   - fishaudio/fish-speech-1.5      ← 快，情感中性
 *
 * 价格：¥105 / 百万 UTF-8 字节（约等于每字 < 0.0001 元）
 */

import { Platform } from 'react-native';
import {
  AudioSample,
  VoiceCloneErrorKind,
  makeVoiceError,
  VoiceCloneResult,
} from './types';

const BASE = 'https://api.siliconflow.cn/v1';
const TIMEOUT_MS = 60_000;

export type SiliconFlowModel =
  | 'FunAudioLLM/CosyVoice2-0.5B'
  | 'IndexTeam/IndexTTS-2'
  | 'fishaudio/fish-speech-1.5';

export interface SiliconFlowCloneInput {
  apiKey: string;
  /** 默认 FunAudioLLM/CosyVoice2-0.5B */
  model?: SiliconFlowModel;
  /** 自定义音色名（会出现在返回的 URI 里，方便辨识） */
  customName: string;
  /** 与 sample 对应的参考文本 —— SiliconFlow 强制必填 */
  referenceText: string;
  sample: AudioSample;
}

function classifySFStatus(status: number): VoiceCloneErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 402) return 'quota';
  if (status === 413) return 'audio-quality';
  if (status === 429) return 'quota';
  if (status >= 500) return 'server';
  return 'unknown';
}

async function appendSample(form: FormData, sample: AudioSample): Promise<void> {
  if (sample.kind === 'blob') {
    form.append('file', sample.blob, sample.filename ?? 'sample.mp3');
    return;
  }
  if (sample.kind === 'uri') {
    // @ts-expect-error RN FormData 接受三元组
    form.append('file', {
      uri: sample.uri,
      type: sample.mimeType,
      name: sample.filename ?? `sample.${sample.mimeType.split('/')[1] || 'mp3'}`,
    });
    return;
  }
  // base64：Web 转 Blob；原生建议用 URI 路径
  if (Platform.OS === 'web') {
    const binary = atob(sample.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: sample.mimeType });
    form.append('file', blob, sample.filename ?? `sample.${sample.mimeType.split('/')[1] || 'mp3'}`);
    return;
  }
  throw makeVoiceError('siliconflow', 'unsupported', '原生端建议用 URI 而非 base64');
}

/**
 * 多端兼容的 upload：Web/RN 都走 multipart；base64 在 Web 端直接转 Blob。
 * 如果走 JSON 路径，会把整个音频 base64 塞进 body（仅建议 <1MB）。
 */
export async function cloneWithSiliconFlow(
  input: SiliconFlowCloneInput,
): Promise<VoiceCloneResult> {
  if (!input.customName) {
    throw makeVoiceError('siliconflow', 'server', 'customName 不能为空');
  }
  if (!input.referenceText) {
    throw makeVoiceError('siliconflow', 'server', '参考文本 referenceText 不能为空');
  }
  const model = input.model ?? 'FunAudioLLM/CosyVoice2-0.5B';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    let res: Response;

    if (input.sample.kind === 'base64' && Platform.OS !== 'web') {
      // 原生 + base64 场景：走 JSON 通道
      res = await fetch(`${BASE}/uploads/audio/voice`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          customName: input.customName,
          text: input.referenceText,
          audio: `data:${input.sample.mimeType};base64,${input.sample.base64}`,
        }),
      });
    } else {
      // 主流路径：multipart/form-data
      const form = new FormData();
      form.append('model', model);
      form.append('customName', input.customName);
      form.append('text', input.referenceText);
      await appendSample(form, input.sample);

      res = await fetch(`${BASE}/uploads/audio/voice`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          // 不设 Content-Type，让 boundary 自动生成
        },
        body: form as any,
      });
    }

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* 非 JSON —— 可能是限流纯文本 */
    }

    if (!res.ok) {
      const msg =
        json?.message ??
        json?.error?.message ??
        (text && text.slice(0, 200)) ??
        `HTTP ${res.status}`;
      throw makeVoiceError(
        'siliconflow',
        classifySFStatus(res.status),
        `SiliconFlow 克隆失败：${msg}`,
        res.status,
      );
    }

    const uri: string | undefined = json?.uri;
    if (!uri || !uri.startsWith('speech:')) {
      throw makeVoiceError(
        'siliconflow',
        'server',
        `SiliconFlow 返回格式异常：${JSON.stringify(json).slice(0, 200)}`,
      );
    }

    return {
      provider: 'siliconflow',
      voiceId: uri,
      raw: json,
    };
  } catch (e: any) {
    if (e?.kind) throw e;
    if (e?.name === 'AbortError') {
      throw makeVoiceError('siliconflow', 'timeout', 'SiliconFlow 克隆超时');
    }
    throw makeVoiceError('siliconflow', 'network', `SiliconFlow 网络错误：${e?.message ?? e}`);
  } finally {
    clearTimeout(timer);
  }
}

/** 删除托管音色（如果用户想清理） */
export async function deleteSiliconFlowVoice(
  apiKey: string,
  uri: string,
): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/audio/voice/deletions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uri }),
    });
    if (!res.ok) {
      throw makeVoiceError(
        'siliconflow',
        classifySFStatus(res.status),
        `删除音色失败 HTTP ${res.status}`,
        res.status,
      );
    }
  } finally {
    clearTimeout(timer);
  }
}
