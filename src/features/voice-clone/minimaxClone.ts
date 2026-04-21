/**
 * MiniMax 声音克隆（Voice Clone）客户端
 * 文档：https://platform.minimaxi.com/document/voice_clone
 *        https://www.minimax-api.com/docs/voice-clone
 *
 * 两步流程：
 *   1) POST /v1/files/upload?GroupId=xxx  ← multipart/form-data，上传音频 → 拿到 file_id
 *   2) POST /v1/voice_clone?GroupId=xxx    ← JSON，绑定 file_id + 用户自定义 voice_id
 *
 * voice_id 规则：长度 ≥ 8，首字母为英文，必须同时包含字母和数字（MiniMax 服务器侧校验）。
 * 克隆成功后，在 TTS (t2a_v2) 请求里把 voice_setting.voice_id 设为这个字符串就能合成该音色。
 */

import { Platform } from 'react-native';
import {
  AudioSample,
  VoiceCloneErrorKind,
  makeVoiceError,
  VoiceCloneResult,
} from './types';

const BASE = 'https://api.minimax.chat/v1';
const TIMEOUT_MS = 60_000;

export interface MiniMaxCloneInput {
  apiKey: string;
  groupId: string;
  /** 要绑定的 voice_id（用户自定义；8+ 字符、首字母为英文、字母数字混合） */
  voiceId: string;
  sample: AudioSample;
  /** 是否启用降噪，默认 false */
  needNoiseReduction?: boolean;
  /** 试听文本（可选；传了会返回 demo_audio URL） */
  demoText?: string;
  /** 绑定到哪个 TTS 模型，默认 speech-02-hd */
  model?: 'speech-02-hd' | 'speech-02-turbo';
}

/** 把 AudioSample 塞进 FormData，兼容 Web 的 Blob 和 RN 的 uri */
async function appendSample(form: FormData, sample: AudioSample): Promise<void> {
  if (sample.kind === 'blob') {
    // Web：直接塞 Blob
    const filename = sample.filename ?? 'sample.mp3';
    form.append('file', sample.blob, filename);
    return;
  }
  if (sample.kind === 'uri') {
    // React Native：FormData 支持 {uri, type, name} 三元组
    // @ts-expect-error RN FormData 接受这个非标准对象
    form.append('file', {
      uri: sample.uri,
      type: sample.mimeType,
      name: sample.filename ?? `sample.${sample.mimeType.split('/')[1] || 'mp3'}`,
    });
    return;
  }
  // base64 → Blob（Web）或转 uri 原生暂不走这条路
  if (Platform.OS === 'web') {
    const binary = atob(sample.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: sample.mimeType });
    form.append('file', blob, sample.filename ?? `sample.${sample.mimeType.split('/')[1] || 'mp3'}`);
    return;
  }
  throw makeVoiceError(
    'minimax',
    'unsupported',
    'MiniMax 原生端暂不支持 base64 上传，请改用 URI',
  );
}

function classifyMinimaxCode(code: number | undefined): VoiceCloneErrorKind {
  if (code === undefined) return 'unknown';
  // 官方常见业务码参考 base_resp.status_code：
  //   0         成功
  //   1000/1001 鉴权
  //   1002      限流
  //   1004      参数错误（含 voice_id 不合规、file_id 不存在）
  //   1008      余额不足
  //   1039      Token 过期
  //   2013      输入敏感
  //   2037      声纹质量不足
  //   2039      声音克隆音频过长/过短
  //   2042      音频时长不足
  if (code === 0) return 'unknown';
  if ([1000, 1001, 1039].includes(code)) return 'auth';
  if (code === 1002) return 'quota';
  if (code === 1008) return 'quota';
  if ([2013, 2037].includes(code)) return 'audit';
  if ([2039, 2042].includes(code)) return 'audio-quality';
  if (code === 1004) return 'server';
  return 'unknown';
}

/**
 * 步骤 1：把本地音频上传到 MiniMax，拿到 file_id。
 * 返回 file_id（number）与原始响应。
 */
async function uploadSample(
  input: MiniMaxCloneInput,
): Promise<{ fileId: number; raw: unknown }> {
  const form = new FormData();
  await appendSample(form, input.sample);
  form.append('purpose', 'voice_clone');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/files/upload?GroupId=${encodeURIComponent(input.groupId)}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        // ⚠️ 不要手动设 Content-Type，让 fetch 自动加 boundary
      },
      body: form as any,
    });

    if (res.status === 401 || res.status === 403) {
      throw makeVoiceError('minimax', 'auth', 'MiniMax 鉴权失败，请检查 API Key 与 GroupID');
    }
    const json: any = await res.json().catch(() => null);
    if (!res.ok || !json) {
      throw makeVoiceError(
        'minimax',
        'server',
        `MiniMax 文件上传失败（HTTP ${res.status}）`,
      );
    }
    const code = json?.base_resp?.status_code;
    if (code !== 0 && code !== undefined) {
      throw makeVoiceError(
        'minimax',
        classifyMinimaxCode(code),
        `MiniMax 上传失败（${code}）：${json?.base_resp?.status_msg ?? '未知错误'}`,
        code,
      );
    }
    const fileId: number | string | undefined = json?.file?.file_id;
    if (fileId === undefined || fileId === null) {
      throw makeVoiceError('minimax', 'server', 'MiniMax 未返回 file_id');
    }
    return { fileId: Number(fileId), raw: json };
  } catch (e: any) {
    if (e?.kind) throw e;
    if (e?.name === 'AbortError') {
      throw makeVoiceError('minimax', 'timeout', 'MiniMax 上传超时');
    }
    throw makeVoiceError('minimax', 'network', `MiniMax 网络错误：${e?.message ?? e}`);
  } finally {
    clearTimeout(timer);
  }
}

/** 校验 voiceId 是否满足 MiniMax 的格式（客户端预检，避免浪费一次上传） */
export function validateMinimaxVoiceId(v: string): string | null {
  if (v.length < 8) return 'voice_id 至少 8 个字符';
  if (!/^[A-Za-z]/.test(v)) return 'voice_id 必须以英文字母开头';
  if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) return 'voice_id 必须同时包含字母和数字';
  if (!/^[A-Za-z0-9_-]+$/.test(v)) return 'voice_id 仅允许字母、数字、下划线与连字符';
  return null;
}

/**
 * 步骤 2：绑定 file_id + voice_id，完成克隆。
 * 成功即可在 TTS 里直接用这个 voice_id 合成。
 */
async function bindVoice(
  input: MiniMaxCloneInput,
  fileId: number,
): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${BASE}/voice_clone?GroupId=${encodeURIComponent(input.groupId)}`,
      {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: fileId,
          voice_id: input.voiceId,
          need_noise_reduction: input.needNoiseReduction ?? false,
          ...(input.demoText ? { text: input.demoText } : {}),
          ...(input.model ? { model: input.model } : {}),
        }),
      },
    );
    if (res.status === 401 || res.status === 403) {
      throw makeVoiceError('minimax', 'auth', 'MiniMax 鉴权失败（voice_clone 阶段）');
    }
    const json: any = await res.json().catch(() => null);
    if (!res.ok || !json) {
      throw makeVoiceError(
        'minimax',
        'server',
        `MiniMax voice_clone 失败（HTTP ${res.status}）`,
      );
    }
    const code = json?.base_resp?.status_code;
    if (code !== 0 && code !== undefined) {
      throw makeVoiceError(
        'minimax',
        classifyMinimaxCode(code),
        `MiniMax 克隆失败（${code}）：${json?.base_resp?.status_msg ?? '未知错误'}`,
        code,
      );
    }
    return json;
  } catch (e: any) {
    if (e?.kind) throw e;
    if (e?.name === 'AbortError') {
      throw makeVoiceError('minimax', 'timeout', 'MiniMax 克隆超时');
    }
    throw makeVoiceError('minimax', 'network', `MiniMax 网络错误：${e?.message ?? e}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 一键克隆：上传音频 → 绑定 voice_id → 返回统一结果。
 * 失败抛 VoiceCloneError。
 */
export async function cloneWithMinimax(input: MiniMaxCloneInput): Promise<VoiceCloneResult> {
  const validationErr = validateMinimaxVoiceId(input.voiceId);
  if (validationErr) {
    throw makeVoiceError('minimax', 'server', validationErr);
  }
  const { fileId, raw: uploadRaw } = await uploadSample(input);
  const bindRaw = await bindVoice(input, fileId);
  return {
    provider: 'minimax',
    voiceId: input.voiceId,
    raw: { upload: uploadRaw, clone: bindRaw },
  };
}
