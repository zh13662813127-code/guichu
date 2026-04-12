/**
 * .skill 文件生成器
 * 拼接 prompt，调用 LLM 流式生成 .skill 格式的 Markdown
 *
 * 支持两种输入模式：
 * 1. 素材模式（推荐）：聊天记录、口述回忆、其他素材
 * 2. 问答模式（兼容旧版）：Q&A 问答列表
 *
 * 注意：openai SDK 使用动态导入，避免 App 启动时加载导致 RN 兼容性错误
 */

/** 系统 prompt：素材模式 — 从日常痕迹中提取人格 */
const SYSTEM_PROMPT_MATERIALS = `你正在为用户蒸馏一位长辈的"数字人格档案"。
用户会提供以下素材（可能不完整，有什么用什么）：
1. 聊天记录：长辈与他人的对话记录
2. 口述回忆：用户对长辈的记忆描述
3. 其他素材：信件、日记、别人的评价等

请从这些素材中提取人格特征，输出 .skill 文件。格式：

---
name: {名字}
description: 一句话描述
---

# 身份
（基本背景信息，包括出生年份、籍贯、职业等）

# 说话风格
- 列出口头禅、方言特征、典型句式

# 核心记忆
- 列出最重要的 5-8 个人生记忆，每个用一两句话概括

# 价值观
- 列出 3-5 个核心价值观，用长辈自己的话来表述

# 禁忌
- 素材中暗示不愿提及或回避的话题

特别注意：
1. 从聊天记录中提取说话风格、口头禅、语气
2. 从回忆中提取核心记忆和价值观
3. 保留原话中的方言和口语特征
4. 不要编造素材中没有的内容

要求：
1. 用第二人称写（"你是..."），因为这会被用作 AI 对话的 system prompt
2. 保留原话中的方言特征和口头禅
3. 不要编造素材中没提到的内容
4. 语气温暖但克制，不要过度煽情
5. 如果某些信息素材中未提及，就跳过对应部分，不要瞎编`;

/** 系统 prompt：问答模式（兼容旧版） */
const SYSTEM_PROMPT_QA = `你正在为用户整理一位长辈的"数字人格档案"。
基于以下访谈记录，输出一份 .skill 文件。格式必须是：

---
name: {名字}
description: 一句话描述
---

# 身份
（基本背景信息，包括出生年份、籍贯、职业等）

# 说话风格
- 列出口头禅、方言特征、典型句式

# 核心记忆
- 列出最重要的 5-8 个人生记忆，每个用一两句话概括

# 价值观
- 列出 3-5 个核心价值观，用长辈自己的话来表述

# 禁忌
- 访谈中暗示不愿提及或回避的话题

要求：
1. 用第二人称写（"你是..."），因为这会被用作 AI 对话的 system prompt
2. 保留原话中的方言特征和口头禅
3. 不要编造访谈中没提到的内容
4. 语气温暖但克制，不要过度煽情
5. 如果某些信息访谈中未提及，就跳过对应部分，不要瞎编`;

/**
 * 构建素材模式的用户消息
 */
function buildMaterialsMessage(params: {
  name: string;
  relationship?: string;
  birthYear?: number;
  deathYear?: number;
  chatLogs?: string;
  memories?: string;
  otherMaterials?: string;
}): string {
  const { name, relationship, birthYear, deathYear, chatLogs, memories, otherMaterials } = params;

  let header = `长辈姓名：${name}`;
  if (relationship) header += `\n与用户关系：${relationship}`;
  if (birthYear) header += `\n出生年份：${birthYear}`;
  if (deathYear) header += `\n去世年份：${deathYear}`;

  const sections: string[] = [];

  if (chatLogs) {
    sections.push(`--- 聊天记录 ---\n\n${chatLogs}`);
  }
  if (memories) {
    sections.push(`--- 口述回忆 ---\n\n${memories}`);
  }
  if (otherMaterials) {
    sections.push(`--- 其他素材 ---\n\n${otherMaterials}`);
  }

  return `${header}\n\n${sections.join('\n\n')}`;
}

/**
 * 构建问答模式的用户消息（兼容旧版）
 */
function buildQAMessage(params: {
  name: string;
  relationship?: string;
  birthYear?: number;
  deathYear?: number;
  answers: Array<{ question: string; answer: string }>;
}): string {
  const { name, relationship, birthYear, deathYear, answers } = params;

  let header = `长辈姓名：${name}`;
  if (relationship) header += `\n与用户关系：${relationship}`;
  if (birthYear) header += `\n出生年份：${birthYear}`;
  if (deathYear) header += `\n去世年份：${deathYear}`;

  const qaPairs = answers
    .filter((a) => a.answer.trim().length > 0)
    .map((a, i) => `【问题 ${i + 1}】${a.question}\n【回答】${a.answer}`)
    .join('\n\n');

  return `${header}\n\n--- 访谈记录 ---\n\n${qaPairs}`;
}

/**
 * 调用 LLM 流式生成 .skill 文件
 *
 * 支持素材模式和问答模式，自动判断使用哪种 prompt。
 * openai SDK 在此处动态导入，仅在用户实际触发蒸馏时才加载。
 */
export async function generateSkillFile(params: {
  name: string;
  relationship?: string;
  birthYear?: number;
  deathYear?: number;
  /** 素材模式：聊天记录 */
  chatLogs?: string;
  /** 素材模式：口述回忆 */
  memories?: string;
  /** 素材模式：其他素材 */
  otherMaterials?: string;
  /** 问答模式（兼容旧版） */
  answers?: Array<{ question: string; answer: string }>;
  llmConfig: { baseURL: string; apiKey: string; model: string };
  onProgress?: (text: string) => void;
}): Promise<string> {
  const { llmConfig, onProgress, answers, chatLogs, memories, otherMaterials, ...basicInfo } = params;

  // 动态导入 openai SDK，避免启动时加载
  const { default: OpenAI } = await import('openai');

  const client = new OpenAI({
    baseURL: llmConfig.baseURL,
    apiKey: llmConfig.apiKey,
    dangerouslyAllowBrowser: true,
  });

  // 判断使用哪种模式
  const isMaterialsMode = !!(chatLogs || memories || otherMaterials);

  const systemPrompt = isMaterialsMode ? SYSTEM_PROMPT_MATERIALS : SYSTEM_PROMPT_QA;
  const userMessage = isMaterialsMode
    ? buildMaterialsMessage({ ...basicInfo, chatLogs, memories, otherMaterials })
    : buildQAMessage({ ...basicInfo, answers: answers || [] });

  const stream = await client.chat.completions.create({
    model: llmConfig.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 4096,
  });

  let fullText = '';

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullText += delta;
      onProgress?.(delta);
    }
  }

  return fullText;
}
