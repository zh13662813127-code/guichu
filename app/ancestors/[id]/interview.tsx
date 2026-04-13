/**
 * 访谈页面 — 引导式访谈体验
 * 三阶段：准备 → 逐题访谈 → 蒸馏生成 .skill
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
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
import { Colors } from '../../../src/constants/colors';
import { useAncestorStore } from '../../../src/stores/ancestorStore';
import {
  INTERVIEW_THEMES,
  INTERVIEW_QUESTIONS,
  getSelectedQuestions,
  type InterviewQuestion,
} from '../../../src/features/distill-skill/templates';
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

      // baseURL 和 model 存在 MMKV
      const { MMKV } = await import('react-native-mmkv');
      const storage = new MMKV();
      const baseURL = storage.getString('llm_base_url') || 'https://api.deepseek.com/v1';
      const model = storage.getString('llm_model') || 'deepseek-chat';

      return { baseURL, apiKey, model };
    } else {
      // Web 端：从内存/localStorage 读取
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

type Phase = 'prepare' | 'interview' | 'distill';

interface AnswerRecord {
  question: string;
  theme: string;
  answer: string;
}

// ─── 主组件 ───────────────────────────────────────────────

export default function InterviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ancestors = useAncestorStore((s) => s.ancestors);
  const updateAncestorSkill = useAncestorStore((s) => s.updateAncestorSkill);
  const ancestor = ancestors.find((a) => a.id === id);

  // ─── 全局状态 ─────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('prepare');

  // ─── 准备阶段状态 ─────────────────────────────────
  const [selectedThemes, setSelectedThemes] = useState<InterviewQuestion['theme'][]>(
    INTERVIEW_THEMES.map((t) => t.key)
  );

  // ─── 访谈阶段状态 ─────────────────────────────────
  const questions = useMemo(
    () => getSelectedQuestions(selectedThemes),
    [selectedThemes]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const inputRef = useRef<TextInput>(null);

  // ─── 蒸馏阶段状态 ─────────────────────────────────
  const [isDistilling, setIsDistilling] = useState(false);
  const [distillText, setDistillText] = useState('');
  const [distillDone, setDistillDone] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // ─── 准备阶段：主题选择 ───────────────────────────

  const toggleTheme = useCallback((key: InterviewQuestion['theme']) => {
    setSelectedThemes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  }, []);

  const totalQuestions = useMemo(
    () => getSelectedQuestions(selectedThemes).length,
    [selectedThemes]
  );

  const startInterview = useCallback(() => {
    if (selectedThemes.length === 0) {
      Alert.alert('提示', '请至少选择一个主题');
      return;
    }
    // 初始化答案数组
    const q = getSelectedQuestions(selectedThemes);
    setAnswers(q.map((item) => ({ question: item.text, theme: item.theme, answer: '' })));
    setCurrentIndex(0);
    setPhase('interview');
  }, [selectedThemes]);

  // ─── 访谈阶段：答题导航 ───────────────────────────

  const currentQuestion = questions[currentIndex];

  const updateCurrentAnswer = useCallback(
    (text: string) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[currentIndex] = { ...next[currentIndex], answer: text };
        return next;
      });
    },
    [currentIndex]
  );

  const goNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      inputRef.current?.blur();
    } else {
      // 最后一题 → 进入蒸馏
      handleFinishInterview();
    }
  }, [currentIndex, questions.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      inputRef.current?.blur();
    }
  }, [currentIndex]);

  const skipQuestion = useCallback(() => {
    goNext();
  }, [goNext]);

  // ─── 蒸馏阶段 ─────────────────────────────────────

  const handleFinishInterview = useCallback(async () => {
    setPhase('distill');
    setDistillText('');
    setDistillDone(false);
    setIsDistilling(true);

    const config = await loadLLMConfig();

    if (!config) {
      // 未配置 LLM
      Alert.alert(
        '未配置 LLM',
        '尚未配置大模型 API。您可以先保存原始访谈记录，稍后再蒸馏。',
        [
          {
            text: '去设置',
            onPress: () => router.push('/settings/llm' as any),
          },
          {
            text: '保存原始访谈',
            onPress: () => saveRawInterview(),
          },
        ]
      );
      setIsDistilling(false);
      return;
    }

    try {
      const validAnswers = answers.filter((a) => a.answer.trim().length > 0);
      if (validAnswers.length === 0) {
        Alert.alert('提示', '没有填写任何回答，无法蒸馏');
        setIsDistilling(false);
        return;
      }

      // 将问答格式转为新版素材格式
      const qaText = validAnswers
        .map((a) => `【问】${a.question}\n【答】${a.answer}`)
        .join('\n\n');

      const result = await generateSkillFile({
        name: ancestor?.name || '长辈',
        relationship: ancestor?.relationship || undefined,
        oneLiner: validAnswers[0]?.answer?.slice(0, 100) || '长辈',
        otherMaterials: qaText,
        llmConfig: config,
        onProgress: (chunk) => {
          setDistillText((prev) => prev + chunk);
          // 自动滚动到底部
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
        },
      });

      setDistillText(result);
      setDistillDone(true);
    } catch (err: any) {
      Alert.alert('蒸馏失败', err?.message || '请检查 LLM 配置后重试', [
        { text: '保存原始访谈', onPress: () => saveRawInterview() },
        { text: '确定' },
      ]);
    } finally {
      setIsDistilling(false);
    }
  }, [answers, ancestor]);

  /** 保存原始访谈记录为简单文本格式 */
  const saveRawInterview = useCallback(async () => {
    const validAnswers = answers.filter((a) => a.answer.trim().length > 0);
    const raw = validAnswers
      .map((a) => `## ${a.question}\n\n${a.answer}`)
      .join('\n\n---\n\n');

    const content = `---\nname: ${ancestor?.name || '长辈'}\ndescription: 原始访谈记录（未蒸馏）\n---\n\n${raw}`;

    if (id && updateAncestorSkill) {
      await updateAncestorSkill(id, content);
      Alert.alert('已保存', '原始访谈记录已保存，可稍后在设置中配置 LLM 重新蒸馏。');
      router.back();
    }
  }, [answers, ancestor, id, updateAncestorSkill]);

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

  // ─── 准备阶段 ─────────────────────────────────────
  if (phase === 'prepare') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          <Text style={styles.pageTitle}>
            访谈 · {ancestor.name}
          </Text>
          <Text style={styles.subtitle}>
            共 {selectedThemes.length} 个主题 · {totalQuestions} 题
          </Text>
          <Text style={styles.hint}>预计 30-60 分钟</Text>

          <View style={styles.themeList}>
            {INTERVIEW_THEMES.map((theme) => {
              const isSelected = selectedThemes.includes(theme.key);
              const count = INTERVIEW_QUESTIONS.filter(
                (q) => q.theme === theme.key
              ).length;
              return (
                <Pressable
                  key={theme.key}
                  style={[
                    styles.themeItem,
                    isSelected && styles.themeItemSelected,
                  ]}
                  onPress={() => toggleTheme(theme.key)}
                >
                  <Text style={styles.themeCheck}>
                    {isSelected ? '☑' : '☐'}
                  </Text>
                  <Text style={styles.themeIcon}>{theme.icon}</Text>
                  <Text
                    style={[
                      styles.themeLabel,
                      !isSelected && styles.themeLabelMuted,
                    ]}
                  >
                    {theme.label}
                  </Text>
                  <Text style={styles.themeCount}>({count}题)</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[
              styles.primaryBtn,
              selectedThemes.length === 0 && styles.primaryBtnDisabled,
            ]}
            onPress={startInterview}
            disabled={selectedThemes.length === 0}
          >
            <Text style={styles.primaryBtnText}>开始访谈</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── 访谈阶段 ─────────────────────────────────────
  if (phase === 'interview' && currentQuestion) {
    const themeInfo = INTERVIEW_THEMES.find((t) => t.key === currentQuestion.theme);

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
            {/* 顶部进度 */}
            <View style={styles.progressBar}>
              <Text style={styles.progressTheme}>
                {themeInfo?.icon} {themeInfo?.label}
              </Text>
              <Text style={styles.progressCount}>
                {currentIndex + 1}/{questions.length}
              </Text>
            </View>

            {/* 进度条 */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${((currentIndex + 1) / questions.length) * 100}%`,
                  },
                ]}
              />
            </View>

            {/* 问题文本 */}
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>
                {currentQuestion.text}
              </Text>
            </View>

            {/* 文字输入区 */}
            <TextInput
              ref={inputRef}
              style={styles.answerInput}
              value={answers[currentIndex]?.answer || ''}
              onChangeText={updateCurrentAnswer}
              placeholder="在这里记录长辈的回答..."
              placeholderTextColor={Colors.inkMute}
              multiline
              textAlignVertical="top"
              autoFocus={false}
            />

            {/* 预留录音按钮位置 */}
            <View style={styles.voicePlaceholder}>
              <Text style={styles.voicePlaceholderText}>
                🎙 语音输入（即将推出）
              </Text>
            </View>
          </ScrollView>

          {/* 底部导航 */}
          <View style={styles.navBar}>
            <Pressable
              style={styles.navBtn}
              onPress={skipQuestion}
            >
              <Text style={styles.navBtnText}>跳过</Text>
            </Pressable>

            <Pressable
              style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
              onPress={goPrev}
              disabled={currentIndex === 0}
            >
              <Text
                style={[
                  styles.navBtnText,
                  currentIndex === 0 && styles.navBtnTextDisabled,
                ]}
              >
                上一题
              </Text>
            </Pressable>

            <Pressable
              style={[styles.navBtn, styles.navBtnPrimary]}
              onPress={goNext}
            >
              <Text style={styles.navBtnTextPrimary}>
                {currentIndex === questions.length - 1 ? '完成' : '下一题'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── 蒸馏阶段 ─────────────────────────────────────
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
              onPress={() => saveRawInterview()}
            >
              <Text style={styles.secondaryBtnText}>
                保存原始访谈记录
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

  // ─── 准备阶段 ───────────────────────────────
  pageTitle: {
    color: Colors.ink,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.inkLight,
    fontSize: 15,
    marginBottom: 4,
  },
  hint: {
    color: Colors.inkMute,
    fontSize: 13,
    marginBottom: 24,
  },
  themeList: {
    gap: 12,
    marginBottom: 32,
  },
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paperDark,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  themeItemSelected: {
    borderColor: Colors.vermilion,
    backgroundColor: '#FDF8F7',
  },
  themeCheck: {
    fontSize: 18,
    marginRight: 10,
    color: Colors.vermilion,
  },
  themeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  themeLabel: {
    flex: 1,
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '500',
  },
  themeLabelMuted: {
    color: Colors.inkMute,
  },
  themeCount: {
    color: Colors.inkMute,
    fontSize: 13,
  },

  // ─── 通用按钮 ───────────────────────────────
  primaryBtn: {
    height: 56,
    backgroundColor: Colors.vermilion,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
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

  // ─── 访谈阶段 ───────────────────────────────
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTheme: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  progressCount: {
    color: Colors.inkMute,
    fontSize: 14,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.divider,
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.vermilion,
    borderRadius: 2,
  },
  questionCard: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  questionText: {
    color: Colors.ink,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 30,
  },
  answerInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    fontSize: 16,
    color: Colors.ink,
    lineHeight: 24,
    minHeight: 160,
    maxHeight: 300,
    marginBottom: 12,
  },
  voicePlaceholder: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  voicePlaceholderText: {
    color: Colors.inkMute,
    fontSize: 13,
  },

  // ─── 底部导航 ───────────────────────────────
  navBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.paper,
    gap: 12,
  },
  navBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    color: Colors.inkLight,
    fontSize: 15,
    fontWeight: '500',
  },
  navBtnTextDisabled: {
    color: Colors.inkMute,
  },
  navBtnPrimary: {
    backgroundColor: Colors.vermilion,
    borderColor: Colors.vermilion,
  },
  navBtnTextPrimary: {
    color: Colors.paper,
    fontSize: 15,
    fontWeight: '600',
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
