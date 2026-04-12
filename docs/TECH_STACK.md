# TECH_STACK — 归处 Guichu

> 所有版本号**锁定**。AI 助手在生成代码时必须使用这些确切版本。不接受"最新版本"。

## 1. 平台与运行时

| 项目 | 版本 | 说明 |
|------|------|------|
| Node.js | `20.11.1 LTS` | 开发机运行时 |
| npm | `10.2.4` | 包管理器（不使用 yarn/pnpm 以降低贡献者门槛） |
| Expo SDK | `50.0.17` | RN 开发框架 |
| React Native | `0.73.6` | 随 Expo 50 锁定 |
| React | `18.2.0` | 随 Expo 50 锁定 |
| TypeScript | `5.3.3` | 全项目使用 TS，禁止新增 .js 文件 |
| EAS CLI | `7.8.4` | 构建发布工具（可选） |

## 2. 核心依赖（Runtime）

| 包 | 版本 | 用途 |
|----|------|------|
| `expo` | `50.0.17` | 框架入口 |
| `expo-router` | `3.4.10` | 文件路由系统（按目录生成路由） |
| `expo-location` | `16.5.5` | GPS 定位 |
| `expo-camera` | `14.1.3` | 拍照 |
| `expo-av` | `13.10.6` | 录音/播放 |
| `expo-file-system` | `16.0.9` | 本地文件读写（.skill 文件、声音档案） |
| `expo-sqlite` | `13.4.0` | 本地数据库 |
| `expo-image-picker` | `14.7.1` | 选择相册照片 |
| `expo-linking` | `6.2.2` | 调起第三方地图 |
| `expo-sharing` | `11.10.0` | 导出 .skill 文件 |
| `expo-document-picker` | `11.10.1` | 导入 .skill 文件 |
| `expo-secure-store` | `12.8.1` | 存储用户 API key（加密） |
| `expo-haptics` | `12.8.1` | 按钮触觉反馈 |
| `expo-notifications` | `0.27.7` | 本地通知（习俗提醒，不需要推送服务） |
| `expo-speech` | `11.7.0` | 系统 TTS（零配置语音播放） |
| `react-native-maps` | `1.10.0` | （仅用于展示墓地静态地图点位，不做导航） |
| `zustand` | `4.5.2` | 轻量状态管理 |
| `react-native-mmkv` | `2.12.2` | 键值存储（偏好设置） |
| `date-fns` | `3.6.0` | 日期处理 |
| `nanoid` | `5.0.7` | 生成本地 ID |
| `zod` | `3.22.4` | Schema 校验 |

## 3. UI 依赖

| 包 | 版本 | 用途 |
|----|------|------|
| `nativewind` | `4.0.36` | Tailwind for RN（设计 token 见 FRONTEND_GUIDELINES） |
| `tailwindcss` | `3.4.3` | NativeWind 依赖 |
| `lucide-react-native` | `0.378.0` | 图标库 |
| `react-native-reanimated` | `3.6.2` | 动画 |
| `react-native-gesture-handler` | `2.14.0` | 手势 |
| `react-native-svg` | `14.1.0` | SVG（族谱树渲染） |

## 4. LLM / TTS 适配层（核心：BYOK）

**归处不内置任何 API key。所有外部服务通过适配器模式由用户自配。**

| 包 | 版本 | 用途 |
|----|------|------|
| `openai` | `4.47.1` | OpenAI 兼容客户端（支持 DeepSeek/Kimi/Ollama/Claude） |
| `eventsource-parser` | `1.1.2` | SSE 流式响应解析 |

> **Claude API 注意**：通过 `openai` 包 + Anthropic 官方兼容端点调用，或使用 `@anthropic-ai/sdk@0.20.9`（作为可选适配器）。

### 支持的 LLM Provider（用户自选）

| Provider | baseURL | 推荐度 |
|----------|---------|--------|
| DeepSeek | `https://api.deepseek.com/v1` | ⭐⭐⭐⭐⭐ 默认推荐 |
| Kimi (Moonshot) | `https://api.moonshot.cn/v1` | ⭐⭐⭐⭐ |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | ⭐⭐⭐ |
| OpenAI | `https://api.openai.com/v1` | ⭐⭐⭐ |
| Claude | `https://api.anthropic.com/v1` (via sdk) | ⭐⭐⭐⭐ |
| 本地 Ollama | `http://localhost:11434/v1` | ⭐⭐⭐ 隐私最佳 |

### 支持的 TTS/Voice Clone Provider

| Provider | 模式 | 推荐度 |
|----------|------|--------|
| System TTS (`expo-speech`) | 零配置默认 | ⭐⭐⭐ 立即可用 |
| MiniMax Speech API | BYOK | ⭐⭐⭐⭐⭐ 中文克隆首选 |
| ElevenLabs | BYOK | ⭐⭐⭐ 英文最佳 |

## 5. 开发依赖

| 包 | 版本 | 用途 |
|----|------|------|
| `@types/react` | `18.2.79` | - |
| `@types/node` | `20.12.7` | - |
| `eslint` | `8.57.0` | Linting |
| `eslint-config-expo` | `7.0.0` | - |
| `prettier` | `3.2.5` | Formatting |
| `jest` | `29.7.0` | 单元测试 |
| `jest-expo` | `50.0.4` | Expo Jest preset |
| `@testing-library/react-native` | `12.5.0` | 组件测试 |

## 6. 项目结构（锁定）

```
guichu/
├── app/                          # expo-router 路由目录
│   ├── _layout.tsx               # 根 layout
│   ├── index.tsx                 # 主页（大按钮）
│   ├── ancestors/
│   │   ├── index.tsx             # 长辈列表
│   │   ├── [id].tsx              # 长辈详情
│   │   ├── [id]/chat.tsx         # 对话页
│   │   └── [id]/interview.tsx    # 访谈页
│   ├── tree.tsx                  # 族谱树
│   └── settings/
│       ├── index.tsx             # 设置主页
│       ├── llm.tsx               # LLM 配置
│       └── tts.tsx               # TTS 配置
├── src/
│   ├── db/                       # SQLite schema + queries
│   ├── adapters/                 # LLM/TTS 适配器
│   │   ├── llm/
│   │   │   ├── base.ts
│   │   │   ├── openai-compat.ts
│   │   │   └── anthropic.ts
│   │   └── tts/
│   │       ├── base.ts
│   │       ├── system.ts
│   │       ├── minimax.ts
│   │       └── elevenlabs.ts
│   ├── features/                 # 按功能划分的业务模块
│   │   ├── grave-pin/
│   │   ├── rituals/              # 习俗指南
│   │   │   ├── customs/          # 习俗知识库 JSON
│   │   │   │   ├── common.json
│   │   │   │   └── regions/
│   │   │   ├── calcRituals.ts
│   │   │   └── templates.ts
│   │   ├── distill-skill/
│   │   ├── chat/
│   │   └── voice-clone/
│   ├── components/               # 通用 UI 组件
│   ├── stores/                   # Zustand stores
│   ├── utils/
│   └── constants/
├── assets/
│   ├── images/
│   └── fonts/
├── docs/                         # 本目录下所有规范文档
├── app.json                      # Expo 配置
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── README.md
├── LICENSE                       # MIT
├── CLAUDE.md                     # AI 会话规则
└── progress.txt                  # 进度跟踪
```

## 7. 禁止事项

- ❌ 禁止引入任何带后端的 SaaS SDK（Firebase、Supabase、Amplify……）
- ❌ 禁止在仓库内提交任何 API key、token、secret（使用 `.env.example` 示范）
- ❌ 禁止引入付费字体、付费图标库
- ❌ 禁止在依赖中出现任何带 GPL/AGPL license 的包
- ❌ 禁止在移动端直接调用数据库 ORM（Prisma/Drizzle 等桌面向的库）—— 只用 `expo-sqlite` 原生接口
- ❌ 禁止新增 JavaScript 文件（必须 .ts/.tsx）
- ❌ 禁止使用 `any` 类型，除非在适配外部不可控 API 时加注释说明

## 8. License 策略

项目整体 **MIT License**。所有依赖必须是 MIT / Apache-2.0 / BSD / ISC 兼容。引入新依赖前必须检查 license。
