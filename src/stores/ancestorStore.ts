/**
 * 长辈状态管理 — Zustand Store
 * 管理长辈列表的加载、新增、删除
 */

import { create } from 'zustand';
import { getAllAncestors, createAncestor, deleteAncestor } from '../db/queries/ancestors';
import type { Ancestor } from '../db/queries/ancestors';

interface AncestorStore {
  /** 长辈列表 */
  ancestors: Ancestor[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 从数据库加载所有长辈 */
  loadAncestors: () => Promise<void>;
  /** 新增长辈，返回新建记录的 ID */
  addAncestor: (data: {
    name: string;
    relationship?: string;
    gender?: string;
    birthYear?: number;
    deathYear?: number;
    deathDate?: string;
  }) => Promise<string>;
  /** 删除长辈 */
  removeAncestor: (id: string) => Promise<void>;
}

export const useAncestorStore = create<AncestorStore>((set, get) => ({
  ancestors: [],
  isLoading: false,

  loadAncestors: async () => {
    set({ isLoading: true });
    try {
      const ancestors = await getAllAncestors();
      set({ ancestors, isLoading: false });
    } catch (e) {
      console.error('加载长辈列表失败:', e);
      set({ isLoading: false });
    }
  },

  addAncestor: async (data) => {
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
  },

  removeAncestor: async (id) => {
    await deleteAncestor(id);
    await get().loadAncestors();
  },
}));
