/**
 * 长辈声音训练页
 *
 * 流程：
 *   1. 在设置里配过凭证的 Provider 才会出现在选项里
 *   2. 念一段参考文本（默认给随机诗句，用户可改）
 *   3. 录 10–30 秒 → 预览 → 提交 → 等服务端训练
 *   4. 成功后把 voice_id / voice_engine 写回 ancestorStore
 *
 * 三家 Provider 差异：
 *   - MiniMax：需输入自定义 voice_id（8+ 字符，字母+数字）
 *   - SiliconFlow：参考文本必填；自定义名可选
 *   - 火山 V3：需输入控制台下单的 speaker_id（S_xxx）
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Mic, Square, Play, RotateCcw } from 'lucide-react-native';
import { Colors } from '../../../src/constants/colors';
import { ConfirmModal } from '../../../src/components/ConfirmModal';
import { useAncestorStore } from '../../../src/stores/ancestorStore';
import {
  createRecorder,
  pickReferenceText,
  type Recorder,
} from '../../../src/features/voice-clone/recorder';
import {
  cloneVoice,
  validateMinimaxVoiceId,
  voiceCloneErrorMessage,
  type AudioSample,
  type CloneRequest,
  type ProviderAuth,
  type VoiceCloneError,
  type VoiceCloneProvider,
  type VoiceCloneResult,
} from '../../../src/features/voice-clone';

const isNative = Platform.OS !== 'web';

// ─── 凭证加载（与 settings/tts.tsx 同源） ────────────────

interface Credentials {
  minimax?: { apiKey: string; groupId: string };
  siliconflow?: { apiKey: string; model?: string };
  volcengine?: { appId: string; token: string };
}

async function loadCredentials(): Promise<Credentials> {
  const out: Credentials = {};
  try {
    if (isNative) {
      const SecureStore = await import('expo-secure-store');
      const { MMKV } = await import('react-native-mmkv');
      const storage = new MMKV();

      const mmApiKey = (await SecureStore.getItemAsync('tts_api_key')) || '';
      const mmGroup = storage.getString('tts_group_id') || '';
      if (mmApiKey && mmGroup) out.minimax = { apiKey: mmApiKey, groupId: mmGroup };

      const sfKey = (await SecureStore.getItemAsync('tts_sf_key')) || '';
      const sfModel = storage.getString('tts_sf_model') || undefined;
      if (sfKey) out.siliconflow = { apiKey: sfKey, model: sfModel };

      const volcApp = storage.getString('tts_volc_appid') || '';
      const volcTok = (await SecureStore.getItemAsync('tts_volc_token')) || '';
      if (volcApp && volcTok) out.volcengine = { appId: volcApp, token: volcTok };
    } else {
      const mmApiKey = localStorage.getItem('tts_api_key') || '';
      const mmGroup = localStorage.getItem('tts_group_id') || '';
      if (mmApiKey && mmGroup) out.minimax = { apiKey: mmApiKey, groupId: mmGroup };

      const sfKey = localStorage.getItem('tts_sf_key') || '';
      const sfModel = localStorage.getItem('tts_sf_model') || undefined;
      if (sfKey) out.siliconflow = { apiKey: sfKey, model: sfModel };

      const volcApp = localStorage.getItem('tts_volc_appid') || '';
      const volcTok = localStorage.getItem('tts_volc_token') || '';
      if (volcApp && volcTok) out.volcengine = { appId: volcApp, token: volcTok };
    }
  } catch {
    /* ignore */
  }
  return out;
}

const PROVIDER_LABELS: Record<VoiceCloneProvider, string> = {
  minimax: 'MiniMax（5 秒训好）',
  siliconflow: 'SiliconFlow（CosyVoice2）',
  volcengine: '火山引擎 V3',
};

// ─── 主组件 ──────────────────────────────────────────

type Step = 'idle' | 'recording' | 'recorded' | 'uploading' | 'done';

export default function VoiceTrainScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ancestor = useAncestorStore((s) => s.ancestors.find((a) => a.id === id));
  const updateAncestorVoice = useAncestorStore((s) => s.updateAncestorVoice);

  const [creds, setCreds] = useState<Credentials>({});
  const [provider, setProvider] = useState<VoiceCloneProvider | null>(null);
  const [referenceText, setReferenceText] = useState(pickReferenceText());
  const [desiredVoiceId, setDesiredVoiceId] = useState('');

  const [step, setStep] = useState<Step>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [sample, setSample] = useState<AudioSample | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [doneModal, setDoneModal] = useState<{ visible: boolean; voiceId: string }>({
    visible: false,
    voiceId: '',
  });

  const recorderRef = useRef<Recorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 加载凭证
  useEffect(() => {
    loadCredentials().then((c) => {
      setCreds(c);
      // 默认选一个"已配置"的 provider，按推荐度排序
      const pick: VoiceCloneProvider | null = c.minimax
        ? 'minimax'
        : c.siliconflow
          ? 'siliconflow'
          : c.volcengine
            ? 'volcengine'
            : null;
      setProvider(pick);
    });
  }, []);

  // 推一个默认 voice_id（MiniMax 格式）
  useEffect(() => {
    if (provider === 'minimax' && !desiredVoiceId && ancestor) {
      // 基于长辈名生成一个满足 MiniMax 规则的默认 id
      const ts = String(Date.now()).slice(-6);
      setDesiredVoiceId(`Voice${ts}A`); // Voice + 6 位数字 + A；共 11 位，首字母英文，含字母+数字
    }
  }, [provider, ancestor, desiredVoiceId]);

  // 卸载时停掉录音 + 计时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.cancel().catch(() => {});
    };
  }, []);

  const availableProviders = useMemo<VoiceCloneProvider[]>(() => {
    const list: VoiceCloneProvider[] = [];
    if (creds.minimax) list.push('minimax');
    if (creds.siliconflow) list.push('siliconflow');
    if (creds.volcengine) list.push('volcengine');
    return list;
  }, [creds]);

  // ─── 录音控制 ────────────────────────────

  const startRecording = useCallback(async () => {
    setErrorMsg('');
    try {
      const rec = await createRecorder();
      recorderRef.current = rec;
      await rec.start();
      setStep('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(rec.getDurationMs());
      }, 200);
    } catch (e: any) {
      setErrorMsg(`无法开始录音：${e?.message ?? e}`);
      setStep('idle');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recorderRef.current) return;
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const s = await recorderRef.current.stop();
      recorderRef.current = null;
      setSample(s);
      setStep('recorded');
    } catch (e: any) {
      setErrorMsg(`停止录音失败：${e?.message ?? e}`);
      setStep('idle');
    }
  }, []);

  const redoRecording = useCallback(() => {
    setSample(null);
    setElapsed(0);
    setStep('idle');
  }, []);

  // ─── 提交训练 ────────────────────────────

  const canSubmit = useMemo(() => {
    if (step !== 'recorded' || !sample || !provider) return false;
    if (elapsed < 5_000) return false; // 至少 5 秒
    if (!referenceText.trim()) return false;
    if (provider === 'minimax') {
      if (validateMinimaxVoiceId(desiredVoiceId) !== null) return false;
    }
    if (provider === 'volcengine') {
      if (!desiredVoiceId.startsWith('S_')) return false;
    }
    return true;
  }, [step, sample, provider, elapsed, referenceText, desiredVoiceId]);

  const handleSubmit = useCallback(async () => {
    if (!provider || !sample || !id) return;
    setErrorMsg('');
    setStep('uploading');

    let auth: ProviderAuth;
    if (provider === 'minimax' && creds.minimax) {
      auth = { provider: 'minimax', apiKey: creds.minimax.apiKey, groupId: creds.minimax.groupId };
    } else if (provider === 'siliconflow' && creds.siliconflow) {
      auth = {
        provider: 'siliconflow',
        apiKey: creds.siliconflow.apiKey,
        model: creds.siliconflow.model,
      };
    } else if (provider === 'volcengine' && creds.volcengine) {
      auth = {
        provider: 'volcengine',
        kind: 'legacy',
        appId: creds.volcengine.appId,
        accessToken: creds.volcengine.token,
      };
    } else {
      setErrorMsg('该 Provider 尚未在设置页填写凭证');
      setStep('recorded');
      return;
    }

    const req: CloneRequest = {
      provider,
      sample,
      referenceText: referenceText.trim(),
      desiredVoiceId: desiredVoiceId || undefined,
      auth,
    };

    try {
      const result: VoiceCloneResult = await cloneVoice(req);
      await updateAncestorVoice(id, result.provider, result.voiceId);
      setStep('done');
      setDoneModal({ visible: true, voiceId: result.voiceId });
    } catch (e: any) {
      const err = e as VoiceCloneError;
      setErrorMsg(voiceCloneErrorMessage(err));
      setStep('recorded'); // 允许再试一次
    }
  }, [provider, sample, id, creds, referenceText, desiredVoiceId, updateAncestorVoice]);

  // ─── 渲染 ───────────────────────────────

  if (!ancestor) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <Text style={s.muted}>未找到该长辈记录。</Text>
        </View>
      </SafeAreaView>
    );
  }

  const seconds = Math.floor(elapsed / 1000);
  const durationLabel = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60,
  ).padStart(2, '0')}`;

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* 顶栏 */}
      <View style={s.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <ChevronLeft color={Colors.ink} size={22} />
        </Pressable>
        <Text style={s.topTitle}>为 {ancestor.name} 训练声音</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollInner}
        keyboardShouldPersistTaps="handled"
      >
        {/* 无凭证提示 */}
        {availableProviders.length === 0 && (
          <View style={s.warnCard}>
            <Text style={s.warnTitle}>还没填语音凭证</Text>
            <Text style={s.warnBody}>
              请先到「设置 → 语音引擎」填入 MiniMax / SiliconFlow / 火山 中任一家的 API Key。
            </Text>
            <Pressable
              style={({ pressed }) => [s.warnBtn, pressed && { opacity: 0.8 }]}
              onPress={() => router.push('/settings/tts')}
            >
              <Text style={s.warnBtnText}>去设置</Text>
            </Pressable>
          </View>
        )}

        {availableProviders.length > 0 && (
          <>
            {/* 1. Provider 选择 */}
            <Text style={s.sectionTitle}>① 选择服务商</Text>
            {availableProviders.map((p) => (
              <Pressable
                key={p}
                style={[s.providerCard, provider === p && s.providerCardActive]}
                onPress={() => setProvider(p)}
              >
                <View style={[s.radio, provider === p && s.radioSelected]}>
                  {provider === p && <View style={s.radioInner} />}
                </View>
                <Text style={[s.providerLabel, provider === p && s.providerLabelActive]}>
                  {PROVIDER_LABELS[p]}
                </Text>
              </Pressable>
            ))}

            {/* 2. 参考文本 */}
            <Text style={s.sectionTitle}>② 请朗读以下文字（10–30 秒）</Text>
            <TextInput
              style={s.refText}
              value={referenceText}
              onChangeText={setReferenceText}
              multiline
              placeholder="请念一段自然的话"
              placeholderTextColor={Colors.inkMute}
            />
            <Pressable onPress={() => setReferenceText(pickReferenceText())} style={s.regenBtn}>
              <RotateCcw color={Colors.inkLight} size={14} />
              <Text style={s.regenText}>换一段</Text>
            </Pressable>

            {/* 3. 录音 */}
            <Text style={s.sectionTitle}>③ 录音</Text>
            <View style={s.recordCard}>
              <Text style={s.timer}>{durationLabel}</Text>
              {step === 'idle' && (
                <Pressable
                  style={({ pressed }) => [s.recordBtn, pressed && { opacity: 0.85 }]}
                  onPress={startRecording}
                >
                  <Mic color="#fff" size={22} />
                  <Text style={s.recordBtnText}>开始录音</Text>
                </Pressable>
              )}
              {step === 'recording' && (
                <Pressable
                  style={({ pressed }) => [s.stopBtn, pressed && { opacity: 0.85 }]}
                  onPress={stopRecording}
                >
                  <Square color="#fff" size={20} />
                  <Text style={s.recordBtnText}>停止</Text>
                </Pressable>
              )}
              {(step === 'recorded' || step === 'uploading' || step === 'done') && (
                <View style={s.recordedRow}>
                  <Pressable
                    style={({ pressed }) => [s.redoBtn, pressed && { opacity: 0.85 }]}
                    onPress={redoRecording}
                    disabled={step === 'uploading'}
                  >
                    <RotateCcw color={Colors.inkLight} size={16} />
                    <Text style={s.redoText}>重录</Text>
                  </Pressable>
                  <Text style={s.muted}>
                    {elapsed < 5_000
                      ? '录音太短，请录满至少 5 秒'
                      : `已录 ${seconds} 秒`}
                  </Text>
                </View>
              )}
            </View>

            {/* 4. 自定义 voiceId（各 Provider 要求不同） */}
            {(provider === 'minimax' || provider === 'volcengine') && (
              <>
                <Text style={s.sectionTitle}>
                  ④ {provider === 'minimax' ? '自定义 voice_id' : '火山 speaker_id (S_xxx)'}
                </Text>
                <TextInput
                  style={s.input}
                  value={desiredVoiceId}
                  onChangeText={setDesiredVoiceId}
                  placeholder={
                    provider === 'minimax'
                      ? '8+ 字符，首字母英文，含字母+数字'
                      : 'S_xxx（在火山控制台下单获取）'
                  }
                  placeholderTextColor={Colors.inkMute}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {provider === 'minimax' && desiredVoiceId && (
                  <Text style={s.hint}>
                    {validateMinimaxVoiceId(desiredVoiceId) ?? '✓ 格式合法'}
                  </Text>
                )}
              </>
            )}

            {/* 错误提示 */}
            {errorMsg.length > 0 && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* 提交 */}
            <Pressable
              style={({ pressed }) => [
                s.submitBtn,
                !canSubmit && s.submitBtnDisabled,
                pressed && canSubmit && { opacity: 0.85 },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || step === 'uploading'}
            >
              {step === 'uploading' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitBtnText}>开始训练</Text>
              )}
            </Pressable>

            <Text style={s.tip}>
              · 请在安静环境录音{'\n'}· 口齿清晰、语速自然{'\n'}· 10–30 秒效果最好
            </Text>
          </>
        )}
      </ScrollView>

      {/* 成功弹窗 */}
      <ConfirmModal
        visible={doneModal.visible}
        title="训练完成"
        message={`音色已保存给 ${ancestor.name}\n\nvoiceId:\n${doneModal.voiceId}`}
        confirmLabel="返回"
        onConfirm={() => {
          setDoneModal({ visible: false, voiceId: '' });
          router.back();
        }}
        onCancel={() => setDoneModal({ visible: false, voiceId: '' })}
      />
    </SafeAreaView>
  );
}

// ─── 样式 ────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topbar: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.paper,
  },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 16, fontWeight: '600', color: Colors.ink },

  scroll: { flex: 1 },
  scrollInner: { padding: 20, paddingBottom: 60 },

  sectionTitle: {
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },

  // provider 卡
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  providerCardActive: { borderColor: Colors.vermilion },
  providerLabel: { fontSize: 15, color: Colors.ink, marginLeft: 10 },
  providerLabelActive: { color: Colors.vermilion, fontWeight: '600' },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.inkMute,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.vermilion },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.vermilion },

  // 参考文本
  refText: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.ink,
    minHeight: 80,
    lineHeight: 24,
  },
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 6,
    padding: 4,
  },
  regenText: { color: Colors.inkLight, fontSize: 12 },

  // 录音
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 20,
    alignItems: 'center',
  },
  timer: {
    fontSize: 32,
    fontVariant: ['tabular-nums'],
    color: Colors.ink,
    marginBottom: 16,
    fontWeight: '300',
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.vermilion,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.crimson,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  recordBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  recordedRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  redoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 20,
  },
  redoText: { color: Colors.inkLight, fontSize: 13 },

  // 输入
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.ink,
  },
  hint: { fontSize: 12, color: Colors.inkLight, marginTop: 4 },

  // 警告
  warnCard: {
    backgroundColor: Colors.amber + '18',
    borderWidth: 1,
    borderColor: Colors.amber,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  warnTitle: { color: Colors.amber, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  warnBody: { color: Colors.ink, fontSize: 13, lineHeight: 20, marginBottom: 10 },
  warnBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.amber,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  warnBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // 错误盒
  errorBox: {
    marginTop: 12,
    backgroundColor: Colors.crimson + '12',
    borderLeftWidth: 3,
    borderLeftColor: Colors.crimson,
    padding: 12,
    borderRadius: 8,
  },
  errorText: { color: Colors.crimson, fontSize: 13, lineHeight: 20 },

  // 提交
  submitBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { backgroundColor: Colors.inkMute },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  tip: {
    marginTop: 14,
    color: Colors.inkLight,
    fontSize: 12,
    lineHeight: 20,
  },
  muted: { color: Colors.inkMute, fontSize: 13 },
});
