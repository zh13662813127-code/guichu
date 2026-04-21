/**
 * 声音克隆（声音训练）统一类型
 *
 * 当前支持三家 Provider（按推荐程度）：
 *   1. minimax     —— 2 步（upload → clone），不用买槽位；需要 GroupID
 *   2. siliconflow —— 1 步，托管 CosyVoice2/Fish-Speech/IndexTTS2；最便宜
 *   3. volcengine  —— V3 复刻，需先在控制台下单 speaker_id；企业用户首选
 *
 * 所有适配器把错误归一化到 VoiceCloneError，UI 层按 kind 分级提示。
 */

export type VoiceCloneProvider = 'minimax' | 'siliconflow' | 'volcengine';

/** 跨平台的音频样本：Web 用 Blob，原生端用 fileUri + mimeType */
export type AudioSample =
  | { kind: 'blob'; blob: Blob; filename?: string; mimeType?: string }
  | { kind: 'uri'; uri: string; mimeType: string; filename?: string }
  | { kind: 'base64'; base64: string; mimeType: string; filename?: string };

/** 通用错误分类 */
export type VoiceCloneErrorKind =
  | 'auth'
  | 'quota'
  | 'audio-quality'
  | 'audit'
  | 'not-found'
  | 'training'
  | 'timeout'
  | 'network'
  | 'server'
  | 'unsupported'
  | 'unknown';

export interface VoiceCloneError extends Error {
  kind: VoiceCloneErrorKind;
  /** Provider 原始业务码（如有） */
  code?: number | string;
  provider: VoiceCloneProvider;
}

export function makeVoiceError(
  provider: VoiceCloneProvider,
  kind: VoiceCloneErrorKind,
  message: string,
  code?: number | string,
): VoiceCloneError {
  const e = new Error(message) as VoiceCloneError;
  e.kind = kind;
  e.provider = provider;
  if (code !== undefined) e.code = code;
  return e;
}

/** 成功回调统一结果 */
export interface VoiceCloneResult {
  provider: VoiceCloneProvider;
  /** 后续合成 TTS 时用的音色标识：
   *   - minimax    → voice_id（用户指定的字符串）
   *   - siliconflow → speech:xxx:xxx:xxx URI
   *   - volcengine → S_xxx speaker_id
   */
  voiceId: string;
  /** Provider 自己返回的原始响应，调试用 */
  raw?: unknown;
}

/** 克隆一段样本的通用输入 */
export interface CloneRequest {
  provider: VoiceCloneProvider;
  sample: AudioSample;
  /** 与 sample 对应的参考文本。SiliconFlow 必填；MiniMax/火山 可选提升音质 */
  referenceText?: string;
  /** MiniMax/火山 需要的自定义 voiceId（格式各异） */
  desiredVoiceId?: string;
  /** 鉴权 */
  auth: ProviderAuth;
}

/** 各 Provider 的鉴权参数 */
export type ProviderAuth =
  | {
      provider: 'minimax';
      apiKey: string;
      groupId: string;
    }
  | {
      provider: 'siliconflow';
      apiKey: string;
      /** SiliconFlow 的声音所属模型；默认 FunAudioLLM/CosyVoice2-0.5B */
      model?: string;
    }
  | {
      provider: 'volcengine';
      kind: 'new-console' | 'legacy';
      apiKey?: string; // new-console
      appId?: string; // legacy
      accessToken?: string; // legacy
    };
