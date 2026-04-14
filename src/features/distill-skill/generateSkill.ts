/**
 * .skill 人格档案生成器 — v2 双轨结构
 * 基于 yourself-skill 理念，生成 Part A（记忆档案）+ Part B（5 层人格结构）
 *
 * 注意：openai SDK 使用动态导入，避免 App 启动时加载导致 RN 兼容性错误
 */

/** 系统 prompt：双轨传神 v2 */
const SYSTEM_PROMPT_V2 = `你正在为用户整理一位长辈的"数字人格档案"。
用户希望通过这份档案，留住长辈的音容笑貌、说话方式和人生记忆，
以便日后在对话中仍能听到那份熟悉。

请基于提供的素材，生成以下两部分内容：

## Part A — 记忆档案
从素材中提取：
- 基本身份（籍贯、职业、时代背景）
- 核心人生记忆（按时间排列，5-10 个关键事件）
- 人际关系图谱（和谁关系好、和谁有矛盾）
- 价值观与处世哲学
- 生活习惯与爱好

## Part B — 5 层人格结构

### Layer 1: 硬规则
- 绝对不会做的事
- 绝对不会说的话
- 禁忌话题

### Layer 2: 身份认同
- "我是谁"的核心认知
- 最引以为豪的身份

### Layer 3: 说话风格
- 口头禅（原文保留方言）
- 常用句式
- 语气特征（温和/严厉/幽默/沉默...）
- 方言特征

### Layer 4: 情感模式
- 开心时的表现
- 生气时的表现
- 难过时的表现
- 安慰人的方式

### Layer 5: 人际行为
- 对晚辈的态度
- 对陌生人的态度
- 社交偏好

输出格式为 Markdown，用 YAML frontmatter：
---
name: {名字}
description: 一句话描述
version: 1
method: guichu-distill-v2
---

用第二人称写（"你是..."），因为这会被用作 AI 对话的 system prompt。
保留所有方言和口语特征。不要编造素材中没有的内容。
如果某些信息素材中未提及，就跳过对应部分，不要瞎编。
语气温暖但克制，不要过度煽情。`;

/**
 * 构建用户消息（新版引导式数据结构）
 */
function buildUserMessage(params: {
  name: string;
  relationship?: string;
  oneLiner: string;
  catchphrases?: string;
  hometown?: string;
  occupation?: string;
  lifeStories?: string;
  proudest?: string;
  biggestRegret?: string;
  chatLogs?: string;
  otherMaterials?: string;
}): string {
  const {
    name, relationship, oneLiner, catchphrases,
    hometown, occupation, lifeStories, proudest,
    biggestRegret, chatLogs, otherMaterials,
  } = params;

  const lines: string[] = [];

  // 基本信息
  lines.push(`长辈姓名：${name}`);
  if (relationship) lines.push(`与用户关系：${relationship}`);
  lines.push(`一句话描述：${oneLiner}`);
  if (hometown) lines.push(`籍贯/口音：${hometown}`);
  if (occupation) lines.push(`职业/一辈子做什么：${occupation}`);

  // 口头禅
  if (catchphrases?.trim()) {
    lines.push('');
    lines.push('--- 口头禅 ---');
    lines.push(catchphrases.trim());
  }

  // 核心记忆
  const memoryParts: string[] = [];
  if (lifeStories?.trim()) memoryParts.push(lifeStories.trim());
  if (proudest?.trim()) memoryParts.push(`最骄傲的事：${proudest.trim()}`);
  if (biggestRegret?.trim()) memoryParts.push(`最大的遗憾：${biggestRegret.trim()}`);

  if (memoryParts.length > 0) {
    lines.push('');
    lines.push('--- 核心记忆 ---');
    lines.push(memoryParts.join('\n\n'));
  }

  // 素材补充
  if (chatLogs?.trim()) {
    lines.push('');
    lines.push('--- 聊天记录 ---');
    lines.push(chatLogs.trim());
  }
  if (otherMaterials?.trim()) {
    lines.push('');
    lines.push('--- 其他素材（信件、日记、评价等） ---');
    lines.push(otherMaterials.trim());
  }

  return lines.join('\n');
}

/**
 * 调用 LLM 流式生成 .skill 文件（v2 双轨蒸馏）
 *
 * openai SDK 在此处动态导入，仅在用户实际触发蒸馏时才加载。
 */
export async function generateSkillFile(params: {
  name: string;
  relationship?: string;
  // 步骤 1：基本画像
  oneLiner: string;           // 一句话描述（必填）
  catchphrases?: string;       // 口头禅
  hometown?: string;           // 哪里人/口音
  occupation?: string;         // 职业
  // 步骤 2：核心记忆
  lifeStories?: string;        // 重要经历
  proudest?: string;           // 最骄傲的事
  biggestRegret?: string;      // 最大遗憾
  // 步骤 3：素材补充
  chatLogs?: string;           // 聊天记录
  otherMaterials?: string;     // 其他素材
  // LLM 配置
  llmConfig: { baseURL: string; apiKey: string; model: string };
  onProgress?: (text: string) => void;
}): Promise<string> {
  const { llmConfig, onProgress, ...contentParams } = params;

  // 动态导入 openai SDK，避免启动时加载
  const { default: OpenAI } = await import('openai');

  const client = new OpenAI({
    baseURL: llmConfig.baseURL,
    apiKey: llmConfig.apiKey,
    dangerouslyAllowBrowser: true,
  });

  const userMessage = buildUserMessage(contentParams);

  const stream = await client.chat.completions.create({
    model: llmConfig.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_V2 },
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
