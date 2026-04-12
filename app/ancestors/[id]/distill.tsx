/**
 * 蒸馏页面 — 素材上传模式
 * 三阶段：素材收集 → 蒸馏生成 → 预览保存
 *
 * 用户可以上传聊天记录、口述回忆、其他素材，
 * AI 从日常痕迹中提取长辈的人格特征。
 */

import React, { useState, useCallback, useRef } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, Pen, FileText, Sparkles } from 'lucide-react-native';
import { Colors } from '../../../src/constants/colors';
import { useAncestorStore } from '../../../src/stores/ancestorStore';
import { generateSkillFile } from '../../../src/features/distill-skill/generateSkill';

// ─── LLM 配置读取工具 ─────────────────────────────────────
const isNative = Platform.OS !== 'web';

/** 从安全存储读取 LLM 配置 */
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

// ─── 类型定义 ──────────────────────────────────────────────

type Phase = 'collect' | 'distill' | 'preview';

/** 素材数据 */
interface Materials {
  chatLogs: string;
  memories: string;
  otherMaterials: string;
}

// ─── 主组件 ───────────────────────────────────────────────

export default function DistillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ancestors = useAncestorStore((s) => s.ancestors);
  const updateAncestorSkill = useAncestorStore((s) => s.updateAncestorSkill);
  const ancestor = ancestors.find((a) => a.id === id);

  // ─── 全局状态 ─────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('collect');

  // ─── 素材收集阶段状态 ─────────────────────────────
  const [materials, setMaterials] = useState<Materials>({
    chatLogs: '',
    memories: '',
    otherMaterials: '',
  });

  // ─── 蒸馏阶段状态 ─────────────────────────────────
  const [isDistilling, setIsDistilling] = useState(false);
  const [distillText, setDistillText] = useState('');
  const [distillDone, setDistillDone] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // ─── 素材校验：至少填写一个框 ─────────────────────
  const hasAnyMaterial =
    materials.chatLogs.trim().length > 0 ||
    materials.memories.trim().length > 0 ||
    materials.otherMaterials.trim().length > 0;

  // ─── 开始蒸馏 ─────────────────────────────────────

  const handleStartDistill = useCallback(async () => {
    if (!hasAnyMaterial) {
      Alert.alert('提示', '请至少填写一项素材');
      return;
    }

    setPhase('distill');
    setDistillText('');
    setDistillDone(false);
    setIsDistilling(true);

    const config = await loadLLMConfig();

    if (!config) {
      Alert.alert(
        '未配置 LLM',
        '尚未配置大模型 API。您可以先保存原始素材，稍后再蒸馏。',
        [
          {
            text: '去设置',
            onPress: () => router.push('/settings/llm' as any),
          },
          {
            text: '保存原始素材',
            onPress: () => saveRawMaterials(),
          },
        ]
      );
      setIsDistilling(false);
      return;
    }

    try {
      const result = await generateSkillFile({
        name: ancestor?.name || '长辈',
        relationship: ancestor?.relationship || undefined,
        birthYear: ancestor?.birth_year || undefined,
        deathYear: ancestor?.death_year || undefined,
        chatLogs: materials.chatLogs.trim() || undefined,
        memories: materials.memories.trim() || undefined,
        otherMaterials: materials.otherMaterials.trim() || undefined,
        llmConfig: config,
        onProgress: (chunk) => {
          setDistillText((prev) => prev + chunk);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
        },
      });

      setDistillText(result);
      setDistillDone(true);
    } catch (err: any) {
      Alert.alert('蒸馏失败', err?.message || '请检查 LLM 配置后重试', [
        { text: '保存原始素材', onPress: () => saveRawMaterials() },
        { text: '确定' },
      ]);
    } finally {
      setIsDistilling(false);
    }
  }, [materials, ancestor, hasAnyMaterial]);

  /** 保存原始素材为简单文本格式 */
  const saveRawMaterials = useCallback(async () => {
    const sections: string[] = [];
    if (materials.chatLogs.trim()) {
      sections.push(`## 聊天记录\n\n${materials.chatLogs.trim()}`);
    }
    if (materials.memories.trim()) {
      sections.push(`## 口述回忆\n\n${materials.memories.trim()}`);
    }
    if (materials.otherMaterials.trim()) {
      sections.push(`## 其他素材\n\n${materials.otherMaterials.trim()}`);
    }

    const content = `---\nname: ${ancestor?.name || '长辈'}\ndescription: 原始素材记录（未蒸馏）\n---\n\n${sections.join('\n\n---\n\n')}`;

    if (id && updateAncestorSkill) {
      await updateAncestorSkill(id, content);
      Alert.alert('已保存', '原始素材已保存，可稍后在设置中配置 LLM 重新蒸馏。');
      router.back();
    }
  }, [materials, ancestor, id, updateAncestorSkill]);

  /** 保存蒸馏后的 .skill 文件 */
  const saveSkill = useCallback(async () => {
    if (id && updateAncestorSkill && distillText) {
      await updateAncestorSkill(id, distillText);
      Alert.alert('已保存', '人格档案已生成并保存。', [
        {
          text: '查看',
          onPress: () => router.replace(`/ancestors/${id}/skill-preview`),
        },
        { text: '返回', onPress: () => router.back() },
      ]);
    }
  }, [id, updateAncestorSkill, distillText]);

  // ─── 渲染 ─────────────────────────────────────────

  if (!ancestor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>未找到长辈信息</Text>
      </SafeAreaView>
    );
  }

  // ─── 阶段 1：素材收集 ─────────────────────────────
  if (phase === 'collect') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}
        >
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.pageTitle}>
              蒸馏 · {ancestor.name}的人格
            </Text>
            <View style={styles.introBox}>
              <Sparkles color={Colors.jade} size={20} />
              <Text style={styles.introText}>
                从日常痕迹中提取长辈的记忆和人格
              </Text>
            </View>

            {/* 聊天记录 */}
            <View style={styles.materialSection}>
              <View style={styles.materialHeader}>
                <MessageCircle color={Colors.vermilion} size={18} />
                <Text style={styles.materialTitle}>聊天记录</Text>
              </View>
              <TextInput
                style={styles.materialInput}
                value={materials.chatLogs}
                onChangeText={(text) =>
                  setMaterials((prev) => ({ ...prev, chatLogs: text }))
                }
                placeholder={'粘贴或输入聊天记录内容...\n\n支持：微信/QQ 聊天导出文本'}
                placeholderTextColor={Colors.inkMute}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* 口述回忆 */}
            <View style={styles.materialSection}>
              <View style={styles.materialHeader}>
                <Pen color={Colors.jade} size={18} />
                <Text style={styles.materialTitle}>口述回忆</Text>
              </View>
              <TextInput
                style={styles.materialInput}
                value={materials.memories}
                onChangeText={(text) =>
                  setMaterials((prev) => ({ ...prev, memories: text }))
                }
                placeholder={'用你自己的话描述长辈的性格、口头禅、习惯、重要的记忆...'}
                placeholderTextColor={Colors.inkMute}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* 其他素材 */}
            <View style={styles.materialSection}>
              <View style={styles.materialHeader}>
                <FileText color={Colors.amber} size={18} />
                <Text style={styles.materialTitle}>其他素材说明</Text>
              </View>
              <TextInput
                style={styles.materialInput}
                value={materials.otherMaterials}
                onChangeText={(text) =>
                  setMaterials((prev) => ({ ...prev, otherMaterials: text }))
                }
                placeholder={'比如信件内容、日记、别人的评价等...'}
                placeholderTextColor={Colors.inkMute}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* 开始蒸馏按钮 */}
            <Pressable
              style={[
                styles.primaryBtn,
                !hasAnyMaterial && styles.primaryBtnDisabled,
              ]}
              onPress={handleStartDistill}
              disabled={!hasAnyMaterial}
            >
              <Sparkles color={Colors.paper} size={18} />
              <Text style={styles.primaryBtnText}>开始蒸馏</Text>
            </Pressable>

            <Text style={styles.footerHint}>
              至少填写一项素材即可开始蒸馏
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── 阶段 2 & 3：蒸馏中 / 预览保存 ───────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
      >
        <Text style={styles.distillTitle}>
          {isDistilling
            ? `正在蒸馏${ancestor.name}的人格...`
            : distillDone
              ? '蒸馏完成'
              : '准备蒸馏'}
        </Text>

        {isDistilling && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.vermilion} size="small" />
            <Text style={styles.loadingText}>生成中...</Text>
          </View>
        )}

        {/* 流式显示生成的文本 */}
        {distillText.length > 0 && (
          <View style={styles.skillPreview}>
            <Text style={styles.skillPreviewText} selectable>
              {distillText}
            </Text>
          </View>
        )}

        {/* 没有文本且不在蒸馏中 → 显示提示 */}
        {distillText.length === 0 && !isDistilling && (
          <View style={styles.emptyDistill}>
            <Text style={styles.emptyDistillText}>
              等待蒸馏开始...
            </Text>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => saveRawMaterials()}
            >
              <Text style={styles.secondaryBtnText}>
                保存原始素材
              </Text>
            </Pressable>
          </View>
        )}

        {/* 蒸馏完成 → 保存按钮 */}
        {distillDone && (
          <Pressable style={styles.primaryBtn} onPress={saveSkill}>
            <Text style={styles.primaryBtnText}>保存人格档案</Text>
          </Pressable>
        )}
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
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 20,
    paddingBottom: 40,
  },
  errorText: {
    color: Colors.crimson,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 60,
  },

  // ─── 素材收集阶段 ───────────────────────────
  pageTitle: {
    color: Colors.ink,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  introBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.jade + '12',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  introText: {
    color: Colors.jade,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },

  // 素材区块
  materialSection: {
    marginBottom: 20,
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  materialTitle: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  materialInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    fontSize: 15,
    color: Colors.ink,
    lineHeight: 22,
    minHeight: 140,
    maxHeight: 300,
  },

  // ─── 通用按钮 ───────────────────────────────
  primaryBtn: {
    height: 56,
    backgroundColor: Colors.vermilion,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.inkMute,
  },
  primaryBtnText: {
    color: Colors.paper,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryBtn: {
    height: 48,
    backgroundColor: Colors.paperDark,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  secondaryBtnText: {
    color: Colors.inkLight,
    fontSize: 15,
    fontWeight: '500',
  },
  footerHint: {
    color: Colors.inkMute,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },

  // ─── 蒸馏阶段 ───────────────────────────────
  distillTitle: {
    color: Colors.ink,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  loadingText: {
    color: Colors.inkLight,
    fontSize: 14,
  },
  skillPreview: {
    backgroundColor: Colors.paperDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  skillPreviewText: {
    color: Colors.ink,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  emptyDistill: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyDistillText: {
    color: Colors.inkMute,
    fontSize: 15,
  },
});
