/**
 * AI 拍照识别族谱页
 * 用户拍摄纸质族谱照片，AI 识别后批量添加祖先
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Camera, ImageIcon, Check, X, ChevronLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../src/constants/colors';
import { useAncestorStore } from '../../src/stores/ancestorStore';

// ─── 平台判断 ────────────────────────────────────────────
const isNative = Platform.OS !== 'web';

// ─── 识别结果类型 ────────────────────────────────────────
interface RecognizedAncestor {
  name: string;
  relationship: string;
  gender: 'male' | 'female' | 'other';
  birthYear?: number;
  deathYear?: number;
  selected: boolean; // 是否勾选添加
}

// ─── LLM 配置读取 ────────────────────────────────────────
async function loadLLMConfig(): Promise<{
  baseURL: string;
  apiKey: string;
  model: string;
} | null> {
  try {
    if (isNative) {
      const SecureStore = await import('expo-secure-store');
      const apiKey = await SecureStore.getItemAsync('llm_api_key');
      if (!apiKey) return null;

      const { MMKV } = await import('react-native-mmkv');
      const storage = new MMKV();
      const baseURL = storage.getString('llm_base_url') || 'https://api.deepseek.com/v1';
      const model = storage.getString('llm_model') || 'deepseek-chat';

      return { baseURL, apiKey, model };
    } else {
      const apiKey = localStorage.getItem('llm_api_key');
      if (!apiKey) return null;
      const baseURL = localStorage.getItem('llm_base_url') || 'https://api.deepseek.com/v1';
      const model = localStorage.getItem('llm_model') || 'deepseek-chat';
      return { baseURL, apiKey, model };
    }
  } catch {
    return null;
  }
}

// ─── 族谱识别 Prompt ────────────────────────────────────
const SCAN_SYSTEM_PROMPT = `你是一个族谱识别专家。用户会给你一张纸质族谱或家谱的照片。

请仔细分析照片中的文字信息，识别出所有能辨认的人物，并以 JSON 数组的格式输出。

每个人物的格式：
{
  "name": "姓名",
  "relationship": "与后代的关系称谓（如：曾祖父、祖母、父亲等）",
  "gender": "male 或 female",
  "birthYear": 出生年份（数字，如无则省略此字段）,
  "deathYear": 去世年份（数字，如无则省略此字段）
}

注意：
1. 只输出 JSON 数组，不要输出其他内容
2. 如果照片模糊或无法识别，返回空数组 []
3. 关系称谓用中文
4. 性别根据名字和称谓推断
5. 尽可能识别所有人物，包括配偶
6. 如果能看到辈分信息，按辈分从高到低排列`;

// ─── 主组件 ──────────────────────────────────────────────
export default function ScanScreen() {
  const router = useRouter();
  const { addAncestor } = useAncestorStore();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<RecognizedAncestor[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 拍照
  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要相机权限', '请在设置中允许访问相机');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setResults([]);
      setError(null);
      if (result.assets[0].base64) {
        analyzeImage(result.assets[0].base64);
      }
    }
  }, []);

  // 从相册选择
  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要相册权限', '请在设置中允许访问相册');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setResults([]);
      setError(null);
      if (result.assets[0].base64) {
        analyzeImage(result.assets[0].base64);
      }
    }
  }, []);

  // AI 分析图片
  const analyzeImage = useCallback(async (base64: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const config = await loadLLMConfig();
      if (!config) {
        setError('尚未配置 LLM，请先前往设置页配置');
        setIsAnalyzing(false);
        return;
      }

      // 动态导入 openai SDK
      const { default: OpenAI } = await import('openai');

      const client = new OpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true,
      });

      const response = await client.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: SCAN_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: '请识别这张族谱照片中的所有人物信息。',
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 2048,
      });

      const content = response.choices[0]?.message?.content || '';

      // 尝试解析 JSON
      let parsed: any[];
      try {
        // 尝试直接解析
        parsed = JSON.parse(content);
      } catch {
        // 尝试从 markdown 代码块中提取
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1].trim());
        } else {
          // 尝试找到 [ ... ] 部分
          const bracketMatch = content.match(/\[[\s\S]*\]/);
          if (bracketMatch) {
            parsed = JSON.parse(bracketMatch[0]);
          } else {
            throw new Error('无法解析 AI 返回的结果');
          }
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError('未能从照片中识别出人物信息，请尝试拍摄更清晰的照片');
        setIsAnalyzing(false);
        return;
      }

      // 转换为 RecognizedAncestor 格式
      const recognized: RecognizedAncestor[] = parsed.map((item: any) => ({
        name: item.name || '未知',
        relationship: item.relationship || '',
        gender: item.gender === 'female' ? 'female' : item.gender === 'other' ? 'other' : 'male',
        birthYear: item.birthYear ? Number(item.birthYear) : undefined,
        deathYear: item.deathYear ? Number(item.deathYear) : undefined,
        selected: true,
      }));

      setResults(recognized);
    } catch (e: any) {
      console.error('AI 识别失败:', e);
      setError(e.message || 'AI 识别失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // 切换选中状态
  const toggleSelect = useCallback((index: number) => {
    setResults((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  }, []);

  // 批量添加
  const addAll = useCallback(async () => {
    const selected = results.filter((r) => r.selected);
    if (selected.length === 0) {
      Alert.alert('提示', '请至少选择一位祖先');
      return;
    }

    setIsAdding(true);
    try {
      for (const item of selected) {
        await addAncestor({
          name: item.name,
          relationship: item.relationship,
          gender: item.gender,
          birthYear: item.birthYear,
          deathYear: item.deathYear,
        });
      }
      Alert.alert('添加成功', `已添加 ${selected.length} 位祖先到族谱`, [
        { text: '好的', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('添加失败', e.message || '请重试');
    } finally {
      setIsAdding(false);
    }
  }, [results, addAncestor, router]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={Colors.ink} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>AI 识别族谱</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 说明文字 */}
        <Text style={styles.description}>
          拍一张纸质族谱的照片，AI 会自动识别并添加
        </Text>

        {/* 照片预览区域 */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Camera color={Colors.inkMute} size={48} />
              <Text style={styles.placeholderText}>拍摄或选择族谱照片</Text>
            </View>
          )}
        </View>

        {/* 拍照 / 选择按钮 */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
            onPress={takePhoto}
            disabled={isAnalyzing}
          >
            <Camera color={Colors.paper} size={18} />
            <Text style={styles.actionBtnText}>拍照</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnSecondary, pressed && { opacity: 0.7 }]}
            onPress={pickImage}
            disabled={isAnalyzing}
          >
            <ImageIcon color={Colors.vermilion} size={18} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>从相册选择</Text>
          </Pressable>
        </View>

        {/* 分析中 */}
        {isAnalyzing && (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator color={Colors.vermilion} size="small" />
            <Text style={styles.analyzingText}>AI 正在识别中...</Text>
          </View>
        )}

        {/* 错误提示 */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            {error.includes('LLM') && (
              <Pressable
                style={({ pressed }) => [styles.settingsLink, pressed && { opacity: 0.7 }]}
                onPress={() => router.push('/settings/llm' as any)}
              >
                <Text style={styles.settingsLinkText}>前往设置</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* 识别结果 */}
        {results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>识别结果（{results.filter((r) => r.selected).length}/{results.length}）</Text>

            {results.map((item, index) => (
              <Pressable
                key={index}
                style={[styles.resultItem, !item.selected && styles.resultItemUnselected]}
                onPress={() => toggleSelect(index)}
              >
                <View style={[styles.checkbox, item.selected && styles.checkboxChecked]}>
                  {item.selected && <Check color={Colors.paper} size={14} />}
                </View>

                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  {item.relationship ? (
                    <Text style={styles.resultRelation}>{item.relationship}</Text>
                  ) : null}
                </View>

                <View style={styles.resultMeta}>
                  <Text style={styles.resultGender}>
                    {item.gender === 'male' ? '男' : item.gender === 'female' ? '女' : '其他'}
                  </Text>
                  {(item.birthYear || item.deathYear) && (
                    <Text style={styles.resultYears}>
                      {item.birthYear || '?'}-{item.deathYear || '?'}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}

            {/* 批量添加按钮 */}
            <Pressable
              style={({ pressed }) => [
                styles.addAllBtn,
                pressed && { opacity: 0.8 },
                isAdding && { opacity: 0.6 },
              ]}
              onPress={addAll}
              disabled={isAdding}
            >
              {isAdding ? (
                <ActivityIndicator color={Colors.paper} size="small" />
              ) : (
                <Text style={styles.addAllBtnText}>
                  全部添加到族谱（{results.filter((r) => r.selected).length} 位）
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 样式 ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { color: Colors.ink, fontSize: 18, fontWeight: '700' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  description: {
    color: Colors.inkLight,
    fontSize: 14,
    marginBottom: 16,
  },

  // 图片区域
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.paperDark,
    marginBottom: 16,
    minHeight: 200,
  },
  imagePreview: {
    width: '100%',
    height: 280,
  },
  imagePlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  placeholderText: { color: Colors.inkMute, fontSize: 14 },

  // 操作按钮
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.vermilion,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnSecondary: {
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.vermilion,
  },
  actionBtnText: { color: Colors.paper, fontSize: 15, fontWeight: '600' },
  actionBtnTextSecondary: { color: Colors.vermilion },

  // 分析中
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  analyzingText: { color: Colors.inkLight, fontSize: 14 },

  // 错误
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { color: Colors.crimson, fontSize: 14 },
  settingsLink: { marginTop: 8 },
  settingsLinkText: { color: Colors.vermilion, fontSize: 14, fontWeight: '600' },

  // 识别结果
  resultsSection: { marginTop: 8 },
  resultsTitle: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paperDark,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  resultItemUnselected: { opacity: 0.5 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.vermilion,
    borderColor: Colors.vermilion,
  },
  resultInfo: { flex: 1 },
  resultName: { color: Colors.ink, fontSize: 16, fontWeight: '600' },
  resultRelation: { color: Colors.vermilion, fontSize: 12, marginTop: 2 },
  resultMeta: { alignItems: 'flex-end' },
  resultGender: { color: Colors.inkLight, fontSize: 12 },
  resultYears: { color: Colors.inkMute, fontSize: 11, marginTop: 2 },

  // 批量添加
  addAllBtn: {
    backgroundColor: Colors.vermilion,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  addAllBtnText: { color: Colors.paper, fontSize: 16, fontWeight: '700' },
});
