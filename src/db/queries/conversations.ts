/**
 * conversations 和 messages 表的 CRUD 操作
 */

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getDatabase } from '../database';

// ─── 类型定义 ───────────────────────────────────────────

/** 数据库中的对话记录 */
export interface Conversation {
  id: string;
  ancestor_id: string;
  created_at: string;
  updated_at: string;
}

/** 创建消息的输入 schema */
export const CreateMessageSchema = z.object({
  conversation_id: z.string().min(1, '必须关联一个对话'),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, '消息内容不能为空'),
});

export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;

/** 数据库中的消息记录 */
export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

// ─── 对话 CRUD ──────────────────────────────────────────

/**
 * 创建对话
 * @returns 新建对话的 ID
 */
export async function createConversation(ancestorId: string): Promise<string> {
  const db = await getDatabase();
  const id = nanoid();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO conversations (id, ancestor_id, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    id,
    ancestorId,
    now,
    now
  );

  return id;
}

/**
 * 根据 ID 获取对话
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Conversation>(
    'SELECT * FROM conversations WHERE id = ?',
    id
  );
  return row ?? null;
}

/**
 * 获取某位长辈的所有对话
 */
export async function getConversationsByAncestorId(
  ancestorId: string
): Promise<Conversation[]> {
  const db = await getDatabase();
  return db.getAllAsync<Conversation>(
    'SELECT * FROM conversations WHERE ancestor_id = ? ORDER BY updated_at DESC',
    ancestorId
  );
}

/**
 * 删除对话（关联的消息会级联删除）
 */
export async function deleteConversation(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM conversations WHERE id = ?', id);
}

// ─── 消息 CRUD ──────────────────────────────────────────

/**
 * 创建消息，同时更新对话的 updated_at
 * @returns 新建消息的 ID
 */
export async function createMessage(data: CreateMessageInput): Promise<string> {
  const validated = CreateMessageSchema.parse(data);
  const db = await getDatabase();
  const id = nanoid();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO messages (id, conversation_id, role, content, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      id,
      validated.conversation_id,
      validated.role,
      validated.content,
      now
    );

    // 更新对话的 updated_at
    await db.runAsync(
      'UPDATE conversations SET updated_at = ? WHERE id = ?',
      now,
      validated.conversation_id
    );
  });

  return id;
}

/**
 * 获取某个对话的所有消息，按时间排序
 */
export async function getMessagesByConversationId(
  conversationId: string
): Promise<Message[]> {
  const db = await getDatabase();
  return db.getAllAsync<Message>(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    conversationId
  );
}

/**
 * 获取某个对话的最近 N 条消息
 */
export async function getRecentMessages(
  conversationId: string,
  limit: number = 20
): Promise<Message[]> {
  const db = await getDatabase();
  // 子查询取最近 N 条，外层正序排列
  return db.getAllAsync<Message>(
    `SELECT * FROM (
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    ) ORDER BY created_at ASC`,
    conversationId,
    limit
  );
}
