/**
 * 长辈状态管理 — Zustand Store
 * 管理长辈列表的加载、新增、删除
 * Web 端降级为内存模式（无 SQLite）
 */

import { create } from 'zustand';
import { Platform } from 'react-native';

// Web 端不导入 SQLite 相关模块，避免 wasm 报错
const isNative = Platform.OS !== 'web';

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
  }) => Promise<string>;
  removeAncestor: (id: string) => Promise<void>;
  /** 更新长辈的 .skill 人格档案内容 */
  updateAncestorSkill: (id: string, skillContent: string) => Promise<void>;
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
        // Web 端：用内存数据
        set({ isLoading: false });
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
        parent_id: null,
        spouse_id: null,
        generation: 1,
        created_at: now,
        updated_at: now,
      };
      set({ ancestors: [...get().ancestors, newAncestor] });
      return id;
    }
  },

  removeAncestor: async (id) => {
    if (isNative) {
      const { deleteAncestor } = await import('../db/queries/ancestors');
      await deleteAncestor(id);
      await get().loadAncestors();
    } else {
      set({ ancestors: get().ancestors.filter(a => a.id !== id) });
    }
  },

  updateAncestorSkill: async (id, skillContent) => {
    if (isNative) {
      const { updateAncestor } = await import('../db/queries/ancestors');
      await updateAncestor(id, { skill_content: skillContent });
      await get().loadAncestors();
    } else {
      // Web 端：直接更新内存
      set({
        ancestors: get().ancestors.map((a) =>
          a.id === id
            ? { ...a, skill_content: skillContent, updated_at: new Date().toISOString() }
            : a
        ),
      });
    }
  },
}));
