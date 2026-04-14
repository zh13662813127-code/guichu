/**
 * 对话历史持久化 Store
 * Web 端使用 localStorage，Native 端使用 MMKV
 * 按 ancestorId 分别存储对话记录
 */

import { create } from 'zustand';
import { Platform } from 'react-native';

const isNative = Platform.OS !== 'web';

// ─── 存储 key 前缀 ──────────────────────────────────────
const CHAT_KEY_PREFIX = 'chat_history_';

/** 对话消息类型 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ChatStore {
  /** 按 ancestorId 存储的对话列表 */
  conversations: Record<string, ChatMessage[]>;
  /** 加载某长辈的对话历史 */
  loadChat: (ancestorId: string) => void;
  /** 添加一条消息并自动持久化 */
  addMessage: (ancestorId: string, msg: ChatMessage) => void;
  /** 更新最后一条 assistant 消息（流式输出场景） */
  updateLastAssistantMessage: (ancestorId: string, msgId: string, content: string) => void;
  /** 清空某长辈的对话 */
  clearChat: (ancestorId: string) => void;
}

// ─── 持久化读写辅助 ──────────────────────────────────────

/** 获取 MMKV 实例（Native 端，懒初始化） */
let _mmkv: any = null;
async function getMMKV() {
  if (!_mmkv) {
    const { MMKV } = await import('react-native-mmkv');
    _mmkv = new MMKV();
  }
  return _mmkv;
}

/** 从持久化存储读取对话 */
function loadFromStorage(ancestorId: string): ChatMessage[] {
  const key = CHAT_KEY_PREFIX + ancestorId;
  try {
    if (!isNative) {
      // Web 端：localStorage
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
    // Native 端在 loadChatNative 中异步处理
  } catch (e) {
    console.warn('读取对话历史失败:', e);
  }
  return [];
}

/** Native 端异步读取对话 */
async function loadFromStorageNative(ancestorId: string): Promise<ChatMessage[]> {
  const key = CHAT_KEY_PREFIX + ancestorId;
  try {
    const mmkv = await getMMKV();
    const raw = mmkv.getString(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('读取对话历史失败:', e);
  }
  return [];
}

/** 保存对话到持久化存储 */
function saveToStorage(ancestorId: string, messages: ChatMessage[]): void {
  const key = CHAT_KEY_PREFIX + ancestorId;
  const json = JSON.stringify(messages);
  try {
    if (!isNative) {
      localStorage.setItem(key, json);
    } else {
      // Native 端：异步保存
      getMMKV().then((mmkv: any) => mmkv.set(key, json)).catch(console.warn);
    }
  } catch (e) {
    console.warn('保存对话历史失败:', e);
  }
}

/** 删除持久化对话 */
function removeFromStorage(ancestorId: string): void {
  const key = CHAT_KEY_PREFIX + ancestorId;
  try {
    if (!isNative) {
      localStorage.removeItem(key);
    } else {
      getMMKV().then((mmkv: any) => mmkv.delete(key)).catch(console.warn);
    }
  } catch (e) {
    console.warn('删除对话历史失败:', e);
  }
}

// ─── Zustand Store ───────────────────────────────────────

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: {},

  loadChat: (ancestorId: string) => {
    if (isNative) {
      // Native 端：异步加载
      loadFromStorageNative(ancestorId).then((messages) => {
        set((state) => ({
          conversations: {
            ...state.conversations,
            [ancestorId]: messages,
          },
        }));
      });
    } else {
      // Web 端：同步加载
      const messages = loadFromStorage(ancestorId);
      set((state) => ({
        conversations: {
          ...state.conversations,
          [ancestorId]: messages,
        },
      }));
    }
  },

  addMessage: (ancestorId: string, msg: ChatMessage) => {
    const current = get().conversations[ancestorId] || [];
    const updated = [...current, msg];
    set((state) => ({
      conversations: {
        ...state.conversations,
        [ancestorId]: updated,
      },
    }));
    // 自动持久化
    saveToStorage(ancestorId, updated);
  },

  updateLastAssistantMessage: (ancestorId: string, msgId: string, content: string) => {
    const current = get().conversations[ancestorId] || [];
    const updated = current.map((m) =>
      m.id === msgId ? { ...m, content } : m,
    );
    set((state) => ({
      conversations: {
        ...state.conversations,
        [ancestorId]: updated,
      },
    }));
    // 流式输出结束后再持久化（调用方在流结束时调用一次即可）
    // 这里也自动保存，保证最新内容被持久化
    saveToStorage(ancestorId, updated);
  },

  clearChat: (ancestorId: string) => {
    set((state) => ({
      conversations: {
        ...state.conversations,
        [ancestorId]: [],
      },
    }));
    removeFromStorage(ancestorId);
  },
}));
