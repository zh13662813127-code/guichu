/**
 * 声音克隆统一入口。
 *
 * UI 只需调用：cloneVoice({ provider, sample, auth, ... }) → VoiceCloneResult
 *             错误分类已归一到 VoiceCloneError（kind / code / provider）。
 *
 * 各 Provider 具体适配器：
 *   - ./minimaxClone      MiniMax（两步：upload → voice_clone）
 *   - ./siliconflowClone  SiliconFlow（CosyVoice2 / IndexTTS2 / Fish-Speech）
 *   - ./volcClone         火山引擎 V3（需控制台 speaker_id）
 */

import { cloneWithMinimax } from './minimaxClone';
import { cloneWithSiliconFlow } from './siliconflowClone';
import {
  cloneVoice as cloneWithVolcengine,
  VolcLanguage,
} from './volcClone';
import {
  AudioSample,
  CloneRequest,
  ProviderAuth,
  VoiceCloneError,
  VoiceCloneProvider,
  VoiceCloneResult,
  makeVoiceError,
} from './types';

export * from './types';
export { cloneWithMinimax, validateMinimaxVoiceId } from './minimaxClone';
export {
  cloneWithSiliconFlow,
  deleteSiliconFlowVoice,
  type SiliconFlowModel,
} from './siliconflowClone';
export {
  getVoiceStatus as getVolcVoiceStatus,
  upgradeVoice as upgradeVolcVoice,
  pollUntilReady as pollVolcUntilReady,
  VolcLanguage,
  VolcSpeakerStatus,
  type VolcAuth,
  type CloneVoiceInput as VolcCloneInput,
} from './volcClone';

/**
 * 把 AudioSample 变成 base64 字符串（火山需要）。
 * Web：Blob → base64；RN：从 uri 读取 → base64。
 */
async function sampleToBase64(sample: AudioSample): Promise<string> {
  if (sample.kind === 'base64') return sample.base64;
  if (sample.kind === 'blob') {
    const buf = await sample.blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  }
  // uri → 读文件为 base64（expo-file-system）
  const FS = await import('expo-file-system');
  return FS.readAsStringAsync(sample.uri, { encoding: FS.EncodingType.Base64 });
}

/**
 * 统一克隆入口。
 * UI 端：
 *   try {
 *     const r = await cloneVoice({ provider: 'minimax', sample, auth, desiredVoiceId: 'GrandpaLi001' });
 *     ancestorStore.updateAncestorVoice(id, r.provider, r.voiceId);
 *   } catch (e) {
 *     const err = e as VoiceCloneError;
 *     switch (err.kind) { ... }
 *   }
 */
export async function cloneVoice(req: CloneRequest): Promise<VoiceCloneResult> {
  const { provider, auth, sample, referenceText, desiredVoiceId } = req;

  if (auth.provider !== provider) {
    throw makeVoiceError(
      provider,
      'server',
      `鉴权 provider(${auth.provider}) 与请求 provider(${provider}) 不一致`,
    );
  }

  switch (provider) {
    case 'minimax': {
      const a = auth as Extract<ProviderAuth, { provider: 'minimax' }>;
      if (!desiredVoiceId) {
        throw makeVoiceError('minimax', 'server', '请提供 desiredVoiceId（8+ 字符字母数字）');
      }
      return cloneWithMinimax({
        apiKey: a.apiKey,
        groupId: a.groupId,
        voiceId: desiredVoiceId,
        sample,
        demoText: referenceText,
      });
    }

    case 'siliconflow': {
      const a = auth as Extract<ProviderAuth, { provider: 'siliconflow' }>;
      if (!referenceText) {
        throw makeVoiceError('siliconflow', 'server', 'SiliconFlow 需要参考文本');
      }
      return cloneWithSiliconFlow({
        apiKey: a.apiKey,
        model: a.model as any,
        customName: desiredVoiceId ?? `voice_${Date.now()}`,
        referenceText,
        sample,
      });
    }

    case 'volcengine': {
      const a = auth as Extract<ProviderAuth, { provider: 'volcengine' }>;
      if (!desiredVoiceId) {
        throw makeVoiceError(
          'volcengine',
          'server',
          '火山需要在控制台预先下单并获取 S_xxx speakerId',
        );
      }
      const base64 = await sampleToBase64(sample);
      const format = guessFormatFromSample(sample);
      const volcAuth =
        a.kind === 'new-console'
          ? { kind: 'new-console' as const, apiKey: a.apiKey ?? '' }
          : {
              kind: 'legacy' as const,
              appId: a.appId ?? '',
              accessToken: a.accessToken ?? '',
            };
      const r = await cloneWithVolcengine(volcAuth, {
        speakerId: desiredVoiceId,
        audioBase64: base64,
        format: format as any,
        referenceText,
        language: VolcLanguage.Chinese,
      });
      return {
        provider: 'volcengine',
        voiceId: desiredVoiceId,
        raw: r,
      };
    }

    default: {
      const _exhaustive: never = provider;
      throw makeVoiceError(
        'minimax',
        'unsupported',
        `未知 provider：${_exhaustive as string}`,
      );
    }
  }
}

function guessFormatFromSample(sample: AudioSample): 'mp3' | 'wav' | 'm4a' | 'aac' | 'ogg' | 'pcm' {
  const mime =
    sample.kind === 'blob'
      ? sample.mimeType ?? sample.blob.type
      : sample.mimeType;
  if (!mime) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'm4a';
  if (mime.includes('ogg') || mime.includes('opus')) return 'ogg';
  return 'mp3';
}

/** UI 友好的错误分级消息 */
export function voiceCloneErrorMessage(err: VoiceCloneError | Error): string {
  const e = err as VoiceCloneError;
  switch (e.kind) {
    case 'auth':
      return '鉴权失败：请到设置页检查 API Key / Group ID / Token 是否填对。';
    case 'quota':
      return '配额或余额不足：请到 Provider 控制台查看账户状态，或稍后再试。';
    case 'audio-quality':
      return '音频质量不达标：请换个安静的环境，重新录制 10–30 秒清晰语音。';
    case 'audit':
      return '内容审核未通过：请避免使用敏感词，用日常对话内容重新录制。';
    case 'not-found':
      return '未找到对应音色：请确认 speaker_id / voice_id 是否正确。';
    case 'training':
      return '音色正在训练中，请稍等片刻再查询。';
    case 'timeout':
      return '请求超时，请检查网络并重试。';
    case 'network':
      return `网络错误：${e.message || '请检查连接'}`;
    case 'unsupported':
      return e.message || '当前平台暂不支持该操作。';
    case 'server':
    default:
      return e.message || '服务端错误，请稍后再试。';
  }
}

/** 转发类型便利导出 —— 给 UI 层使用 */
export type { CloneRequest, VoiceCloneError, VoiceCloneProvider };
