/**
 * interviews 和 interview_answers 表的 CRUD 操作
 */

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getDatabase } from '../database';

// ─── 类型定义 ───────────────────────────────────────────

/** 创建访谈的输入 schema */
export const CreateInterviewSchema = z.object({
  ancestor_id: z.string().min(1, '必须关联一位长辈'),
  status: z
    .enum(['draft', 'in_progress', 'completed', 'distilled'])
    .default('draft'),
  total_questions: z.number().int().min(0).default(0),
});

export type CreateInterviewInput = z.infer<typeof CreateInterviewSchema>;

/** 数据库中的访谈记录 */
export interface Interview {
  id: string;
  ancestor_id: string;
  status: 'draft' | 'in_progress' | 'completed' | 'distilled';
  total_questions: number;
  completed_questions: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/** 创建访谈问答的输入 schema */
export const CreateAnswerSchema = z.object({
  interview_id: z.string().min(1, '必须关联一个访谈'),
  question_index: z.number().int().min(0),
  question_text: z.string().min(1, '问题文本不能为空'),
  theme: z.string().optional(),
  audio_path: z.string().optional(),
  transcript: z.string().optional(),
  duration_seconds: z.number().optional(),
});

export type CreateAnswerInput = z.infer<typeof CreateAnswerSchema>;

/** 数据库中的访谈问答记录 */
export interface InterviewAnswer {
  id: string;
  interview_id: string;
  question_index: number;
  question_text: string;
  theme: string | null;
  audio_path: string | null;
  transcript: string | null;
  duration_seconds: number | null;
  created_at: string;
}

// ─── 访谈 CRUD ──────────────────────────────────────────

/**
 * 创建访谈
 * @returns 新建访谈的 ID
 */
export async function createInterview(data: CreateInterviewInput): Promise<string> {
  const validated = CreateInterviewSchema.parse(data);
  const db = await getDatabase();
  const id = nanoid();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO interviews (
      id, ancestor_id, status, total_questions,
      completed_questions, created_at
    ) VALUES (?, ?, ?, ?, 0, ?)`,
    id,
    validated.ancestor_id,
    validated.status,
    validated.total_questions,
    now
  );

  return id;
}

/**
 * 根据 ID 获取访谈
 */
export async function getInterview(id: string): Promise<Interview | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Interview>(
    'SELECT * FROM interviews WHERE id = ?',
    id
  );
  return row ?? null;
}

/**
 * 获取某位长辈的所有访谈
 */
export async function getInterviewsByAncestorId(
  ancestorId: string
): Promise<Interview[]> {
  const db = await getDatabase();
  return db.getAllAsync<Interview>(
    'SELECT * FROM interviews WHERE ancestor_id = ? ORDER BY created_at DESC',
    ancestorId
  );
}

/**
 * 更新访谈状态
 */
export async function updateInterview(
  id: string,
  data: Partial<Pick<Interview, 'status' | 'total_questions' | 'completed_questions' | 'started_at' | 'completed_at'>>
): Promise<void> {
  const db = await getDatabase();

  const fields: string[] = [];
  const values: unknown[] = [];

  const fieldMap: Record<string, unknown> = {
    status: data.status,
    total_questions: data.total_questions,
    completed_questions: data.completed_questions,
    started_at: data.started_at,
    completed_at: data.completed_at,
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
    `UPDATE interviews SET ${fields.join(', ')} WHERE id = ?`,
    ...(values as (string | number | null)[])
  );
}

/**
 * 删除访谈（关联的问答会级联删除）
 */
export async function deleteInterview(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM interviews WHERE id = ?', id);
}

// ─── 访谈问答 CRUD ─────────────────────────────────────

/**
 * 创建访谈问答
 * @returns 新建记录的 ID
 */
export async function createAnswer(data: CreateAnswerInput): Promise<string> {
  const validated = CreateAnswerSchema.parse(data);
  const db = await getDatabase();
  const id = nanoid();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO interview_answers (
      id, interview_id, question_index, question_text,
      theme, audio_path, transcript, duration_seconds,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    validated.interview_id,
    validated.question_index,
    validated.question_text,
    validated.theme ?? null,
    validated.audio_path ?? null,
    validated.transcript ?? null,
    validated.duration_seconds ?? null,
    now
  );

  return id;
}

/**
 * 获取某个访谈的所有问答，按 question_index 排序
 */
export async function getAnswersByInterviewId(
  interviewId: string
): Promise<InterviewAnswer[]> {
  const db = await getDatabase();
  return db.getAllAsync<InterviewAnswer>(
    'SELECT * FROM interview_answers WHERE interview_id = ? ORDER BY question_index ASC',
    interviewId
  );
}

/**
 * 更新问答记录（通常用于补充转录文本）
 */
export async function updateAnswer(
  id: string,
  data: Partial<Pick<InterviewAnswer, 'audio_path' | 'transcript' | 'duration_seconds' | 'theme'>>
): Promise<void> {
  const db = await getDatabase();

  const fields: string[] = [];
  const values: unknown[] = [];

  const fieldMap: Record<string, unknown> = {
    audio_path: data.audio_path,
    transcript: data.transcript,
    duration_seconds: data.duration_seconds,
    theme: data.theme,
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
    `UPDATE interview_answers SET ${fields.join(', ')} WHERE id = ?`,
    ...(values as (string | number | null)[])
  );
}
