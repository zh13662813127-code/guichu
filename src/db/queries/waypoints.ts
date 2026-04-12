/**
 * route_waypoints 表的 CRUD 操作
 */

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getDatabase } from '../database';

// ─── 类型定义 ───────────────────────────────────────────

/** 创建路线点的输入 schema */
export const CreateWaypointSchema = z.object({
  grave_id: z.string().min(1, '必须关联一个墓地'),
  sort_order: z.number().int().min(0),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_meters: z.number().optional(),
  photo_paths: z.string().min(1, '至少需要一张照片路径'),
  note: z.string().optional(),
  audio_note_path: z.string().optional(),
  is_endpoint: z.boolean().default(false),
  recorded_at: z.string().optional(),
});

export type CreateWaypointInput = z.infer<typeof CreateWaypointSchema>;

/** 数据库中的路线点记录 */
export interface RouteWaypoint {
  id: string;
  grave_id: string;
  sort_order: number;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  photo_paths: string;
  note: string | null;
  audio_note_path: string | null;
  is_endpoint: number;
  recorded_at: string;
  created_at: string;
}

// ─── CRUD 操作 ──────────────────────────────────────────

/**
 * 创建路线点
 * @returns 新建记录的 ID
 */
export async function createWaypoint(data: CreateWaypointInput): Promise<string> {
  const validated = CreateWaypointSchema.parse(data);
  const db = await getDatabase();
  const id = nanoid();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO route_waypoints (
      id, grave_id, sort_order, latitude, longitude,
      accuracy_meters, photo_paths, note, audio_note_path,
      is_endpoint, recorded_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    validated.grave_id,
    validated.sort_order,
    validated.latitude,
    validated.longitude,
    validated.accuracy_meters ?? null,
    validated.photo_paths,
    validated.note ?? null,
    validated.audio_note_path ?? null,
    validated.is_endpoint ? 1 : 0,
    validated.recorded_at ?? now,
    now
  );

  return id;
}

/**
 * 获取某个墓地的所有路线点，按 sort_order 排序
 */
export async function getWaypointsByGraveId(graveId: string): Promise<RouteWaypoint[]> {
  const db = await getDatabase();
  return db.getAllAsync<RouteWaypoint>(
    'SELECT * FROM route_waypoints WHERE grave_id = ? ORDER BY sort_order ASC',
    graveId
  );
}

/**
 * 更新路线点
 */
export async function updateWaypoint(
  id: string,
  data: Partial<Omit<CreateWaypointInput, 'grave_id'>>
): Promise<void> {
  const db = await getDatabase();

  const fields: string[] = [];
  const values: unknown[] = [];

  const fieldMap: Record<string, unknown> = {
    sort_order: data.sort_order,
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy_meters: data.accuracy_meters,
    photo_paths: data.photo_paths,
    note: data.note,
    audio_note_path: data.audio_note_path,
    is_endpoint: data.is_endpoint !== undefined ? (data.is_endpoint ? 1 : 0) : undefined,
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
    `UPDATE route_waypoints SET ${fields.join(', ')} WHERE id = ?`,
    ...(values as (string | number | null)[])
  );
}

/**
 * 删除路线点
 */
export async function deleteWaypoint(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM route_waypoints WHERE id = ?', id);
}
