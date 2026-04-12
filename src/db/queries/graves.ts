/**
 * grave_locations 表的 CRUD 操作
 */

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getDatabase } from '../database';

// ─── 类型定义 ───────────────────────────────────────────

/** 创建墓地位置的输入 schema */
export const CreateGraveSchema = z.object({
  ancestor_id: z.string().min(1, '必须关联一位长辈'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_meters: z.number().optional(),
  altitude: z.number().optional(),
  address_hint: z.string().optional(),
  photo_paths: z.string().optional(),
  audio_note_path: z.string().optional(),
  recorded_at: z.string().optional(),
});

export type CreateGraveInput = z.infer<typeof CreateGraveSchema>;

/** 数据库中的墓地位置记录 */
export interface GraveLocation {
  id: string;
  ancestor_id: string | null;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  altitude: number | null;
  address_hint: string | null;
  photo_paths: string | null;
  audio_note_path: string | null;
  recorded_at: string;
  created_at: string;
}

// ─── CRUD 操作 ──────────────────────────────────────────

/**
 * 创建墓地位置记录
 * @returns 新建记录的 ID
 */
export async function createGraveLocation(data: CreateGraveInput): Promise<string> {
  const validated = CreateGraveSchema.parse(data);
  const db = await getDatabase();
  const id = nanoid();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO grave_locations (
      id, ancestor_id, latitude, longitude,
      accuracy_meters, altitude, address_hint,
      photo_paths, audio_note_path,
      recorded_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    validated.ancestor_id,
    validated.latitude,
    validated.longitude,
    validated.accuracy_meters ?? null,
    validated.altitude ?? null,
    validated.address_hint ?? null,
    validated.photo_paths ?? null,
    validated.audio_note_path ?? null,
    validated.recorded_at ?? now,
    now
  );

  return id;
}

/**
 * 根据长辈 ID 获取墓地位置
 * 一位长辈通常只有一个墓地，返回最新记录
 */
export async function getGraveByAncestorId(
  ancestorId: string
): Promise<GraveLocation | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<GraveLocation>(
    'SELECT * FROM grave_locations WHERE ancestor_id = ? ORDER BY created_at DESC LIMIT 1',
    ancestorId
  );
  return row ?? null;
}

/**
 * 根据 ID 获取墓地位置
 */
export async function getGraveLocation(id: string): Promise<GraveLocation | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<GraveLocation>(
    'SELECT * FROM grave_locations WHERE id = ?',
    id
  );
  return row ?? null;
}

/**
 * 获取所有墓地位置
 */
export async function getAllGraveLocations(): Promise<GraveLocation[]> {
  const db = await getDatabase();
  return db.getAllAsync<GraveLocation>(
    'SELECT * FROM grave_locations ORDER BY created_at DESC'
  );
}

/**
 * 更新墓地位置记录
 */
export async function updateGraveLocation(
  id: string,
  data: Partial<Omit<CreateGraveInput, 'ancestor_id'>>
): Promise<void> {
  const db = await getDatabase();

  const fields: string[] = [];
  const values: unknown[] = [];

  const fieldMap: Record<string, unknown> = {
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy_meters: data.accuracy_meters,
    altitude: data.altitude,
    address_hint: data.address_hint,
    photo_paths: data.photo_paths,
    audio_note_path: data.audio_note_path,
    recorded_at: data.recorded_at,
  };

  for (const [key, value] of Object.entries(fieldMap)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return;

  values.push(id);

  await db.runAsync(
    `UPDATE grave_locations SET ${fields.join(', ')} WHERE id = ?`,
    ...(values as (string | number | null)[])
  );
}

/**
 * 删除墓地位置记录
 * 注意：关联的 route_waypoints 会因 ON DELETE CASCADE 自动删除
 */
export async function deleteGraveLocation(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM grave_locations WHERE id = ?', id);
}
