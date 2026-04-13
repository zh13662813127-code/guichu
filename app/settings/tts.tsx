/**
 * 语音引擎设置页
 * 支持系统默认 TTS、MiniMax Speech-02、CosyVoice、ElevenLabs
 * API Key 用 expo-secure-store 存储（Web 降级 localStorage）
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

const isNative = Platform.OS !== 'web';

// ─── TTS 引擎定义 ──────────────────────────────────────

interface TTSEngine {
  key: string;
  label: string;
  badge?: string;
  description: string;
  price?: string;
  /** 需要的输入字段 */
  fields: { key: string; label: string; placeholder: string; secure?: boolean }[];
}

const TTS_ENGINES: TTSEngine[] = [
  {
    key: 'system',
    label: '系统默认 TTS',
    description: '使用手机内置语音，无需配置',
    fields: [],
  },
  {
    key: 'minimax',
    label: 'MiniMax Speech-02',
    badge: '推荐',
    description: '人声相似度99%，中文最佳',
    price: '$50/百万字符',
    fields: [
      { key: 'tts_api_key', label: 'API Key', placeholder: '输入 MiniMax API Key', secure: true },
      { key: 'tts_group_id', label: 'Group ID', placeholder: '输入 Group ID' },
    ],
  },
  {
    key: 'cosyvoice',
    label: 'CosyVoice (阿里)',
    description: '开源模型，支持零样本克隆',
    fields: [
      { key: 'tts_api_url', label: 'API 地址', placeholder: 'http://your-server:8080/v1/tts' },
      { key: 'tts_api_key', label: 'API Key', placeholder: '输入 API Key（如有）', secure: true },
    ],
  },
  {
    key: 'elevenlabs',
    label: 'ElevenLabs',
    description: '英文最佳，中文一般',
    fields: [
      { key: 'tts_api_key', label: 'API Key', placeholder: '输入 ElevenLabs API Key', secure: true },
    ],
  },
];

// ─── 存储工具 ──────────────────────────────────────────

/** 保存 TTS 配置 */
async function saveTTSConfig(engine: string, fieldValues: Record<string, string>) {
  if (isNative) {
    const SecureStore = await import('expo-secure-store');
    const { MMKV } = await import('react-native-mmkv');
    const storage = new MMKV();

    storage.set('tts_engine', engine);

    // API Key 存 SecureStore，其余存 MMKV
    for (const [k, v] of Object.entries(fieldValues)) {
      if (k === 'tts_api_key') {
        await SecureStore.setItemAsync('tts_api_key', v);
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
      const apiKey = (await SecureStore.getItemAsync('tts_api_key')) || '';
      const groupId = storage.getString('tts_group_id') || '';
      const apiUrl = storage.getString('tts_api_url') || '';

      return { engine, fields: { tts_api_key: apiKey, tts_group_id: groupId, tts_api_url: apiUrl } };
    } else {
      return {
        engine: localStorage.getItem('tts_engine') || 'system',
        fields: {
          tts_api_key: localStorage.getItem('tts_api_key') || '',
          tts_group_id: localStorage.getItem('tts_group_id') || '',
          tts_api_url: localStorage.getItem('tts_api_url') || '',
        },
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

  /** 测试语音 */
  const handleTest = useCallback(async () => {
    setIsTesting(true);
    try {
      if (selectedEngine === 'system') {
        // 使用 expo-speech
        const Speech = await import('expo-speech');
        Speech.speak('你好，我是归处的语音助手。这是一段测试语音。', {
          language: 'zh-CN',
          rate: 0.9,
        });
      } else {
        // 其他引擎暂为 placeholder，后续对接
        // 先用系统 TTS 代替演示
        const Speech = await import('expo-speech');
        Speech.speak('当前引擎尚在对接中，使用系统语音演示。', {
          language: 'zh-CN',
          rate: 0.9,
        });
      }
    } catch (e) {
      console.error('TTS 测试失败:', e);
    } finally {
      setIsTesting(false);
    }
  }, [selectedEngine]);

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
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{engine.badge}</Text>
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
            {'\u2022'} 零成本体验：选择「系统默认」立即可用
          </Text>
          <Text style={s.tipItem}>
            {'\u2022'} 中文克隆：选择 MiniMax，到 minimax.chat 申请 API Key
          </Text>
          <Text style={s.tipItem}>
            {'\u2022'} 自建部署：选择 CosyVoice，需要自己的服务器
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
