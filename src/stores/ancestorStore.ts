/**
 * 长辈状态管理 — Zustand Store
 * 管理长辈列表的加载、新增、删除
 * Native 端持久化到 SQLite；Web 端持久化到 localStorage（避免刷新丢数据）
 */

import { create } from 'zustand';
import { Platform } from 'react-native';

// Web 端不导入 SQLite 相关模块，避免 wasm 报错
const isNative = Platform.OS !== 'web';

// Web 端 localStorage key；版本号用于未来迁移
const WEB_STORAGE_KEY = 'guichu_ancestors_v1';

/** Web 端：把当前长辈列表写入 localStorage（私密数据，仅本机存储） */
function saveWebAncestors(ancestors: Ancestor[]) {
  if (isNative) return;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(ancestors));
  } catch (e) {
    // 超出配额或隐私模式下可能抛异常，不阻断流程
    console.warn('Web 端长辈数据持久化失败:', e);
  }
}

/** Web 端：从 localStorage 读取长辈列表 */
function loadWebAncestors(): Ancestor[] {
  if (isNative) return [];
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(WEB_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Ancestor[]) : [];
  } catch (e) {
    console.warn('Web 端长辈数据读取失败:', e);
    return [];
  }
}

interface Ancestor {
  id: string;
  name: string;
  relationship: string | null;
  gender: 'male' | 'female' | 'other' | null;
  birth_year: number | null;
  birth_date: string | null;
  death_year: number | null;
  death_date: string | null;
  avatar_path: string | null;
  skill_content: string | null;
  voice_id: string | null;
  voice_engine: string | null;
  honor: string | null;
  parent_id: string | null;
  spouse_id: string | null;
  generation: number;
  created_at: string;
  updated_at: string;
}

export type { Ancestor };

interface AncestorStore {
  ancestors: Ancestor[];
  isLoading: boolean;
  loadAncestors: () => Promise<void>;
  addAncestor: (data: {
    name: string;
    relationship?: string;
    gender?: string;
    birthYear?: number;
    deathYear?: number;
    deathDate?: string;
    honor?: string;
  }) => Promise<string>;
  removeAncestor: (id: string) => Promise<void>;
  /** 更新长辈的 .skill 人格档案内容 */
  updateAncestorSkill: (id: string, skillContent: string) => Promise<void>;
  /** 更新长辈的克隆音色（训练成功后回填） */
  updateAncestorVoice: (
    id: string,
    voiceEngine: string,
    voiceId: string,
  ) => Promise<void>;
  /** 更新长辈基本资料 */
  updateAncestorInfo: (id: string, data: {
    name?: string;
    relationship?: string;
    gender?: string;
    birthYear?: number;
    deathYear?: number;
    deathDate?: string;
    honor?: string;
    avatarPath?: string;
  }) => Promise<void>;
}

export const useAncestorStore = create<AncestorStore>((set, get) => ({
  ancestors: [],
  isLoading: false,

  loadAncestors: async () => {
    set({ isLoading: true });
    try {
      if (isNative) {
        const { getAllAncestors } = await import('../db/queries/ancestors');
        const ancestors = await getAllAncestors();
        set({ ancestors: ancestors as Ancestor[], isLoading: false });
      } else {
        // Web 端：从 localStorage 恢复
        set({ ancestors: loadWebAncestors(), isLoading: false });
      }
    } catch (e) {
      console.error('加载长辈列表失败:', e);
      set({ isLoading: false });
    }
  },

  addAncestor: async (data) => {
    if (isNative) {
      const { createAncestor } = await import('../db/queries/ancestors');
      const id = await createAncestor({
        name: data.name,
        generation: 1,
        relationship: data.relationship,
        gender: (data.gender as 'male' | 'female' | 'other') ?? undefined,
        birth_year: data.birthYear,
        death_year: data.deathYear,
        death_date: data.deathDate,
      });
      await get().loadAncestors();
      return id;
    } else {
      // Web 端：模拟添加
      const id = `web_${Date.now()}`;
      const now = new Date().toISOString();
      const newAncestor: Ancestor = {
        id,
        name: data.name,
        relationship: data.relationship ?? null,
        gender: (data.gender as 'male' | 'female' | 'other') ?? null,
        birth_year: data.birthYear ?? null,
        birth_date: null,
        death_year: data.deathYear ?? null,
        death_date: data.deathDate ?? null,
        avatar_path: null,
        skill_content: null,
        voice_id: null,
        voice_engine: null,
        honor: data.honor ?? null,
        parent_id: null,
        spouse_id: null,
        generation: 1,
        created_at: now,
        updated_at: now,
      };
      const next = [...get().ancestors, newAncestor];
      set({ ancestors: next });
      saveWebAncestors(next);
      return id;
    }
  },

  removeAncestor: async (id) => {
    if (isNative) {
      const { deleteAncestor } = await import('../db/queries/ancestors');
      await deleteAncestor(id);
      await get().loadAncestors();
    } else {
      const next = get().ancestors.filter(a => a.id !== id);
      set({ ancestors: next });
      saveWebAncestors(next);
    }
  },

  updateAncestorSkill: async (id, skillContent) => {
    if (isNative) {
      const { updateAncestor } = await import('../db/queries/ancestors');
      await updateAncestor(id, { skill_content: skillContent });
      await get().loadAncestors();
    } else {
      // Web 端：直接更新内存 + localStorage
      const next = get().ancestors.map((a) =>
        a.id === id
          ? { ...a, skill_content: skillContent, updated_at: new Date().toISOString() }
          : a
      );
      set({ ancestors: next });
      saveWebAncestors(next);
    }
  },

  updateAncestorVoice: async (id, voiceEngine, voiceId) => {
    const now = new Date().toISOString();
    if (isNative) {
      const { updateAncestor } = await import('../db/queries/ancestors');
      await updateAncestor(id, {
        voice_id: voiceId,
        voice_engine: voiceEngine,
      });
      await get().loadAncestors();
    } else {
      const next = get().ancestors.map((a) =>
        a.id === id
          ? { ...a, voice_id: voiceId, voice_engine: voiceEngine, updated_at: now }
          : a,
      );
      set({ ancestors: next });
      saveWebAncestors(next);
    }
  },

  updateAncestorInfo: async (id, data) => {
    const now = new Date().toISOString();
    if (isNative) {
      const { updateAncestor } = await import('../db/queries/ancestors');
      await updateAncestor(id, {
        name: data.name,
        relationship: data.relationship,
        gender: data.gender as 'male' | 'female' | 'other' | undefined,
        birth_year: data.birthYear,
        death_year: data.deathYear,
        death_date: data.deathDate,
        avatar_path: data.avatarPath,
      });
      // honor 字段在内存中更新（DB schema 暂未包含此字段）
      if (data.honor !== undefined) {
        set({
          ancestors: get().ancestors.map((a) =>
            a.id === id ? { ...a, honor: data.honor ?? null } : a
          ),
        });
      }
      await get().loadAncestors();
    } else {
      // Web 端：直接更新内存 + localStorage
      const next = get().ancestors.map((a) =>
        a.id === id
          ? {
              ...a,
              ...(data.name !== undefined && { name: data.name }),
              ...(data.relationship !== undefined && { relationship: data.relationship }),
              ...(data.gender !== undefined && { gender: data.gender as 'male' | 'female' | 'other' }),
              ...(data.birthYear !== undefined && { birth_year: data.birthYear }),
              ...(data.deathYear !== undefined && { death_year: data.deathYear }),
              ...(data.deathDate !== undefined && { death_date: data.deathDate }),
              ...(data.honor !== undefined && { honor: data.honor }),
              ...(data.avatarPath !== undefined && { avatar_path: data.avatarPath }),
              updated_at: now,
            }
          : a
      );
      set({ ancestors: next });
      saveWebAncestors(next);
    }
  },
}));
