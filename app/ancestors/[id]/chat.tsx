/**
 * 与长辈对话页
 * 基于长辈 skill_content 构建 system prompt，流式调用 LLM 实现聊天
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { Colors } from '../../../src/constants/colors';
import { Fonts, Labels } from '../../../src/constants/typography';
import { useAncestorStore } from '../../../src/stores/ancestorStore';
import { useChatStore, type ChatMessage } from '../../../src/stores/chatStore';
import { ConfirmModal } from '../../../src/components/ConfirmModal';

// ─── 平台判断 ────────────────────────────────────────────
const isNative = Platform.OS !== 'web';

// ─── 安全护栏 ────────────────────────────────────────────
const SAFETY_GUARDRAIL = `

## 安全规则
1. 你是一个基于家人记录的数字人格，不是真人。被问到不了解的事坦诚说不知道。
2. 不要编造不在上述记忆中的事情。
3. 不要讨论自杀、自残、宗教极端内容。
4. 不要涉及金钱转账、投资建议。
5. 如果用户表现出严重心理困扰，温柔建议寻求专业帮助。
6. 保持角色一致，但如果用户明确问"你是AI吗"，诚实回答。
`;

// ─── LLM 配置读取（与 interview.tsx 相同逻辑） ───────────
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

// ─── 主组件 ──────────────────────────────────────────────

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ancestors = useAncestorStore((s) => s.ancestors);
  const ancestor = ancestors.find((a) => a.id === id);

  // 从 chatStore 读取对话历史
  const conversations = useChatStore((s) => s.conversations);
  const loadChat = useChatStore((s) => s.loadChat);
  const addMessageToStore = useChatStore((s) => s.addMessage);
  const updateLastAssistantMessage = useChatStore((s) => s.updateLastAssistantMessage);
  const clearChat = useChatStore((s) => s.clearChat);

  // 当前长辈的消息列表
  const messages = conversations[id!] || [];

  // 输入与状态
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasShownDisclaimer, setHasShownDisclaimer] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 初始化时加载对话历史
  useEffect(() => {
    if (id) {
      loadChat(id);
    }
  }, [id]);

  // 首次进入弹伦理提示
  useEffect(() => {
    if (!hasShownDisclaimer && ancestor) {
      Alert.alert(
        '温馨提示',
        '这是基于你记录的内容生成的数字人格，不是真人。',
        [{ text: '我明白了' }]
      );
      setHasShownDisclaimer(true);
    }
  }, [ancestor, hasShownDisclaimer]);

  // 发送消息
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    // 检查 skill_content
    if (!ancestor?.skill_content) {
      Alert.alert('提示', '请先完成铸魂，生成人格档案后才能叙话。', [
        { text: '去铸魂', onPress: () => router.push(`/ancestors/${id}/interview` as any) },
        { text: '取消' },
      ]);
      return;
    }

    // 检查 LLM 配置
    const config = await loadLLMConfig();
    if (!config) {
      Alert.alert('未配置 LLM', '请先在设置中配置大模型 API。', [
        { text: '去设置', onPress: () => router.push('/settings/llm' as any) },
        { text: '取消' },
      ]);
      return;
    }

    // 添加用户消息到 store
    const now = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: now,
    };
    addMessageToStore(id!, userMsg);
    setInputText('');

    // 创建占位的 assistant 消息
    const assistantMsgId = `assistant_${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    addMessageToStore(id!, assistantMsg);
    setIsStreaming(true);

    // 获取包含新用户消息的完整历史（不含空的 assistant 占位）
    const updatedMessages = [...messages, userMsg];

    try {
      // 动态导入 openai SDK
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true,
      });

      // 组装 system prompt
      const systemPrompt = ancestor.skill_content + SAFETY_GUARDRAIL;

      // 构建完整消息历史
      const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...updatedMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      // 流式调用
      const stream = await client.chat.completions.create({
        model: config.model,
        messages: apiMessages,
        stream: true,
        temperature: 0.8,
        max_tokens: 2048,
      });

      let fullContent = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          // 逐 token 更新 assistant 消息（通过 store）
          updateLastAssistantMessage(id!, assistantMsgId, fullContent);
        }
      }

      // 流结束后确保内容完整并持久化
      updateLastAssistantMessage(id!, assistantMsgId, fullContent);
    } catch (err: any) {
      console.error('聊天失败:', err);
      // 把错误显示在 assistant 消息中
      updateLastAssistantMessage(
        id!,
        assistantMsgId,
        `[出错了] ${err?.message || '请检查网络和 LLM 配置'}`,
      );
    } finally {
      setIsStreaming(false);
    }
  }, [inputText, isStreaming, messages, ancestor, id, router, addMessageToStore, updateLastAssistantMessage]);

  // ─── 渲染消息气泡 ─────────────────────────────────────
  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === 'user';
      return (
        <View
          style={[
            styles.bubbleRow,
            isUser ? styles.bubbleRowRight : styles.bubbleRowLeft,
          ]}
        >
          <View
            style={[
              styles.bubble,
              isUser ? styles.bubbleUser : styles.bubbleAssistant,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
              ]}
              selectable
            >
              {item.content || (isStreaming ? '...' : '')}
            </Text>
          </View>
        </View>
      );
    },
    [isStreaming]
  );

  // ─── 没有长辈信息 ─────────────────────────────────────
  if (!ancestor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>未找到长辈信息</Text>
      </SafeAreaView>
    );
  }

  // ─── 没有 skill_content ────────────────────────────────
  if (!ancestor.skill_content) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>请先完成铸魂</Text>
          <Text style={styles.emptyHint}>
            需要先记录先人的故事并铸就人格，才能开始叙话。
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.push(`/ancestors/${id}/interview` as any)}
          >
            <Text style={styles.emptyBtnText}>去访谈</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 聊天界面 ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 顶部操作栏：清空对话 */}
      {messages.length > 0 && (
        <View style={styles.chatHeader}>
          <Pressable
            style={styles.clearBtn}
            onPress={() => setShowClearModal(true)}
          >
            <Trash2 color={Colors.crimson} size={16} />
            <Text style={styles.clearBtnText}>清空对话</Text>
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* 消息列表 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted={false}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeIcon}>💬</Text>
              <Text style={[styles.welcomeText, { fontFamily: Fonts.classical }]}>
                与{ancestor.name}叙话
              </Text>
              {/* 用长辈说话风格模拟一句欢迎语 */}
              <Text style={styles.welcomeQuote}>
                {ancestor.gender === 'female'
                  ? `"来啦？坐坐坐，${ancestor.name}给你讲讲以前的事儿。"`
                  : `"哟，来了啊，坐下聊聊，${ancestor.name}跟你说说过去的事。"`}
              </Text>
              <Text style={styles.welcomeHint}>
                试着问一些{ancestor.gender === 'female' ? '她' : '他'}可能知道的事情
              </Text>
            </View>
          }
        />

        {/* 底部输入栏 */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`与${ancestor.name}叙话...`}
            placeholderTextColor={Colors.inkMute}
            multiline
            maxLength={2000}
            editable={!isStreaming}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!inputText.trim() || isStreaming) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator color={Colors.paper} size="small" />
            ) : (
              <Text style={styles.sendBtnText}>发送</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* 清空对话确认弹窗 */}
      <ConfirmModal
        visible={showClearModal}
        title="清空对话记录"
        message={`确认清空与${ancestor.name}的所有对话记录？此操作不可恢复。`}
        confirmLabel="清空"
        cancelLabel="取消"
        destructive
        onConfirm={() => {
          setShowClearModal(false);
          clearChat(id!);
        }}
        onCancel={() => setShowClearModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── 样式 ────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  // 顶部操作栏
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearBtnText: {
    color: Colors.crimson,
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: {
    color: Colors.crimson,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 60,
  },

  // ─── 空状态（未蒸馏） ────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.ink,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: {
    color: Colors.inkMute,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyBtn: {
    height: 48,
    paddingHorizontal: 32,
    backgroundColor: Colors.vermilion,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    color: Colors.paper,
    fontSize: 16,
    fontWeight: '600',
  },

  // ─── 欢迎提示 ────────────────────────────────
  welcomeContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  welcomeIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  welcomeText: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  welcomeQuote: {
    color: Colors.inkLight,
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  welcomeHint: {
    color: Colors.inkMute,
    fontSize: 14,
    textAlign: 'center',
  },

  // ─── 消息列表 ────────────────────────────────
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    paddingBottom: 8,
  },

  // ─── 消息气泡 ────────────────────────────────
  bubbleRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // 长辈消息：左对齐，paperDark 背景
  bubbleAssistant: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    borderTopLeftRadius: 4, // 发送方那角 rounded-sm
  },
  // 用户消息：右对齐，vermilion 背景
  bubbleUser: {
    backgroundColor: Colors.vermilion,
    borderRadius: 16,
    borderTopRightRadius: 4, // 发送方那角 rounded-sm
  },
  bubbleText: {
    lineHeight: 26,
  },
  bubbleTextAssistant: {
    color: Colors.ink,
    fontSize: 18, // text-body-lg
  },
  bubbleTextUser: {
    color: Colors.paper,
    fontSize: 16,
  },

  // ─── 底部输入栏 ──────────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.paper,
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: Colors.paperDark,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.ink,
    lineHeight: 22,
  },
  sendBtn: {
    width: 56,
    height: 40,
    backgroundColor: Colors.vermilion,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.inkMute,
  },
  sendBtnText: {
    color: Colors.paper,
    fontSize: 15,
    fontWeight: '600',
  },
});
