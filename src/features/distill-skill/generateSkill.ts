/**
 * .skill 文件生成器
 * 拼接 prompt，调用 LLM 流式生成 .skill 格式的 Markdown
 */

import OpenAI from 'openai';

/** 系统 prompt：指导 LLM 生成 .skill 格式文件 */
const SYSTEM_PROMPT = `你正在为用户整理一位长辈的"数字人格档案"。
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
 * 将问答记录拼接为用户消息
 */
function buildUserMessage(params: {
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
 * @param params.name 长辈名字
 * @param params.relationship 与用户的关系
 * @param params.birthYear 出生年份
 * @param params.deathYear 去世年份
 * @param params.answers 所有问答记录
 * @param params.llmConfig LLM 配置（baseURL、apiKey、model）
 * @param params.onProgress 流式回调，每次返回新增的文本片段
 * @returns 完整的 .skill Markdown 文本
 */
export async function generateSkillFile(params: {
  name: string;
  relationship?: string;
  birthYear?: number;
  deathYear?: number;
  answers: Array<{ question: string; answer: string }>;
  llmConfig: { baseURL: string; apiKey: string; model: string };
  onProgress?: (text: string) => void;
}): Promise<string> {
  const { llmConfig, onProgress, ...rest } = params;

  const client = new OpenAI({
    baseURL: llmConfig.baseURL,
    apiKey: llmConfig.apiKey,
    // React Native 环境需要禁用默认 headers
    dangerouslyAllowBrowser: true,
  });

  const userMessage = buildUserMessage(rest);

  const stream = await client.chat.completions.create({
    model: llmConfig.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
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
