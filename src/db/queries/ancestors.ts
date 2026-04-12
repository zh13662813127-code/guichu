/**
 * ancestors 表的 CRUD 操作
 */

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getDatabase } from '../database';

// ─── 类型定义 ───────────────────────────────────────────

/** 创建长辈的输入 schema */
export const CreateAncestorSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  relationship: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  birth_year: z.number().int().optional(),
  birth_date: z.string().optional(),
  death_year: z.number().int().optional(),
  death_date: z.string().optional(),
  avatar_path: z.string().optional(),
  skill_content: z.string().optional(),
  voice_id: z.string().optional(),
  voice_engine: z.string().optional(),
  parent_id: z.string().optional(),
  spouse_id: z.string().optional(),
  generation: z.number().int().default(0),
});

export type CreateAncestorInput = z.infer<typeof CreateAncestorSchema>;

/** 数据库中的长辈记录 */
export interface Ancestor {
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

// ─── CRUD 操作 ──────────────────────────────────────────

/**
 * 创建长辈记录
 * @returns 新建记录的 ID
 */
export async function createAncestor(data: CreateAncestorInput): Promise<string> {
  const validated = CreateAncestorSchema.parse(data);
  const db = await getDatabase();
  const id = nanoid();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO ancestors (
      id, name, relationship, gender,
      birth_year, birth_date, death_year, death_date,
      avatar_path, skill_content, voice_id, voice_engine,
      parent_id, spouse_id, generation,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    validated.name,
    validated.relationship ?? null,
    validated.gender ?? null,
    validated.birth_year ?? null,
    validated.birth_date ?? null,
    validated.death_year ?? null,
    validated.death_date ?? null,
    validated.avatar_path ?? null,
    validated.skill_content ?? null,
    validated.voice_id ?? null,
    validated.voice_engine ?? null,
    validated.parent_id ?? null,
    validated.spouse_id ?? null,
    validated.generation,
    now,
    now
  );

  return id;
}

/**
 * 根据 ID 获取长辈记录
 */
export async function getAncestor(id: string): Promise<Ancestor | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Ancestor>(
    'SELECT * FROM ancestors WHERE id = ?',
    id
  );
  return row ?? null;
}

/**
 * 获取所有长辈记录，按 generation 排序
 */
export async function getAllAncestors(): Promise<Ancestor[]> {
  const db = await getDatabase();
  return db.getAllAsync<Ancestor>(
    'SELECT * FROM ancestors ORDER BY generation ASC, created_at ASC'
  );
}

/**
 * 更新长辈记录
 */
export async function updateAncestor(
  id: string,
  data: Partial<CreateAncestorInput>
): Promise<void> {
  const db = await getDatabase();

  // 动态构建 SET 子句，只更新传入的字段
  const fields: string[] = [];
  const values: unknown[] = [];

  const fieldMap: Record<string, unknown> = {
    name: data.name,
    relationship: data.relationship,
    gender: data.gender,
    birth_year: data.birth_year,
    birth_date: data.birth_date,
    death_year: data.death_year,
    death_date: data.death_date,
    avatar_path: data.avatar_path,
    skill_content: data.skill_content,
    voice_id: data.voice_id,
    voice_engine: data.voice_engine,
    parent_id: data.parent_id,
    spouse_id: data.spouse_id,
    generation: data.generation,
  };

  for (const [key, value] of Object.entries(fieldMap)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return;

  // 始终更新 updated_at
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  await db.runAsync(
    `UPDATE ancestors SET ${fields.join(', ')} WHERE id = ?`,
    ...(values as (string | number | null)[])
  );
}

/**
 * 删除长辈记录
 * 注意：关联的 grave_locations、interviews、conversations、ritual_reminders
 * 会因 ON DELETE CASCADE 自动删除
 */
export async function deleteAncestor(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM ancestors WHERE id = ?', id);
}
