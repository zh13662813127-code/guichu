/**
 * 火山引擎声音复刻 V3 客户端
 * 文档：https://www.volcengine.com/docs/6561/2227958
 *
 * 暴露三个能力：
 *   - cloneVoice(): 上传音频样本，训练一个 speaker_id
 *   - getVoiceStatus(): 查询 speaker_id 的训练状态
 *   - upgradeVoice(): 把复刻音色升级为可跨产品使用的统一音色
 *
 * 训练出的 speaker_id（例如 "S_xxx"）可以作为火山 TTS 合成时的 voice_type 使用
 * （参见 src/features/tts/speak.ts 中的 callVolcengine）。
 *
 * 鉴权支持两套控制台：
 *   - 新版（推荐）：只要 apiKey，走 X-Api-Key
 *   - 旧版：同时需要 appId + accessToken，走 X-Api-App-Key + X-Api-Access-Key
 */

// ─── 类型 ──────────────────────────────────────────

/** 支持的音频格式：pcm 仅支持 24kHz 单声道 */
export type VolcAudioFormat = 'wav' | 'mp3' | 'ogg' | 'm4a' | 'aac' | 'pcm';

/** 训练使用的语种枚举 */
export enum VolcLanguage {
  Chinese = 0,
  English = 1,
  Japanese = 2,
  Spanish = 3,
  Indonesian = 4,
  Portuguese = 5,
  German = 6,
  French = 7,
}

/** 训练状态 */
export enum VolcSpeakerStatus {
  NotFound = 0,
  Training = 1,
  Success = 2,
  Failed = 3,
  Active = 4,
}

/** 鉴权 —— 新旧控制台二选一 */
export type VolcAuth =
  | { kind: 'new-console'; apiKey: string }
  | { kind: 'legacy'; appId: string; accessToken: string };

export interface CloneVoiceInput {
  /** 自定义 speaker_id，需与控制台下单的一致（格式如 "S_xxx"） */
  speakerId: string;
  /** 已完成 base64 编码的音频数据（不含 data: 前缀） */
  audioBase64: string;
  /** 音频格式：pcm / m4a 必传，其余可选 */
  format?: VolcAudioFormat;
  /** 让用户按该文本念，服务会比对；差异过大会返回 45001109 WER 错误 */
  referenceText?: string;
  /** 训练语种（影响试听文本的语种） */
  language?: VolcLanguage;
  /** 试听文本（4~80 字，需与 language 匹配） */
  demoText?: string;
  /** 是否开启降噪：样本噪声大时建议开启 */
  enableDenoise?: boolean;
  /** 信噪比低于该值拒绝复刻，默认 5，会降低成功率 */
  rejectMinSnrThresh?: number;
  /** 是否使用音源分离去除背景音 */
  enableMss?: boolean;
  /** 是否开启 ASR 截断（避免字被切开） */
  enableCropByAsr?: boolean;
  /** 是否开启 ASR 文本质量检测（会降低成功率） */
  enableCheckPromptTextQuality?: boolean;
  /** 是否开启音频质量检测（会降低成功率） */
  enableCheckAudioQuality?: boolean;
}

export interface SpeakerStatusModel {
  model_type: number;
  demo_audio?: string;
}

export interface VolcVoiceResponse {
  code?: number;
  message?: string;
  available_training_times?: number;
  create_time?: number;
  language?: number;
  speaker_id?: string;
  status?: number;
  speaker_status?: SpeakerStatusModel[];
}

export type VolcCloneErrorKind =
  | 'auth'
  | 'quota'
  | 'audio-quality'
  | 'audit'
  | 'not-found'
  | 'training'
  | 'timeout'
  | 'network'
  | 'server'
  | 'unknown';

export interface VolcCloneError extends Error {
  kind: VolcCloneErrorKind;
  /** 原始业务码，便于排查 */
  code?: number;
}

function makeError(
  kind: VolcCloneErrorKind,
  message: string,
  code?: number,
): VolcCloneError {
  const e = new Error(message) as VolcCloneError;
  e.kind = kind;
  if (code !== undefined) e.code = code;
  return e;
}

// ─── 内部工具 ──────────────────────────────────────

const BASE = 'https://openspeech.bytedance.com/api/v3/tts';
const DEFAULT_TIMEOUT_MS = 60_000;

function genReqId(): string {
  const r = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');
  return `${r()}${r()}-${r()}-4${r().slice(1)}-${r()}-${r()}${r()}${r()}`;
}

function authHeaders(auth: VolcAuth): Record<string, string> {
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Api-Request-Id': genReqId(),
  };
  if (auth.kind === 'new-console') {
    base['X-Api-Key'] = auth.apiKey;
  } else {
    base['X-Api-App-Key'] = auth.appId;
    base['X-Api-Access-Key'] = auth.accessToken;
  }
  return base;
}

/**
 * 把业务错误码映射到粗分类，参考文档"错误码"段落。
 * - 45001001 / 45001105：入参/数据 → server（调用方修复）
 * - 45001101~45001128：基本都是素材相关（网络/音频/审核/声纹/质量）
 * - 45001123：达到训练次数上限 → quota
 * - 45001107：未找到 speaker → not-found
 * - 55001xxx：服务端故障 → server
 * - HTTP 401/403：auth
 */
function classifyCode(code: number | undefined): VolcCloneErrorKind {
  if (code === undefined) return 'unknown';
  if (code === 45001107) return 'not-found';
  if (code === 45001123) return 'quota';
  if (code === 45001101 || code === 45001102) return 'network';
  if (
    code === 45001104 ||
    code === 45001112 ||
    code === 45001114 ||
    code === 45001122 ||
    code === 45001109
  ) {
    return 'audio-quality';
  }
  if (
    code === 45001124 ||
    code === 45001125 ||
    code === 45001127 ||
    code === 45001128
  ) {
    return 'audit';
  }
  if (code >= 55000000 && code < 56000000) return 'server';
  return 'unknown';
}

async function postJson<T extends VolcVoiceResponse>(
  path: string,
  auth: VolcAuth,
  body: unknown,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/${path}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: authHeaders(auth),
      body: JSON.stringify(body),
    });

    if (res.status === 401 || res.status === 403) {
      throw makeError('auth', '火山声音复刻鉴权失败，请检查 API Key / AppID');
    }
    const text = await res.text();
    let json: T | null = null;
    try {
      json = text ? (JSON.parse(text) as T) : null;
    } catch {
      // 非 JSON 直接视为服务端错误
    }

    if (!res.ok) {
      const code = json?.code;
      const message = json?.message ?? text.slice(0, 200) ?? `HTTP ${res.status}`;
      throw makeError(classifyCode(code), `火山声音复刻失败：${message}`, code);
    }

    if (!json) {
      throw makeError('server', '火山声音复刻返回空响应');
    }

    // 2xx 但业务码非空时也视为失败（文档说仅在失败才返回 code）
    if (typeof json.code === 'number' && json.code !== 0) {
      throw makeError(
        classifyCode(json.code),
        `火山声音复刻业务错误 ${json.code}：${json.message ?? '未知错误'}`,
        json.code,
      );
    }
    return json;
  } catch (e: any) {
    if (e?.kind) throw e as VolcCloneError;
    if (e?.name === 'AbortError') {
      throw makeError('timeout', '火山声音复刻请求超时');
    }
    throw makeError('network', `火山声音复刻网络错误：${e?.message ?? e}`);
  } finally {
    clearTimeout(timer);
  }
}

// ─── 对外接口 ──────────────────────────────────────

/**
 * 训练一段长辈的音色。
 * 注意：
 *  - speakerId 必须先在火山控制台下单并复制（格式 "S_xxx"）
 *  - 音频 ≤ 10MB
 *  - 返回 status 可能是 Training(1)；需要轮询 getVoiceStatus 直到 Success(2)/Active(4)
 */
export async function cloneVoice(
  auth: VolcAuth,
  input: CloneVoiceInput,
): Promise<VolcVoiceResponse> {
  if (!input.speakerId) throw makeError('server', 'speakerId 不能为空');
  if (!input.audioBase64) throw makeError('server', '音频数据不能为空');

  const extraParams: Record<string, unknown> = {};
  if (input.enableDenoise !== undefined) extraParams.enable_audio_denoise = input.enableDenoise;
  if (input.rejectMinSnrThresh !== undefined)
    extraParams.reject_min_snr_thresh = input.rejectMinSnrThresh;
  if (input.enableMss !== undefined) extraParams.voice_clone_enable_mss = input.enableMss;
  if (input.enableCropByAsr !== undefined) extraParams.enable_crop_by_asr = input.enableCropByAsr;
  if (input.enableCheckPromptTextQuality !== undefined)
    extraParams.enable_check_prompt_text_quality = input.enableCheckPromptTextQuality;
  if (input.enableCheckAudioQuality !== undefined)
    extraParams.enable_check_audio_quality = input.enableCheckAudioQuality;
  if (input.demoText) extraParams.demo_text = input.demoText;

  return postJson('voice_clone', auth, {
    speaker_id: input.speakerId,
    audio: {
      data: input.audioBase64,
      ...(input.format ? { format: input.format } : {}),
    },
    ...(input.referenceText ? { text: input.referenceText } : {}),
    ...(input.language !== undefined ? { language: input.language } : {}),
    ...(Object.keys(extraParams).length ? { extra_params: extraParams } : {}),
  });
}

/** 查询音色训练状态（可用于轮询） */
export async function getVoiceStatus(
  auth: VolcAuth,
  speakerId: string,
): Promise<VolcVoiceResponse> {
  if (!speakerId) throw makeError('server', 'speakerId 不能为空');
  return postJson('get_voice', auth, { speaker_id: speakerId });
}

/** 升级为支持统一管理的音色（可跨 ICL 1.0 / 2.0 / 豆包等多产品使用） */
export async function upgradeVoice(
  auth: VolcAuth,
  speakerId: string,
): Promise<VolcVoiceResponse> {
  if (!speakerId) throw makeError('server', 'speakerId 不能为空');
  return postJson('upgrade_voice', auth, { speaker_id: speakerId });
}

/**
 * 轮询直到训练完成（或超时）。
 * 默认每 3 秒一次，最多 20 次（= 1 分钟），可自定义。
 * 训练完成判定：status === Success(2) || Active(4)。
 */
export async function pollUntilReady(
  auth: VolcAuth,
  speakerId: string,
  opts: { intervalMs?: number; maxAttempts?: number } = {},
): Promise<VolcVoiceResponse> {
  const interval = opts.intervalMs ?? 3_000;
  const max = opts.maxAttempts ?? 20;
  for (let i = 0; i < max; i++) {
    const r = await getVoiceStatus(auth, speakerId);
    if (r.status === VolcSpeakerStatus.Success || r.status === VolcSpeakerStatus.Active) {
      return r;
    }
    if (r.status === VolcSpeakerStatus.Failed) {
      throw makeError('server', `音色训练失败（speaker_id=${speakerId}）`, r.code);
    }
    await new Promise((res) => setTimeout(res, interval));
  }
  throw makeError('timeout', '音色训练轮询超时，请稍后在设置页手动查询状态');
}
