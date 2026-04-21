/**
 * 跨平台录音器
 *
 * 原生端：expo-av 的 Audio.Recording（iOS/Android）
 * Web：   MediaRecorder + navigator.mediaDevices.getUserMedia
 *
 * 统一接口：
 *   const rec = await createRecorder();
 *   await rec.start();
 *   // ... 用户说话 ...
 *   const sample = await rec.stop();     // AudioSample
 *
 * 取消：rec.cancel();
 */

import { Platform } from 'react-native';
import type { AudioSample } from './types';

export interface Recorder {
  start(): Promise<void>;
  stop(): Promise<AudioSample>;
  cancel(): Promise<void>;
  /** 返回已录制毫秒，供 UI 显示计时器 */
  getDurationMs(): number;
}

// ─── 原生端：expo-av ────────────────────────────────────

async function createNativeRecorder(): Promise<Recorder> {
  const { Audio } = await import('expo-av');

  // 请求麦克风权限
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('未授权麦克风访问');
  }

  // 启用录音模式
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  let recording: any = null;
  let startedAt = 0;

  return {
    async start() {
      recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await recording.startAsync();
      startedAt = Date.now();
    },

    async stop(): Promise<AudioSample> {
      if (!recording) throw new Error('尚未开始录音');
      await recording.stopAndUnloadAsync();
      const uri: string | null = recording.getURI();
      recording = null;
      if (!uri) throw new Error('录音未生成文件');

      // HIGH_QUALITY preset：iOS 输出 .m4a，Android 输出 .m4a（AAC）
      const mimeType = uri.endsWith('.caf')
        ? 'audio/x-caf'
        : uri.endsWith('.3gp')
          ? 'audio/3gpp'
          : uri.endsWith('.mp3')
            ? 'audio/mpeg'
            : 'audio/m4a';

      return {
        kind: 'uri',
        uri,
        mimeType,
        filename: uri.split('/').pop() ?? 'sample.m4a',
      };
    },

    async cancel() {
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch {
          /* ignore */
        }
        recording = null;
      }
    },

    getDurationMs() {
      return startedAt ? Date.now() - startedAt : 0;
    },
  };
}

// ─── Web：MediaRecorder ─────────────────────────────────

async function createWebRecorder(): Promise<Recorder> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前浏览器不支持麦克风录音');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // 选一个广泛支持的 mime
  let mime = '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg'];
  for (const c of candidates) {
    if ((window as any).MediaRecorder?.isTypeSupported?.(c)) {
      mime = c;
      break;
    }
  }
  const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);

  const chunks: BlobPart[] = [];
  let startedAt = 0;

  mr.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  return {
    async start() {
      chunks.length = 0;
      mr.start();
      startedAt = Date.now();
    },

    async stop(): Promise<AudioSample> {
      return new Promise((resolve, reject) => {
        mr.onstop = () => {
          try {
            const blob = new Blob(chunks, { type: mime || 'audio/webm' });
            stream.getTracks().forEach((t) => t.stop());
            const ext = (mime || 'audio/webm').split('/')[1]?.split(';')[0] || 'webm';
            resolve({
              kind: 'blob',
              blob,
              mimeType: blob.type || mime || 'audio/webm',
              filename: `sample.${ext}`,
            });
          } catch (e) {
            reject(e as Error);
          }
        };
        try {
          mr.stop();
        } catch (e) {
          reject(e as Error);
        }
      });
    },

    async cancel() {
      try {
        if (mr.state !== 'inactive') mr.stop();
      } catch {
        /* ignore */
      }
      stream.getTracks().forEach((t) => t.stop());
    },

    getDurationMs() {
      return startedAt ? Date.now() - startedAt : 0;
    },
  };
}

// ─── 对外入口 ──────────────────────────────────────────

export async function createRecorder(): Promise<Recorder> {
  return Platform.OS === 'web' ? createWebRecorder() : createNativeRecorder();
}

/** 参考文本池：供 UI 随机给用户朗读（也可直接自定义） */
export const REFERENCE_TEXTS: string[] = [
  '春江潮水连海平，海上明月共潮生。',
  '海上生明月，天涯共此时。',
  '慈母手中线，游子身上衣。',
  '但愿人长久，千里共婵娟。',
  '人生若只如初见，何事秋风悲画扇。',
  '谁言寸草心，报得三春晖。',
];

export function pickReferenceText(): string {
  return REFERENCE_TEXTS[Math.floor(Math.random() * REFERENCE_TEXTS.length)];
}
