/**
 * 数据库单例管理
 * 使用 expo-sqlite 异步 API，提供全局唯一的数据库连接
 */

import * as SQLite from 'expo-sqlite';
import { TABLES, INDEXES, CURRENT_SCHEMA_VERSION } from './schema';

/** 数据库单例 */
let db: SQLite.SQLiteDatabase | null = null;

/**
 * 获取数据库单例
 * 首次调用时自动创建数据库并初始化表结构
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('guichu.db');

  // 开启 WAL 模式，提升并发读写性能
  await db.execAsync('PRAGMA journal_mode = WAL;');
  // 开启外键约束
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await initializeDatabase(db);
  return db;
}

/**
 * 初始化数据库
 * 检查 schema_version 表，如果版本不匹配则执行建表和索引
 */
async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  // 先创建 schema_version 表（如果不存在）
  await database.execAsync(TABLES[0]);

  // 检查当前版本
  const row = await database.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_version'
  );

  const currentVersion = row?.version ?? 0;

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return; // 已是最新版本，无需迁移
  }

  // 在事务中执行所有建表和索引操作
  await database.withTransactionAsync(async () => {
    // 创建所有表
    for (const sql of TABLES) {
      await database.execAsync(sql);
    }

    // 创建所有索引
    for (const sql of INDEXES) {
      await database.execAsync(sql);
    }

    // 记录版本号
    await database.runAsync(
      'INSERT OR REPLACE INTO schema_version (version) VALUES (?)',
      CURRENT_SCHEMA_VERSION
    );
  });
}

/**
 * 关闭数据库连接
 * 一般用于测试或应用退出时
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
