/**
 * 蒸馏页面 — 引导式分步收集 + 双轨蒸馏
 * 4 步流程：基本画像 → 核心记忆 → 素材补充 → 蒸馏生成
 *
 * 参考 yourself-skill 理念：
 * Part A — 记忆档案 | Part B — 5 层人格结构
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
import { ChevronLeft, Settings, Save } from 'lucide-react-native';
import { Colors } from '../../../src/constants/colors';
import { Fonts, Labels } from '../../../src/constants/typography';
import { useAncestorStore } from '../../../src/stores/ancestorStore';
import { generateSkillFile } from '../../../src/features/distill-skill/generateSkill';

// ─── LLM 配置读取 ─────────────────────────────────────────
const isNative = Platform.OS !== 'web';

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

/** 步骤 1 数据 */
interface Step1Data {
  oneLiner: string;       // 一句话描述（必填）
  catchphrases: string;   // 口头禅，每行一个
  hometown: string;       // 哪里人/口音
  occupation: string;     // 职业
}

/** 步骤 2 数据 */
interface Step2Data {
  lifeStories: string;    // 重要经历
  proudest: string;       // 最骄傲的事
  biggestRegret: string;  // 最大遗憾
}

/** 步骤 3 数据 */
interface Step3Data {
  chatLogs: string;       // 聊天记录
  otherMaterials: string; // 其他素材
}

const TOTAL_STEPS = 4;

// ─── 主组件 ───────────────────────────────────────────────

export default function DistillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ancestors = useAncestorStore((s) => s.ancestors);
  const updateAncestorSkill = useAncestorStore((s) => s.updateAncestorSkill);
  const ancestor = ancestors.find((a) => a.id === id);

  // ─── 步骤控制 ─────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);

  // ─── 各步骤数据 ───────────────────────────────────
  const [step1, setStep1] = useState<Step1Data>({
    oneLiner: '',
    catchphrases: '',
    hometown: '',
    occupation: '',
  });
  const [step2, setStep2] = useState<Step2Data>({
    lifeStories: '',
    proudest: '',
    biggestRegret: '',
  });
  const [step3, setStep3] = useState<Step3Data>({
    chatLogs: '',
    otherMaterials: '',
  });

  // ─── 蒸馏阶段状态 ─────────────────────────────────
  const [isDistilling, setIsDistilling] = useState(false);
  const [distillText, setDistillText] = useState('');
  const [distillDone, setDistillDone] = useState(false);
  const [noLLMConfig, setNoLLMConfig] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // ─── 步骤 1 校验：一句话描述必填 ──────────────────
  const canProceedStep1 = step1.oneLiner.trim().length > 0;

  // ─── 导航函数 ─────────────────────────────────────
  const goNext = useCallback(() => {
    if (currentStep === 1 && !canProceedStep1) {
      Alert.alert('提示', '请填写"一句话描述"后继续');
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, [currentStep, canProceedStep1]);

  const goBack = useCallback(() => {
    if (currentStep === 1) {
      router.back();
    } else {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // ─── 保存原始素材 ─────────────────────────────────
  const saveRawMaterials = useCallback(async () => {
    const sections: string[] = [];
    sections.push(`## 基本画像\n一句话描述：${step1.oneLiner}`);
    if (step1.catchphrases.trim()) sections.push(`口头禅：\n${step1.catchphrases}`);
    if (step1.hometown.trim()) sections.push(`籍贯/口音：${step1.hometown}`);
    if (step1.occupation.trim()) sections.push(`职业：${step1.occupation}`);
    if (step2.lifeStories.trim()) sections.push(`## 核心记忆\n${step2.lifeStories}`);
    if (step2.proudest.trim()) sections.push(`最骄傲的事：${step2.proudest}`);
    if (step2.biggestRegret.trim()) sections.push(`最大遗憾：${step2.biggestRegret}`);
    if (step3.chatLogs.trim()) sections.push(`## 聊天记录\n${step3.chatLogs}`);
    if (step3.otherMaterials.trim()) sections.push(`## 其他素材\n${step3.otherMaterials}`);

    const content = `---\nname: ${ancestor?.name || '长辈'}\ndescription: ${step1.oneLiner}\nmethod: raw-materials\n---\n\n${sections.join('\n\n')}`;

    if (id && updateAncestorSkill) {
      await updateAncestorSkill(id, content);
      Alert.alert('已保存', '原始素材已保存，配置 LLM 后可重新蒸馏。');
      router.back();
    }
  }, [step1, step2, step3, ancestor, id, updateAncestorSkill]);

  // ─── 开始蒸馏（进入步骤 4 时自动触发） ────────────
  const startDistill = useCallback(async () => {
    setDistillText('');
    setDistillDone(false);
    setNoLLMConfig(false);
    setIsDistilling(true);

    const config = await loadLLMConfig();
    if (!config) {
      setNoLLMConfig(true);
      setIsDistilling(false);
      return;
    }

    try {
      const result = await generateSkillFile({
        name: ancestor?.name || '长辈',
        relationship: ancestor?.relationship || undefined,
        oneLiner: step1.oneLiner.trim(),
        catchphrases: step1.catchphrases.trim() || undefined,
        hometown: step1.hometown.trim() || undefined,
        occupation: step1.occupation.trim() || undefined,
        lifeStories: step2.lifeStories.trim() || undefined,
        proudest: step2.proudest.trim() || undefined,
        biggestRegret: step2.biggestRegret.trim() || undefined,
        chatLogs: step3.chatLogs.trim() || undefined,
        otherMaterials: step3.otherMaterials.trim() || undefined,
        llmConfig: config,
        onProgress: (chunk) => {
          setDistillText((prev) => prev + chunk);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
        },
      });
      setDistillText(result);
      setDistillDone(true);
    } catch (err: any) {
      Alert.alert('铸魂失败', err?.message || '请检查 LLM 配置后重试', [
        { text: '保存原始素材', onPress: () => saveRawMaterials() },
        { text: '确定' },
      ]);
    } finally {
      setIsDistilling(false);
    }
  }, [ancestor, step1, step2, step3, saveRawMaterials]);

  // 进入步骤 4 时自动开始蒸馏
  const handleEnterStep4 = useCallback(() => {
    setCurrentStep(4);
    // 延迟一帧让 UI 切换完成
    setTimeout(() => startDistill(), 100);
  }, [startDistill]);

  /** 保存蒸馏后的 .skill 文件 */
  const saveSkill = useCallback(async () => {
    if (id && updateAncestorSkill && distillText) {
      await updateAncestorSkill(id, distillText);
      Alert.alert('已保存', '人格档案已生成并保存。', [
        {
          text: '查看',
          onPress: () => router.replace(`/ancestors/${id}/skill-preview` as any),
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

  // ─── 顶部导航 + 进度条 ────────────────────────────
  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable onPress={goBack} style={styles.backBtn} hitSlop={12}>
        <ChevronLeft color={Colors.ink} size={24} />
      </Pressable>
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { fontFamily: Fonts.classical }]}>
          {Labels.pageDistill} · {ancestor.name}的人格
        </Text>
        <Text style={styles.stepIndicator}>
          Step {currentStep}/{TOTAL_STEPS}
        </Text>
      </View>
      <View style={{ width: 36 }} />
    </View>
  );

  // 朱砂进度条
  const renderProgressBar = () => (
    <View style={styles.progressBarBg}>
      <View
        style={[
          styles.progressBarFill,
          { width: `${(currentStep / TOTAL_STEPS) * 100}%` },
        ]}
      />
    </View>
  );

  // ─── 步骤 1：基本画像 ─────────────────────────────
  if (currentStep === 1) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderProgressBar()}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.stepTitle}>基本画像</Text>

            {/* 一句话描述（必填） */}
            <Text style={styles.fieldLabel}>
              一句话形容 ta 是个什么样的人？
              <Text style={styles.requiredMark}> *</Text>
            </Text>
            <TextInput
              style={styles.singleInput}
              value={step1.oneLiner}
              onChangeText={(t) => setStep1((s) => ({ ...s, oneLiner: t }))}
              placeholder="比如：倔强但心软的老工程师"
              placeholderTextColor={Colors.inkMute}
            />

            {/* 口头禅 */}
            <Text style={styles.fieldLabel}>
              ta 最常说的口头禅或者话？（每行一个）
            </Text>
            <TextInput
              style={[styles.singleInput, { minHeight: 100 }]}
              value={step1.catchphrases}
              onChangeText={(t) => setStep1((s) => ({ ...s, catchphrases: t }))}
              placeholder={"做人要厚道\n吃亏是福\n..."}
              placeholderTextColor={Colors.inkMute}
              multiline
              textAlignVertical="top"
            />

            {/* 哪里人 */}
            <Text style={styles.fieldLabel}>
              ta 是哪里人？什么口音？
            </Text>
            <TextInput
              style={styles.singleInput}
              value={step1.hometown}
              onChangeText={(t) => setStep1((s) => ({ ...s, hometown: t }))}
              placeholder="比如：四川成都人，一口川普"
              placeholderTextColor={Colors.inkMute}
            />

            {/* 职业 */}
            <Text style={styles.fieldLabel}>
              ta 做什么工作 / 一辈子做什么？
            </Text>
            <TextInput
              style={styles.singleInput}
              value={step1.occupation}
              onChangeText={(t) => setStep1((s) => ({ ...s, occupation: t }))}
              placeholder="比如：乡村小学教师，教了一辈子数学"
              placeholderTextColor={Colors.inkMute}
            />

            {/* 下一步 */}
            <Pressable
              style={[styles.primaryBtn, !canProceedStep1 && styles.primaryBtnDisabled]}
              onPress={goNext}
              disabled={!canProceedStep1}
            >
              <Text style={styles.primaryBtnText}>下一步</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── 步骤 2：核心记忆 ─────────────────────────────
  if (currentStep === 2) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderProgressBar()}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.stepTitle}>核心记忆</Text>

            {/* 重要经历 */}
            <Text style={styles.fieldLabel}>
              说说 ta 这辈子最重要的几件事
            </Text>
            <Text style={styles.fieldHint}>
              每段一个故事，有多少写多少，跳过也行
            </Text>
            <TextInput
              style={styles.bigTextInput}
              value={step2.lifeStories}
              onChangeText={(t) => setStep2((s) => ({ ...s, lifeStories: t }))}
              placeholder={"年轻时下乡插队三年...\n\n后来进了厂里当车工...\n\n退休后每天去公园下棋..."}
              placeholderTextColor={Colors.inkMute}
              multiline
              textAlignVertical="top"
            />

            {/* 最骄傲的事 */}
            <Text style={styles.fieldLabel}>ta 最骄傲的事？</Text>
            <TextInput
              style={styles.singleInput}
              value={step2.proudest}
              onChangeText={(t) => setStep2((s) => ({ ...s, proudest: t }))}
              placeholder="比如：供三个孩子都上了大学"
              placeholderTextColor={Colors.inkMute}
            />

            {/* 最大遗憾 */}
            <Text style={styles.fieldLabel}>ta 最大的遗憾？</Text>
            <TextInput
              style={styles.singleInput}
              value={step2.biggestRegret}
              onChangeText={(t) => setStep2((s) => ({ ...s, biggestRegret: t }))}
              placeholder="比如：没来得及回老家看最后一眼"
              placeholderTextColor={Colors.inkMute}
            />

            {/* 按钮组 */}
            <View style={styles.btnRow}>
              <Pressable style={styles.skipBtn} onPress={goNext}>
                <Text style={styles.skipBtnText}>跳过</Text>
              </Pressable>
              <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={goNext}>
                <Text style={styles.primaryBtnText}>下一步</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── 步骤 3：素材补充 ─────────────────────────────
  if (currentStep === 3) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderProgressBar()}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.stepTitle}>素材补充</Text>

            {/* 聊天记录 */}
            <Text style={styles.fieldLabel}>
              如果你有聊天记录，粘贴在这里：
            </Text>
            <TextInput
              style={styles.bigTextInput}
              value={step3.chatLogs}
              onChangeText={(t) => setStep3((s) => ({ ...s, chatLogs: t }))}
              placeholder="粘贴微信/QQ 聊天记录导出文本..."
              placeholderTextColor={Colors.inkMute}
              multiline
              textAlignVertical="top"
            />

            {/* 其他素材 */}
            <Text style={styles.fieldLabel}>
              其他补充（信件、日记、别人的评价...）：
            </Text>
            <TextInput
              style={styles.bigTextInput}
              value={step3.otherMaterials}
              onChangeText={(t) => setStep3((s) => ({ ...s, otherMaterials: t }))}
              placeholder="任何能帮助还原 ta 的素材..."
              placeholderTextColor={Colors.inkMute}
              multiline
              textAlignVertical="top"
            />

            {/* 按钮组 */}
            <View style={styles.btnRow}>
              <Pressable style={styles.skipBtn} onPress={handleEnterStep4}>
                <Text style={styles.skipBtnText}>跳过</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, { flex: 1 }]}
                onPress={handleEnterStep4}
              >
                <Text style={styles.primaryBtnText}>{Labels.btnStartDistill}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── 步骤 4：蒸馏中 + 结果 ────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderProgressBar()}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
      >
        {/* 未配置 LLM 提示 */}
        {noLLMConfig && (
          <View style={styles.noLLMBox}>
            <Settings color={Colors.vermilion} size={28} />
            <Text style={styles.noLLMTitle}>需要配置大模型 API</Text>
            <Text style={styles.noLLMDesc}>
              铸魂需要调用大模型。{'\n'}
              推荐 DeepSeek（便宜好用）
            </Text>
            <View style={styles.noLLMSteps}>
              <Text style={styles.noLLMStepText}>1. 去 platform.deepseek.com 注册账号</Text>
              <Text style={styles.noLLMStepText}>2. 获取 API Key</Text>
              <Text style={styles.noLLMStepText}>3. 回来填入设置</Text>
            </View>
            <View style={styles.btnRow}>
              <Pressable
                style={styles.skipBtn}
                onPress={saveRawMaterials}
              >
                <Save color={Colors.inkLight} size={16} />
                <Text style={styles.skipBtnText}>保存原始素材</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, { flex: 1 }]}
                onPress={() => router.push('/settings/llm' as any)}
              >
                <Text style={styles.primaryBtnText}>去设置</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 蒸馏中 */}
        {!noLLMConfig && (
          <>
            <Text style={styles.stepTitle}>
              {isDistilling
                ? '正在铸魂...'
                : distillDone
                  ? '铸魂完成'
                  : '准备铸魂'}
            </Text>

            {isDistilling && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Colors.vermilion} size="small" />
                <Text style={styles.loadingText}>
                  铸魂中，以文字铸就不朽之魂...
                </Text>
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

            {/* 蒸馏完成 → 保存按钮 */}
            {distillDone && (
              <Pressable style={styles.primaryBtn} onPress={saveSkill}>
                <Text style={styles.primaryBtnText}>保存人格档案</Text>
              </Pressable>
            )}
          </>
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

  // ─── 顶部导航 ───────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.ink,
    fontSize: 17,
    fontWeight: '600',
  },
  stepIndicator: {
    color: Colors.inkMute,
    fontSize: 13,
    marginTop: 2,
  },

  // ─── 进度条 ─────────────────────────────────
  progressBarBg: {
    height: 3,
    backgroundColor: Colors.divider,
  },
  progressBarFill: {
    height: 3,
    backgroundColor: Colors.vermilion,
  },

  // ─── 滚动内容 ───────────────────────────────
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 20,
    paddingBottom: 40,
  },

  // ─── 步骤标题 ───────────────────────────────
  stepTitle: {
    color: Colors.ink,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },

  // ─── 表单字段 ───────────────────────────────
  fieldLabel: {
    color: Colors.ink,
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  requiredMark: {
    color: Colors.vermilion,
    fontSize: 17,
  },
  fieldHint: {
    color: Colors.inkLight,
    fontSize: 14,
    marginBottom: 8,
  },
  singleInput: {
    backgroundColor: Colors.paperDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    fontSize: 15,
    color: Colors.ink,
    lineHeight: 22,
  },
  bigTextInput: {
    backgroundColor: Colors.paperDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    fontSize: 15,
    color: Colors.ink,
    lineHeight: 22,
    minHeight: 200,
  },

  // ─── 按钮 ───────────────────────────────────
  primaryBtn: {
    height: 52,
    backgroundColor: Colors.vermilion,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.inkMute,
  },
  primaryBtnText: {
    color: Colors.paper,
    fontSize: 17,
    fontWeight: '600',
  },
  skipBtn: {
    height: 52,
    paddingHorizontal: 24,
    backgroundColor: Colors.paperDark,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: Colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  skipBtnText: {
    color: Colors.inkLight,
    fontSize: 15,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },

  // ─── 蒸馏阶段 ───────────────────────────────
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

  // ─── 未配置 LLM 提示 ───────────────────────
  noLLMBox: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  noLLMTitle: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  noLLMDesc: {
    color: Colors.inkLight,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  noLLMSteps: {
    alignSelf: 'stretch',
    backgroundColor: Colors.paper,
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  noLLMStepText: {
    color: Colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },

  // ─── 其他 ───────────────────────────────────
  errorText: {
    color: Colors.crimson,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 60,
  },
});
