/**
 * TTS 统一接口
 * - system：expo-speech（iOS/Android/Web 均支持）
 * - minimax：调用 MiniMax Speech-02 T2A v2 HTTP API，返回 hex 音频，用 expo-av 播放（Web 用 <audio>）
 * - volcengine：火山引擎语音合成 HTTP API，返回 base64 音频
 * - siliconflow：硅基流动 /v1/audio/speech，支持 CosyVoice2/IndexTTS2/Fish-Speech 克隆音色
 * - cosyvoice / elevenlabs：暂未接入，调用时抛出"未实现"，UI 层做降级
 *
 * 所有异常会被归一化成 TTSError，便于 UI 层做友好提示。
 */

import { Platform } from 'react-native';

// ─── 类型定义 ──────────────────────────────────────────

export type TTSEngineKey =
  | 'system'
  | 'minimax'
  | 'volcengine'
  | 'siliconflow'
  | 'cosyvoice'
  | 'elevenlabs';

export interface TTSConfig {
  engine: TTSEngineKey;
  /** 各引擎共用的鉴权与服务配置 */
  apiKey?: string;
  /** MiniMax 需要 Group ID */
  groupId?: string;
  /** CosyVoice 自建端点 */
  apiUrl?: string;
  /** 火山：AppID */
  appId?: string;
  /** 火山：Access Token（Authorization: Bearer;<token>） */
  token?: string;
  /** 火山：集群，默认 volcano_tts */
  cluster?: string;
  /** SiliconFlow：模型名，如 FunAudioLLM/CosyVoice2-0.5B、IndexTeam/IndexTTS-2 */
  model?: string;
  /** 选用的音色标识：各引擎各自定义，默认 MiniMax 的温和男声 */
  voiceId?: string;
  /** 语速 0.5~2.0；系统 TTS 与第三方引擎自行 clamp */
  rate?: number;
}

export interface TTSError extends Error {
  /** 粗分类：auth / network / rate-limit / server / unsupported / timeout / unknown */
  kind: 'auth' | 'network' | 'rate-limit' | 'server' | 'unsupported' | 'timeout' | 'unknown';
}

function makeError(kind: TTSError['kind'], message: string): TTSError {
  const e = new Error(message) as TTSError;
  e.kind = kind;
  return e;
}

const isNative = Platform.OS !== 'web';

// ─── 系统 TTS ───────────────────────────────────────────

async function speakSystem(text: string, rate: number): Promise<void> {
  try {
    const Speech = await import('expo-speech');
    Speech.speak(text, {
      language: 'zh-CN',
      rate: Math.max(0.5, Math.min(2.0, rate)),
    });
  } catch (e: any) {
    throw makeError('unsupported', `系统 TTS 不可用：${e?.message ?? e}`);
  }
}

// ─── MiniMax T2A v2 ─────────────────────────────────────

const MINIMAX_ENDPOINT = 'https://api.minimax.chat/v1/t2a_v2';
const MINIMAX_TIMEOUT_MS = 30_000;

/** hex -> Uint8Array */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length % 2 !== 0) throw makeError('server', 'MiniMax 返回的音频长度不合法');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

/** Uint8Array -> base64 （避免栈溢出，分块处理）*/
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  if (typeof btoa === 'function') return btoa(binary);
  // 理论上 Web/RN 都有 btoa；保底
  throw makeError('unsupported', '当前运行时缺少 base64 编码能力');
}

async function callMiniMax(
  text: string,
  cfg: Required<Pick<TTSConfig, 'apiKey' | 'groupId'>> & Pick<TTSConfig, 'voiceId' | 'rate'>,
): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MINIMAX_TIMEOUT_MS);
  try {
    const res = await fetch(`${MINIMAX_ENDPOINT}?GroupId=${encodeURIComponent(cfg.groupId)}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'speech-02-turbo',
        text,
        stream: false,
        voice_setting: {
          voice_id: cfg.voiceId || 'male-qn-qingse',
          speed: Math.max(0.5, Math.min(2.0, cfg.rate ?? 1)),
          vol: 1,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
      }),
    });

    if (res.status === 401 || res.status === 403) {
      throw makeError('auth', 'MiniMax 鉴权失败，请检查 API Key 与 Group ID');
    }
    if (res.status === 429) {
      throw makeError('rate-limit', 'MiniMax 触发限流，请稍后再试');
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw makeError('server', `MiniMax 返回 HTTP ${res.status}${body ? '：' + body.slice(0, 200) : ''}`);
    }

    const json: any = await res.json();
    // 业务错误码：0 或 undefined 为成功
    const baseCode = json?.base_resp?.status_code;
    if (baseCode && baseCode !== 0) {
      const msg = json?.base_resp?.status_msg || '未知业务错误';
      if ([1000, 1001, 1004, 1008, 1039].includes(baseCode)) {
        throw makeError('auth', `MiniMax 业务错误：${msg}`);
      }
      if (baseCode === 1002) throw makeError('rate-limit', `MiniMax 业务错误：${msg}`);
      throw makeError('server', `MiniMax 业务错误：${msg}`);
    }
    const hex: string | undefined = json?.data?.audio;
    if (!hex) {
      throw makeError('server', 'MiniMax 未返回音频数据');
    }
    const bytes = hexToBytes(hex);
    return `data:audio/mp3;base64,${bytesToBase64(bytes)}`;
  } catch (e: any) {
    if (e?.kind) throw e; // 已分类
    if (e?.name === 'AbortError') throw makeError('timeout', 'MiniMax 请求超时');
    throw makeError('network', `MiniMax 网络错误：${e?.message ?? e}`);
  } finally {
    clearTimeout(timer);
  }
}

// ─── Volcengine（火山引擎）TTS ──────────────────────────
// 文档：https://www.volcengine.com/docs/6561/2227958
// 端点：POST https://openspeech.bytedance.com/api/v1/tts
// 鉴权：Authorization: Bearer;<access_token>  注意是分号不是空格
// 成功业务码：code === 3000，音频位于 data 字段（base64）

const VOLC_ENDPOINT = 'https://openspeech.bytedance.com/api/v1/tts';
const VOLC_TIMEOUT_MS = 30_000;

/** 生成轻量 reqid（UUID v4 的近似实现，避免引外部依赖） */
function genReqId(): string {
  const r = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${r()}${r()}-${r()}-${r()}-${r()}-${r()}${r()}${r()}`;
}

async function callVolcengine(
  text: string,
  cfg: Required<Pick<TTSConfig, 'appId' | 'token'>> &
    Pick<TTSConfig, 'cluster' | 'voiceId' | 'rate'>,
): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), VOLC_TIMEOUT_MS);
  try {
    const res = await fetch(VOLC_ENDPOINT, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        // 火山官方约定：分号分隔，不是空格
        Authorization: `Bearer;${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app: {
          appid: cfg.appId,
          token: cfg.token,
          cluster: cfg.cluster || 'volcano_tts',
        },
        user: {
          uid: 'homecoming-user',
        },
        audio: {
          voice_type: cfg.voiceId || 'BV700_streaming',
          encoding: 'mp3',
          rate: 24000,
          speed_ratio: Math.max(0.5, Math.min(2.0, cfg.rate ?? 1)),
          volume_ratio: 1.0,
          pitch_ratio: 1.0,
        },
        request: {
          reqid: genReqId(),
          text,
          text_type: 'plain',
          operation: 'query',
          with_frontend: 1,
          frontend_type: 'unitTson',
        },
      }),
    });

    if (res.status === 401 || res.status === 403) {
      throw makeError('auth', '火山 TTS 鉴权失败，请检查 AppID 与 Access Token');
    }
    if (res.status === 429) {
      throw makeError('rate-limit', '火山 TTS 触发限流，请稍后再试');
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw makeError(
        'server',
        `火山 TTS 返回 HTTP ${res.status}${body ? '：' + body.slice(0, 200) : ''}`,
      );
    }

    const json: any = await res.json();
    const code = json?.code;
    // 业务码：3000 成功；其它按文档分类
    if (code !== 3000) {
      const msg = json?.message || json?.Message || '未知业务错误';
      // 常见错误码：1000 参数/签名，4000-4999 鉴权相关，5000+ 服务端
      if (typeof code === 'number') {
        if (code >= 4000 && code < 5000) {
          throw makeError('auth', `火山 TTS 业务错误 ${code}：${msg}`);
        }
        if (code === 1000 || code === 1001) {
          throw makeError('auth', `火山 TTS 业务错误 ${code}：${msg}`);
        }
        if (code >= 5000) {
          throw makeError('server', `火山 TTS 业务错误 ${code}：${msg}`);
        }
      }
      throw makeError('server', `火山 TTS 业务错误 ${code ?? '未知'}：${msg}`);
    }

    const b64: string | undefined = json?.data;
    if (!b64) {
      throw makeError('server', '火山 TTS 未返回音频数据');
    }
    return `data:audio/mp3;base64,${b64}`;
  } catch (e: any) {
    if (e?.kind) throw e; // 已分类
    if (e?.name === 'AbortError') throw makeError('timeout', '火山 TTS 请求超时');
    throw makeError('network', `火山 TTS 网络错误：${e?.message ?? e}`);
  } finally {
    clearTimeout(timer);
  }
}

// ─── SiliconFlow TTS（CosyVoice2 / IndexTTS2 / Fish-Speech）──────
// 文档：https://docs.siliconflow.cn/capabilities/text-to-speech
// 端点：POST https://api.siliconflow.cn/v1/audio/speech
// 鉴权：Authorization: Bearer <api_key>
// 返回：raw audio stream（不是 JSON），body 是二进制音频

const SF_ENDPOINT = 'https://api.siliconflow.cn/v1/audio/speech';
const SF_TIMEOUT_MS = 30_000;

/** Uint8Array → base64（分块避免栈溢出，Web/RN 通用） */
function u8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  if (typeof btoa === 'function') return btoa(binary);
  throw makeError('unsupported', '当前运行时缺少 base64 编码能力');
}

async function callSiliconFlow(
  text: string,
  cfg: Required<Pick<TTSConfig, 'apiKey'>> & Pick<TTSConfig, 'voiceId' | 'model' | 'rate'>,
): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SF_TIMEOUT_MS);
  try {
    const res = await fetch(SF_ENDPOINT, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.model || 'FunAudioLLM/CosyVoice2-0.5B',
        input: text,
        // 可以是 "speech:xxx:xxx:xxx"（克隆音色）或预置音色名如 "alex"
        voice: cfg.voiceId || 'alex',
        response_format: 'mp3',
        speed: Math.max(0.25, Math.min(4.0, cfg.rate ?? 1)),
        sample_rate: 44100,
      }),
    });

    if (res.status === 401 || res.status === 403) {
      throw makeError('auth', 'SiliconFlow 鉴权失败，请检查 API Key');
    }
    if (res.status === 429) {
      throw makeError('rate-limit', 'SiliconFlow 触发限流，请稍后再试');
    }
    if (!res.ok) {
      // 错误时返回 JSON；成功时返回 audio 二进制
      const body = await res.text().catch(() => '');
      throw makeError(
        'server',
        `SiliconFlow HTTP ${res.status}${body ? '：' + body.slice(0, 200) : ''}`,
      );
    }

    // 成功：raw audio stream → base64 data URI
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (bytes.length === 0) {
      throw makeError('server', 'SiliconFlow 未返回音频数据');
    }
    return `data:audio/mp3;base64,${u8ToBase64(bytes)}`;
  } catch (e: any) {
    if (e?.kind) throw e;
    if (e?.name === 'AbortError') throw makeError('timeout', 'SiliconFlow 请求超时');
    throw makeError('network', `SiliconFlow 网络错误：${e?.message ?? e}`);
  } finally {
    clearTimeout(timer);
  }
}

/** 跨平台播放 data URI */
async function playDataUri(dataUri: string): Promise<void> {
  if (isNative) {
    try {
      const { Audio } = await import('expo-av');
      const { sound } = await Audio.Sound.createAsync({ uri: dataUri });
      await sound.playAsync();
      // 播放完成后自动释放
      sound.setOnPlaybackStatusUpdate((st: any) => {
        if (st?.didJustFinish) sound.unloadAsync().catch(() => {});
      });
    } catch (e: any) {
      throw makeError('unsupported', `音频播放失败：${e?.message ?? e}`);
    }
  } else {
    try {
      if (typeof Audio === 'undefined') {
        throw makeError('unsupported', '当前浏览器不支持音频播放');
      }
      const audio = new Audio(dataUri);
      await audio.play();
    } catch (e: any) {
      throw makeError('unsupported', `音频播放失败：${e?.message ?? e}`);
    }
  }
}

// ─── 对外主接口 ────────────────────────────────────────

/**
 * 读出一段文本。
 * 调用者捕获 TTSError 后根据 e.kind 给出相应 UI。
 */
export async function speak(text: string, config: TTSConfig): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  switch (config.engine) {
    case 'system':
      return speakSystem(trimmed, config.rate ?? 0.9);
    case 'minimax': {
      if (!config.apiKey || !config.groupId) {
        throw makeError('auth', '请先填写 MiniMax API Key 与 Group ID');
      }
      const uri = await callMiniMax(trimmed, {
        apiKey: config.apiKey,
        groupId: config.groupId,
        voiceId: config.voiceId,
        rate: config.rate,
      });
      return playDataUri(uri);
    }
    case 'volcengine': {
      if (!config.appId || !config.token) {
        throw makeError('auth', '请先填写火山 TTS 的 AppID 与 Access Token');
      }
      const uri = await callVolcengine(trimmed, {
        appId: config.appId,
        token: config.token,
        cluster: config.cluster,
        voiceId: config.voiceId,
        rate: config.rate,
      });
      return playDataUri(uri);
    }
    case 'siliconflow': {
      if (!config.apiKey) {
        throw makeError('auth', '请先填写 SiliconFlow API Key');
      }
      const uri = await callSiliconFlow(trimmed, {
        apiKey: config.apiKey,
        voiceId: config.voiceId,
        model: config.model,
        rate: config.rate,
      });
      return playDataUri(uri);
    }
    case 'cosyvoice':
      throw makeError('unsupported', 'CosyVoice 自建端点暂未接入，请用 SiliconFlow 托管版');
    case 'elevenlabs':
      throw makeError('unsupported', 'ElevenLabs 尚未接入，请暂时使用系统 TTS');
    default:
      throw makeError('unsupported', `未知 TTS 引擎：${config.engine}`);
  }
}
