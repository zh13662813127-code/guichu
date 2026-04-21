/**
 * 语音引擎设置页
 * 支持系统默认 TTS、MiniMax Speech-02、火山引擎 TTS、CosyVoice、ElevenLabs
 * API Key / Access Token 用 expo-secure-store 存储（Web 降级 localStorage）
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { ConfirmModal } from '../../src/components/ConfirmModal';
import { speak, type TTSEngineKey, type TTSError } from '../../src/features/tts/speak';

const isNative = Platform.OS !== 'web';

// ─── TTS 引擎定义 ──────────────────────────────────────

interface TTSEngine {
  key: string;
  label: string;
  badge?: string;
  /** 是否已接入真实 API（false 时弹出"尚未接入"提示，不静默降级） */
  available: boolean;
  description: string;
  price?: string;
  /** 需要的输入字段 */
  fields: { key: string; label: string; placeholder: string; secure?: boolean }[];
}

const TTS_ENGINES: TTSEngine[] = [
  {
    key: 'system',
    label: '系统默认 TTS',
    badge: '已接入',
    available: true,
    description: '使用手机内置语音，无需配置',
    fields: [],
  },
  {
    key: 'minimax',
    label: 'MiniMax Speech-02',
    badge: '已接入',
    available: true,
    description: '人声相似度99%，中文最佳；默认音色 male-qn-qingse',
    price: '$50/百万字符',
    fields: [
      { key: 'tts_api_key', label: 'API Key', placeholder: '输入 MiniMax API Key', secure: true },
      { key: 'tts_group_id', label: 'Group ID', placeholder: '输入 Group ID' },
    ],
  },
  {
    key: 'volcengine',
    label: '火山引擎 TTS',
    badge: '已接入',
    available: true,
    description: '字节跳动语音合成，中文音色丰富；默认音色 BV700_streaming（灿灿）',
    price: '按字符计费，详见火山控制台',
    fields: [
      { key: 'tts_volc_appid', label: 'AppID', placeholder: '输入火山 AppID' },
      {
        key: 'tts_volc_token',
        label: 'Access Token',
        placeholder: '输入火山 Access Token',
        secure: true,
      },
      {
        key: 'tts_volc_cluster',
        label: 'Cluster（可选）',
        placeholder: '默认 volcano_tts',
      },
      {
        key: 'tts_volc_voice',
        label: '音色 voice_type（可选）',
        placeholder: '默认 BV700_streaming',
      },
    ],
  },
  {
    key: 'siliconflow',
    label: 'SiliconFlow（硅基流动）',
    badge: '已接入',
    available: true,
    description:
      '托管 CosyVoice2 / IndexTTS2 / Fish-Speech，支持一次调用克隆音色；中文、方言、英日韩均可',
    price: '¥105 / 百万 UTF-8 字节（≈ 单字 <0.0001 元）',
    fields: [
      {
        key: 'tts_sf_key',
        label: 'API Key',
        placeholder: 'sk-... （siliconflow.cn）',
        secure: true,
      },
      {
        key: 'tts_sf_model',
        label: '模型（可选）',
        placeholder: '默认 FunAudioLLM/CosyVoice2-0.5B',
      },
      {
        key: 'tts_sf_voice',
        label: '音色（可选，留空用默认）',
        placeholder: 'speech:xxx:xxx:xxx 或预置名 alex',
      },
    ],
  },
  {
    key: 'cosyvoice',
    label: 'CosyVoice 自建',
    badge: '开发中',
    available: false,
    description: '自部署 CosyVoice 服务端（尚未接入，可先用 SiliconFlow 托管版）',
    fields: [
      { key: 'tts_api_url', label: 'API 地址', placeholder: 'http://your-server:8080/v1/tts' },
      { key: 'tts_api_key', label: 'API Key', placeholder: '输入 API Key（如有）', secure: true },
    ],
  },
  {
    key: 'elevenlabs',
    label: 'ElevenLabs',
    badge: '开发中',
    available: false,
    description: '英文最佳，中文一般（接口尚未接入，敬请期待）',
    fields: [
      { key: 'tts_api_key', label: 'API Key', placeholder: '输入 ElevenLabs API Key', secure: true },
    ],
  },
];

// ─── 存储工具 ──────────────────────────────────────────

/** 需要落 SecureStore 的敏感字段 */
const SECURE_FIELDS = ['tts_api_key', 'tts_volc_token', 'tts_sf_key'] as const;
/** 所有非敏感字段，用 MMKV / localStorage */
const PLAIN_FIELDS = [
  'tts_group_id',
  'tts_api_url',
  'tts_volc_appid',
  'tts_volc_cluster',
  'tts_volc_voice',
  'tts_sf_model',
  'tts_sf_voice',
] as const;

/** 保存 TTS 配置 */
async function saveTTSConfig(engine: string, fieldValues: Record<string, string>) {
  if (isNative) {
    const SecureStore = await import('expo-secure-store');
    const { MMKV } = await import('react-native-mmkv');
    const storage = new MMKV();

    storage.set('tts_engine', engine);

    for (const [k, v] of Object.entries(fieldValues)) {
      if ((SECURE_FIELDS as readonly string[]).includes(k)) {
        // SecureStore 不接受空值，空字符串改为删除
        if (v) {
          await SecureStore.setItemAsync(k, v);
        } else {
          await SecureStore.deleteItemAsync(k).catch(() => {});
        }
      } else {
        storage.set(k, v);
      }
    }
  } else {
    localStorage.setItem('tts_engine', engine);
    for (const [k, v] of Object.entries(fieldValues)) {
      localStorage.setItem(k, v);
    }
  }
}

/** 读取 TTS 配置 */
async function loadTTSConfig(): Promise<{ engine: string; fields: Record<string, string> }> {
  try {
    if (isNative) {
      const SecureStore = await import('expo-secure-store');
      const { MMKV } = await import('react-native-mmkv');
      const storage = new MMKV();

      const engine = storage.getString('tts_engine') || 'system';
      const fields: Record<string, string> = {};
      for (const k of SECURE_FIELDS) {
        fields[k] = (await SecureStore.getItemAsync(k)) || '';
      }
      for (const k of PLAIN_FIELDS) {
        fields[k] = storage.getString(k) || '';
      }
      return { engine, fields };
    } else {
      const fields: Record<string, string> = {};
      for (const k of [...SECURE_FIELDS, ...PLAIN_FIELDS]) {
        fields[k] = localStorage.getItem(k) || '';
      }
      return {
        engine: localStorage.getItem('tts_engine') || 'system',
        fields,
      };
    }
  } catch {
    return { engine: 'system', fields: {} };
  }
}

// ─── 主组件 ───────────────────────────────────────────────

export default function TTSSettingsScreen() {
  const router = useRouter();

  const [selectedEngine, setSelectedEngine] = useState('system');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [savedModal, setSavedModal] = useState(false);
  const [resultModal, setResultModal] = useState<{ visible: boolean; title: string; message: string }>(
    { visible: false, title: '', message: '' }
  );

  // 加载已保存配置
  useEffect(() => {
    loadTTSConfig().then((config) => {
      setSelectedEngine(config.engine);
      setFieldValues(config.fields);
      setIsLoading(false);
    });
  }, []);

  /** 更新字段值 */
  const updateField = useCallback((key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  /** 测试语音 — 各引擎按自己的字段拼 TTSConfig；MiniMax / 火山 / 系统 已接入 */
  const handleTest = useCallback(async () => {
    setIsTesting(true);
    try {
      const engine = selectedEngine as TTSEngineKey;
      const baseCfg = { engine, rate: 0.9 } as const;
      const cfg =
        engine === 'minimax'
          ? {
              ...baseCfg,
              apiKey: fieldValues.tts_api_key,
              groupId: fieldValues.tts_group_id,
            }
          : engine === 'volcengine'
            ? {
                ...baseCfg,
                appId: fieldValues.tts_volc_appid,
                token: fieldValues.tts_volc_token,
                cluster: fieldValues.tts_volc_cluster || undefined,
                voiceId: fieldValues.tts_volc_voice || undefined,
              }
            : engine === 'siliconflow'
              ? {
                  ...baseCfg,
                  apiKey: fieldValues.tts_sf_key,
                  model: fieldValues.tts_sf_model || undefined,
                  voiceId: fieldValues.tts_sf_voice || undefined,
                }
              : engine === 'cosyvoice'
              ? {
                  ...baseCfg,
                  apiUrl: fieldValues.tts_api_url,
                  apiKey: fieldValues.tts_api_key,
                }
              : engine === 'elevenlabs'
                ? { ...baseCfg, apiKey: fieldValues.tts_api_key }
                : baseCfg; // system

      await speak('你好，我是归处的语音助手。这是一段测试语音。', cfg);
    } catch (e: any) {
      const err = e as Partial<TTSError>;
      let title = '测试失败';
      let message = err?.message ?? '未知错误';
      if (err?.kind === 'auth') title = '鉴权失败';
      else if (err?.kind === 'rate-limit') title = '触发限流';
      else if (err?.kind === 'timeout') title = '请求超时';
      else if (err?.kind === 'unsupported') title = '暂不支持';
      setResultModal({ visible: true, title, message });
    } finally {
      setIsTesting(false);
    }
  }, [selectedEngine, fieldValues]);

  /** 保存配置 */
  const handleSave = useCallback(async () => {
    await saveTTSConfig(selectedEngine, fieldValues);
    setSavedModal(true);
  }, [selectedEngine, fieldValues]);

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={Colors.vermilion} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollInner}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.sectionTitle}>选择 TTS 引擎</Text>

        {TTS_ENGINES.map((engine) => {
          const isSelected = selectedEngine === engine.key;
          return (
            <View key={engine.key} style={s.engineCard}>
              {/* 单选头 */}
              <Pressable
                style={s.engineHeader}
                onPress={() => setSelectedEngine(engine.key)}
              >
                {/* Radio 圆圈 */}
                <View style={[s.radio, isSelected && s.radioSelected]}>
                  {isSelected && <View style={s.radioInner} />}
                </View>
                <View style={s.engineInfo}>
                  <View style={s.engineLabelRow}>
                    <Text style={[s.engineLabel, isSelected && s.engineLabelActive]}>
                      {engine.label}
                    </Text>
                    {engine.badge && (
                      <View style={[s.badge, !engine.available && s.badgeMuted]}>
                        <Text style={[s.badgeText, !engine.available && s.badgeTextMuted]}>
                          {engine.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.engineDesc}>{engine.description}</Text>
                  {engine.price && (
                    <Text style={s.enginePrice}>{engine.price}</Text>
                  )}
                </View>
              </Pressable>

              {/* 选中时展开字段 */}
              {isSelected && engine.fields.length > 0 && (
                <View style={s.fieldsWrap}>
                  {engine.fields.map((field) => (
                    <View key={field.key} style={s.fieldGroup}>
                      <Text style={s.fieldLabel}>{field.label}</Text>
                      <TextInput
                        style={s.input}
                        value={fieldValues[field.key] || ''}
                        onChangeText={(t) => updateField(field.key, t)}
                        placeholder={field.placeholder}
                        placeholderTextColor={Colors.inkMute}
                        secureTextEntry={field.secure}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* 操作按钮 */}
        <View style={s.actionRow}>
          <Pressable
            style={({ pressed }) => [s.testBtn, pressed && { opacity: 0.7 }]}
            onPress={handleTest}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator color={Colors.inkLight} size="small" />
            ) : (
              <Text style={s.testBtnText}>测试语音</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.8 }]}
            onPress={handleSave}
          >
            <Text style={s.saveBtnText}>保存</Text>
          </Pressable>
        </View>

        {/* 推荐说明 */}
        <View style={s.tipCard}>
          <Text style={s.tipTitle}>推荐方案</Text>
          <Text style={s.tipItem}>
            {'\u2022'} 零成本体验：「系统默认」立即可用，不需任何配置
          </Text>
          <Text style={s.tipItem}>
            {'\u2022'} 声音克隆最省事：MiniMax（5 秒训好、不用买槽）或 SiliconFlow（托管 CosyVoice2）
          </Text>
          <Text style={s.tipItem}>
            {'\u2022'} 最便宜：SiliconFlow ¥105/百万字节 ≈ 每字不到 0.0001 元
          </Text>
          <Text style={s.tipItem}>
            {'\u2022'} 企业/高端：火山 V3 需在控制台下单 speaker_id（S_xxx 格式）
          </Text>
          <Text style={s.tipItem}>
            {'\u2022'} 训练好后，回到长辈详情页点「训练声音」就能开始录音
          </Text>
        </View>
      </ScrollView>

      {/* 保存成功弹窗 */}
      <ConfirmModal
        visible={savedModal}
        title="已保存"
        message="语音引擎配置已保存。"
        confirmLabel="返回"
        onConfirm={() => { setSavedModal(false); router.back(); }}
        onCancel={() => setSavedModal(false)}
      />

      {/* 测试结果弹窗 */}
      <ConfirmModal
        visible={resultModal.visible}
        title={resultModal.title}
        message={resultModal.message}
        confirmLabel="好的"
        onConfirm={() => setResultModal({ visible: false, title: '', message: '' })}
        onCancel={() => setResultModal({ visible: false, title: '', message: '' })}
      />
    </SafeAreaView>
  );
}

// ─── 样式 ──────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollInner: { padding: 20, paddingBottom: 60 },

  sectionTitle: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },

  // ─── 引擎卡片 ───────────────────────────────
  engineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 12,
    overflow: 'hidden',
  },
  engineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.inkMute,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 12,
  },
  radioSelected: {
    borderColor: Colors.vermilion,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.vermilion,
  },
  engineInfo: { flex: 1 },
  engineLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  engineLabel: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '500',
  },
  engineLabelActive: {
    color: Colors.vermilion,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: Colors.vermilion + '18',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: Colors.vermilion,
    fontSize: 11,
    fontWeight: '600',
  },
  badgeMuted: {
    backgroundColor: Colors.inkMute + '22',
  },
  badgeTextMuted: {
    color: Colors.inkMute,
  },
  engineDesc: {
    color: Colors.inkLight,
    fontSize: 13,
    lineHeight: 18,
  },
  enginePrice: {
    color: Colors.inkMute,
    fontSize: 12,
    marginTop: 2,
  },

  // ─── 展开字段 ───────────────────────────────
  fieldsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginTop: 0,
    paddingTop: 12,
  },
  fieldGroup: { marginBottom: 10 },
  fieldLabel: {
    color: Colors.inkLight,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 12,
    fontSize: 14,
    color: Colors.ink,
  },

  // ─── 操作按钮 ───────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  testBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    color: Colors.inkLight,
    fontSize: 15,
    fontWeight: '500',
  },
  saveBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: Colors.paper,
    fontSize: 15,
    fontWeight: '600',
  },

  // ─── 推荐说明 ───────────────────────────────
  tipCard: {
    backgroundColor: Colors.paperDark,
    borderRadius: 14,
    padding: 16,
  },
  tipTitle: {
    color: Colors.ink,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipItem: {
    color: Colors.inkLight,
    fontSize: 13,
    lineHeight: 22,
  },
});
