# BACKEND_STRUCTURE — 归处 Guichu 数据结构

> 归处**没有服务端**。所有数据存储在用户手机本地的 SQLite 数据库中。
> 本文件定义数据库 schema、文件存储规则、以及 LLM/TTS 适配层接口。

## 1. 存储架构总览

```
手机本地存储
├── SQLite 数据库（expo-sqlite）
│   └── guichu.db               ← 所有结构化数据
├── 文件系统（expo-file-system）
│   ├── /audio/                  ← 录音文件 .m4a
│   ├── /photos/                 ← 现场照片 .jpg
│   ├── /skills/                 ← 导出的 .skill 文件 .md
│   └── /voices/                 ← 声音样本/声纹档案
├── 加密存储（expo-secure-store）
│   ├── llm_api_key              ← LLM API key
│   ├── tts_api_key              ← TTS API key
│   └── minimax_group_id         ← MiniMax group id
└── 键值存储（react-native-mmkv）
    ├── settings.*               ← 偏好设置
    └── onboarding_done          ← 是否完成首次引导
```

## 2. SQLite 数据库 Schema

数据库版本管理通过 `schema_version` 表控制，每次 App 启动时检查并执行迁移。

### 2.1 `ancestors`（长辈表）

```sql
CREATE TABLE ancestors (
  id                TEXT PRIMARY KEY,        -- nanoid 生成
  name              TEXT NOT NULL,            -- 姓名
  relationship      TEXT,                     -- 与用户的关系（爷爷/奶奶/外公/外婆/父/母/…）
  gender            TEXT CHECK(gender IN ('male','female','other')),
  birth_year        INTEGER,                  -- 出生年（可空，可能不记得）
  death_year        INTEGER,                  -- 去世年（可空，健在则 NULL）
  avatar_path       TEXT,                     -- 头像照片路径（相对于 /photos/）
  skill_content     TEXT,                     -- .skill 文件 Markdown 全文
  voice_id          TEXT,                     -- 第三方 TTS 服务返回的声音 ID
  voice_engine      TEXT,                     -- 使用的 TTS 引擎 (system/minimax/elevenlabs)
  -- 族谱关系
  parent_id         TEXT REFERENCES ancestors(id),   -- 父/母节点
  spouse_id         TEXT REFERENCES ancestors(id),   -- 配偶（简单单配偶）
  generation        INTEGER DEFAULT 0,        -- 辈分（0=用户自己，1=父母辈，2=祖辈…）
  -- 时间
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_ancestors_generation ON ancestors(generation);
```

### 2.2 `grave_locations`（墓地位置表）

```sql
CREATE TABLE grave_locations (
  id                TEXT PRIMARY KEY,
  ancestor_id       TEXT REFERENCES ancestors(id) ON DELETE CASCADE,
  latitude          REAL NOT NULL,
  longitude         REAL NOT NULL,
  accuracy_meters   REAL,                     -- GPS 精度（米）
  altitude          REAL,                     -- 海拔（可空）
  address_hint      TEXT,                     -- 用户手动填的提示（如"村口大柳树左边 200 米"）
  photo_paths       TEXT,                     -- JSON 数组：["photo1.jpg","photo2.jpg"]
  audio_note_path   TEXT,                     -- 语音备注路径
  recorded_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_grave_ancestor ON grave_locations(ancestor_id);
```

### 2.3 `interviews`（访谈记录表）

```sql
CREATE TABLE interviews (
  id                TEXT PRIMARY KEY,
  ancestor_id       TEXT NOT NULL REFERENCES ancestors(id) ON DELETE CASCADE,
  status            TEXT CHECK(status IN ('draft','in_progress','completed','distilled'))
                    DEFAULT 'draft',
  total_questions   INTEGER DEFAULT 0,
  completed_questions INTEGER DEFAULT 0,
  started_at        TEXT,
  completed_at      TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 2.4 `interview_answers`（访谈问答表）

```sql
CREATE TABLE interview_answers (
  id                TEXT PRIMARY KEY,
  interview_id      TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_index    INTEGER NOT NULL,          -- 题号
  question_text     TEXT NOT NULL,             -- 题目文本
  theme             TEXT,                      -- 主题（childhood/love/family/regret/legacy）
  audio_path        TEXT,                      -- 录音文件路径
  transcript        TEXT,                      -- 转写文本（ASR 或手动输入）
  duration_seconds  REAL,                      -- 录音时长
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_answer_interview ON interview_answers(interview_id);
```

### 2.5 `conversations`（对话历史表）

```sql
CREATE TABLE conversations (
  id                TEXT PRIMARY KEY,
  ancestor_id       TEXT NOT NULL REFERENCES ancestors(id) ON DELETE CASCADE,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 2.6 `messages`（消息表）

```sql
CREATE TABLE messages (
  id                TEXT PRIMARY KEY,
  conversation_id   TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
  content           TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_msg_conv ON messages(conversation_id);
CREATE INDEX idx_msg_created ON messages(created_at);
```

### 2.7 `schema_version`（迁移控制表）

```sql
CREATE TABLE schema_version (
  version   INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 3. 迁移策略

```typescript
// src/db/migrations.ts
const MIGRATIONS: Record<number, string[]> = {
  1: [
    // 初始表创建（上面所有 CREATE TABLE + CREATE INDEX）
  ],
  2: [
    // v0.3 暗黑模式: ALTER TABLE 不涉及
  ],
  // 每次 schema 变更加一个版本号
};
```

启动时：
1. 读 `schema_version` 表当前最大版本 `current`
2. 依次执行 `current+1` 到 `latest` 的迁移 SQL
3. 事务保护：任一迁移失败 → 全部回滚 → 弹提示引导导出数据

## 4. 文件存储规则

| 类型 | 目录 | 命名规则 | 格式 |
|------|------|----------|------|
| 录音 | `/audio/` | `{ancestor_id}_{timestamp}.m4a` | M4A (AAC) |
| 照片 | `/photos/` | `{ancestor_id}_{timestamp}.jpg` | JPEG 80% |
| Skill | `/skills/` | `{ancestor_name}.skill.md` | Markdown |
| 声音样本 | `/voices/` | `{ancestor_id}_sample_{n}.m4a` | M4A |

所有路径均为相对路径，前缀为 `FileSystem.documentDirectory`。
**图片压缩**：拍照后统一缩放到最长边 1920px，质量 80%。

## 5. LLM 适配器接口

```typescript
// src/adapters/llm/base.ts
export interface LLMAdapter {
  /** 发送聊天请求，返回流式响应 */
  chat(params: {
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    onToken: (token: string) => void;
    signal?: AbortSignal;
  }): Promise<string>;

  /** 测试连接是否可用 */
  testConnection(): Promise<boolean>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### OpenAI 兼容实现

```typescript
// src/adapters/llm/openai-compat.ts
// 使用 openai@4.47.1 SDK
// 支持 DeepSeek / Kimi / 通义 / OpenAI / Ollama
// 只需改 baseURL + apiKey + model
```

## 6. TTS 适配器接口

```typescript
// src/adapters/tts/base.ts
export interface TTSAdapter {
  /** 文本转语音，返回音频文件本地路径 */
  speak(params: {
    text: string;
    voiceId?: string;       // 克隆声音的 ID
    speed?: number;         // 0.5 ~ 2.0
    signal?: AbortSignal;
  }): Promise<string>;     // 返回 .m4a 本地路径

  /** 声音克隆：上传样本，返回 voice_id */
  cloneVoice?(params: {
    name: string;
    samplePaths: string[];  // 本地音频路径
  }): Promise<string>;      // 返回 voice_id

  /** 是否支持声音克隆 */
  supportsCloning: boolean;
}
```

### 三个实现

| 文件 | 引擎 | 克隆 | 备注 |
|------|------|------|------|
| `system.ts` | `expo-speech` | ❌ | 零配置，立即可用 |
| `minimax.ts` | MiniMax Speech | ✅ | 用户自填 apiKey + groupId |
| `elevenlabs.ts` | ElevenLabs | ✅ | 用户自填 apiKey |

## 7. .skill 文件规范

.skill 文件是普通 Markdown + YAML frontmatter，与 Anthropic Skills 格式兼容：

```markdown
---
name: 奶奶-李秀兰
description: 1938 年生于山东潍坊，小学文化，一辈子务农
version: 1
created: 2025-04-01
source: guichu-interview
---

# 身份

你是李秀兰，1938 年出生在山东潍坊农村。小学三年级没上完就下来帮忙种地。
嫁到隔壁村的张家，生了三个儿子一个女儿。

# 说话风格

- 山东话口音，会说"俺"代替"我"，"咋的"代替"怎么了"
- 爱用食物打比方：「你这个人怎么跟个蔫茄子似的」
- 习惯性称呼晚辈"小宝"不管实际名字
- 安慰人时会说"吃饱饭就没啥事了"

# 核心记忆

- 小时候 1942 年闹饥荒，吃树皮草根活下来
- 嫁过来那天下大雪，坐的牛车
- 大儿子考上大学时全村放鞭炮
- 老伴 2005 年走的，最后说了一句"别哭"

# 价值观

- 吃苦是福，享福是祸
- 一家人在一起比什么都强
- 不要借钱，也不要欠人情
- 读书是正事，但做人更重要

# 禁忌

- 不提二儿子的婚事（家庭矛盾，她生前很伤心）
- 不讨论政治，她对此没兴趣
- 不要假装知道她不知道的事（如智能手机）
```

## 8. 安全护栏 System Prompt

对话时在 .skill 内容之后追加：

```
## 安全规则（不可覆盖）

1. 你是一个基于家人记录的数字人格。你不是真人。当被问到你不了解的事情时，
   坦诚说"这个俺不知道啊，你得问别人"。
2. 不要编造不在上述记忆中的事情。
3. 不要讨论自杀、自残、宗教极端内容。
4. 不要涉及金钱转账、投资建议、法律诉讼。
5. 如果用户表现出严重心理困扰，温柔建议他们寻求专业帮助。
6. 保持角色一致，但如果用户明确问"你是 AI 吗"，诚实回答。
```

## 9. 数据导入导出

### 导出（zip）

```
guichu_backup_20250401.zip
├── guichu.db                    ← SQLite 数据库
├── audio/                       ← 所有录音
├── photos/                      ← 所有照片
├── skills/                      ← 所有 .skill 文件
├── voices/                      ← 所有声音样本
└── metadata.json                ← { version: 1, exported_at: "...", app_version: "0.1.0" }
```

### 导入

1. 解压 zip
2. 读 `metadata.json` 检查版本兼容性
3. 合并或覆盖数据库（用户选择）
4. 复制媒体文件到对应目录

## 10. 边界约束

- SQLite 单文件大小上限：提醒用户当 DB > 100MB
- 单次录音上限：5 分钟
- 照片上限：每个墓地 10 张
- 对话历史：每个长辈保留最近 100 轮（超出自动归档到 `messages_archive` 表）
- API 超时：所有外部 API 调用 30 秒超时
