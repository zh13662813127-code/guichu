/**
 * LLM 配置页
 * 支持多家 Provider 预设，API Key 安全存储
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';

// ─── Provider 预设 ──────────────────────────────────────

interface ProviderPreset {
  label: string;
  baseURL: string;
  model: string;
}

const PROVIDERS: Record<string, ProviderPreset> = {
  deepseek: {
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  kimi: {
    label: 'Kimi',
    baseURL: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
  },
  qwen: {
    label: '通义千问',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
  },
  openai: {
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  claude: {
    label: 'Claude',
    baseURL: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-20250514',
  },
  ollama: {
    label: 'Ollama(本地)',
    baseURL: 'http://localhost:11434/v1',
    model: 'qwen2.5:7b',
  },
};

const PROVIDER_KEYS = Object.keys(PROVIDERS);

const isNative = Platform.OS !== 'web';

// ─── 存储工具 ──────────────────────────────────────────

/** 保存 LLM 配置 */
async function saveLLMConfig(config: {
  provider: string;
  baseURL: string;
  apiKey: string;
  model: string;
}) {
  if (isNative) {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync('llm_api_key', config.apiKey);

    const { MMKV } = await import('react-native-mmkv');
    const storage = new MMKV();
    storage.set('llm_provider', config.provider);
    storage.set('llm_base_url', config.baseURL);
    storage.set('llm_model', config.model);
  } else {
    localStorage.setItem('llm_api_key', config.apiKey);
    localStorage.setItem('llm_provider', config.provider);
    localStorage.setItem('llm_base_url', config.baseURL);
    localStorage.setItem('llm_model', config.model);
  }
}

/** 读取 LLM 配置 */
async function loadLLMConfig(): Promise<{
  provider: string;
  baseURL: string;
  apiKey: string;
  model: string;
}> {
  const defaults = {
    provider: 'deepseek',
    baseURL: PROVIDERS.deepseek.baseURL,
    apiKey: '',
    model: PROVIDERS.deepseek.model,
  };

  try {
    if (isNative) {
      const SecureStore = await import('expo-secure-store');
      const apiKey = (await SecureStore.getItemAsync('llm_api_key')) || '';

      const { MMKV } = await import('react-native-mmkv');
      const storage = new MMKV();
      const provider = storage.getString('llm_provider') || defaults.provider;
      const baseURL = storage.getString('llm_base_url') || defaults.baseURL;
      const model = storage.getString('llm_model') || defaults.model;

      return { provider, baseURL, apiKey, model };
    } else {
      return {
        provider: localStorage.getItem('llm_provider') || defaults.provider,
        baseURL: localStorage.getItem('llm_base_url') || defaults.baseURL,
        apiKey: localStorage.getItem('llm_api_key') || '',
        model: localStorage.getItem('llm_model') || defaults.model,
      };
    }
  } catch {
    return defaults;
  }
}

// ─── 主组件 ───────────────────────────────────────────────

export default function LLMSettingsScreen() {
  const router = useRouter();

  const [provider, setProvider] = useState('deepseek');
  const [baseURL, setBaseURL] = useState(PROVIDERS.deepseek.baseURL);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(PROVIDERS.deepseek.model);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [errorDetail, setErrorDetail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // 加载已保存的配置
  useEffect(() => {
    loadLLMConfig().then((config) => {
      setProvider(config.provider);
      setBaseURL(config.baseURL);
      setApiKey(config.apiKey);
      setModel(config.model);
      setIsLoading(false);
    });
  }, []);

  // 切换 Provider 时自动填入默认值
  const selectProvider = useCallback(
    (key: string) => {
      setProvider(key);
      const preset = PROVIDERS[key];
      if (preset) {
        setBaseURL(preset.baseURL);
        setModel(preset.model);
      }
      setTestResult(null);
    },
    []
  );

  // 测试连接
  const testConnection = useCallback(async () => {
    if (!apiKey.trim()) {
      setErrorDetail('请先填写 API Key');
      setTestResult('fail');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setErrorDetail('');

    try {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({
        baseURL,
        apiKey,
        dangerouslyAllowBrowser: true,
      });

      const response = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: '你好，请回复"连接成功"' }],
        max_tokens: 20,
      });

      if (response.choices?.[0]?.message?.content) {
        setTestResult('success');
      } else {
        setTestResult('fail');
        setErrorDetail('模型未返回有效内容');
      }
    } catch (err: any) {
      console.error('LLM 测试连接失败:', err);
      setTestResult('fail');

      // 提取错误信息
      let msg = err?.message || '请检查配置后重试';

      // 解析常见错误
      if (msg.includes('CORS') || msg.includes('Network') || msg.includes('Failed to fetch')) {
        msg = '浏览器 CORS 限制：Moonshot/OpenAI 等 API 服务器不允许浏览器直接跨域调用。\n\n解决方案：\n1. 用手机端 Expo Go 扫码测试（无 CORS 限制）\n2. 或改用 DeepSeek（已开放 CORS）\n3. 或自建代理服务器';
      } else if (err?.status === 401 || msg.includes('401')) {
        msg = 'API Key 无效、已过期或余额不足。请到官方后台检查。';
      } else if (err?.status === 404) {
        msg = `模型或端点不存在（404）：\n- 模型名："${model}"\n- API 地址："${baseURL}"\n请到官方文档确认模型名是否正确。`;
      } else if (err?.status === 429) {
        msg = '请求过快或已达到限流额度，请稍后重试。';
      } else if (err?.status === 400) {
        msg = `请求格式错误：${msg}`;
      } else if (err?.status && err?.status >= 500) {
        msg = `服务器错误（${err.status}）：服务提供方可能宕机，请稍后重试。`;
      }

      setErrorDetail(msg);
    } finally {
      setIsTesting(false);
    }
  }, [baseURL, apiKey, model]);

  // 保存
  const handleSave = useCallback(async () => {
    if (!apiKey.trim()) {
      Alert.alert('提示', '请填写 API Key');
      return;
    }
    await saveLLMConfig({ provider, baseURL, apiKey, model });
    Alert.alert('已保存', 'LLM 配置已保存。', [
      { text: '确定', onPress: () => router.back() },
    ]);
  }, [provider, baseURL, apiKey, model]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.vermilion} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>LLM 配置</Text>
        <Text style={styles.pageHint}>
          配置大语言模型，用于蒸馏长辈人格档案
        </Text>

        {/* 服务商选择 */}
        <Text style={styles.label}>服务商</Text>
        <View style={styles.providerGrid}>
          {PROVIDER_KEYS.map((key) => (
            <Pressable
              key={key}
              style={[
                styles.providerChip,
                provider === key && styles.providerChipActive,
              ]}
              onPress={() => selectProvider(key)}
            >
              <Text
                style={[
                  styles.providerChipText,
                  provider === key && styles.providerChipTextActive,
                ]}
              >
                {PROVIDERS[key].label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* API 地址 */}
        <Text style={styles.label}>API 地址</Text>
        <TextInput
          style={styles.input}
          value={baseURL}
          onChangeText={setBaseURL}
          placeholder="https://api.example.com/v1"
          placeholderTextColor={Colors.inkMute}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* API Key */}
        <Text style={styles.label}>API Key</Text>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={(t) => {
            setApiKey(t);
            setTestResult(null);
          }}
          placeholder="sk-..."
          placeholderTextColor={Colors.inkMute}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* 模型名 */}
        <Text style={styles.label}>模型名</Text>
        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          placeholder="deepseek-chat"
          placeholderTextColor={Colors.inkMute}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* 测试连接 */}
        <Pressable
          style={[styles.testBtn, isTesting && styles.testBtnDisabled]}
          onPress={testConnection}
          disabled={isTesting}
        >
          {isTesting ? (
            <ActivityIndicator color={Colors.inkLight} size="small" />
          ) : (
            <Text style={styles.testBtnText}>
              {testResult === 'success'
                ? '\u2713 连接成功'
                : testResult === 'fail'
                  ? '\u2717 连接失败，点击重试'
                  : '测试连接'}
            </Text>
          )}
        </Pressable>

        {testResult === 'success' && (
          <Text style={styles.successHint}>
            ✓ 模型响应正常，可以保存配置。
          </Text>
        )}

        {testResult === 'fail' && errorDetail ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>错误详情</Text>
            <Text style={styles.errorText}>{errorDetail}</Text>
          </View>
        ) : null}

        {/* 保存 */}
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>保存</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 样式 ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    padding: 20,
    paddingBottom: 60,
  },
  pageTitle: {
    color: Colors.ink,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  pageHint: {
    color: Colors.inkMute,
    fontSize: 14,
    marginBottom: 28,
  },
  label: {
    color: Colors.inkLight,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    fontSize: 15,
    color: Colors.ink,
  },

  // ─── Provider 选择 ──────────────────────────
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.paperDark,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  providerChipActive: {
    borderColor: Colors.vermilion,
    backgroundColor: '#FDF8F7',
  },
  providerChipText: {
    color: Colors.inkLight,
    fontSize: 14,
    fontWeight: '500',
  },
  providerChipTextActive: {
    color: Colors.vermilion,
    fontWeight: '600',
  },

  // ─── 测试连接 ───────────────────────────────
  testBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  testBtnDisabled: {
    opacity: 0.6,
  },
  testBtnText: {
    color: Colors.inkLight,
    fontSize: 15,
    fontWeight: '500',
  },
  successHint: {
    color: Colors.jade,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },

  // ─── 错误详情框 ───
  errorBox: {
    marginTop: 12,
    backgroundColor: Colors.crimson + '12',
    borderLeftWidth: 3,
    borderLeftColor: Colors.crimson,
    borderRadius: 8,
    padding: 12,
  },
  errorTitle: {
    color: Colors.crimson,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorText: {
    color: Colors.ink,
    fontSize: 13,
    lineHeight: 20,
  },

  // ─── 保存 ───────────────────────────────────
  saveBtn: {
    height: 56,
    backgroundColor: Colors.vermilion,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: Colors.paper,
    fontSize: 17,
    fontWeight: '600',
  },
});
