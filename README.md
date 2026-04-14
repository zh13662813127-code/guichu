# 归处 Guichu

> 在你还来得及的时候，把他们留下来。

归处是一款**本地优先、开源**的电子族谱 App。它帮你完成三件事：

1. **一键记住祖先坟墓的 GPS 位置**，下次回乡一键导航回去
2. **把长辈的记忆、口头禅、价值观蒸馏成可对话的"数字人格"**（`.skill` 文件）
3. **（可选）克隆长辈的声音**，在他们离开后仍然可以"听到"回应

## 核心原则

- **完全本地**：所有数据存在你手机里，没有服务器，没有云端，没有账号
- **完全开源**：MIT License，代码和数据都是你的
- **BYOK**：AI 对话和声音克隆需要你自己的 API Key（推荐 DeepSeek，便宜好用）
- **极简设计**：一个大按钮记位置，3 秒完成

## 功能一览

| 功能 | 状态 | 说明 |
|------|------|------|
| 记录坟墓位置 | 已完成 | GPS 定位 + 手动地址双模式 + 照片 + 语音备注 |
| 寻路指南 | 已完成 | 路线记录 + 步进导航，调起高德/苹果/百度/Google 地图 |
| 蒸馏长辈 .skill | 已完成 | 4 步引导访谈 + 双轨人格 + LLM 流式生成 |
| 与长辈对话 | 已完成 | 基于 .skill 的流式文字对话 + 伦理护栏 |
| 声音克隆 | 开发中 | 用长辈的声音念出 AI 回复 |
| 族谱树 | 已完成 | 分层渲染 + 连线的可视化家谱 |
| 习俗指南 | 已完成 | 习俗知识库 + 日历计算引擎 + 详情页 |
| AI 族谱识别 | 已完成 | 拍摄纸质族谱照片，AI 识别后批量添加祖先 |
| 九代辈分体系 | 已完成 | 从父母辈到鼻祖辈的完整称谓 + 旁系长辈 |
| 数据导出 | 已完成 | 本地数据导出分享 |
| 头像更换 | 已完成 | 为祖先设置个性化头像 |

### 习俗指南详情

习俗指南基于本地习俗知识库（`src/features/rituals/customs/`），涵盖：

- **死亡相关事件**：头七、三七、五七、七七、百日、周年祭、三周年祭
- **年度祭扫节日**：清明节、中元节、寒衣节、除夕
- **春联颜色建议**：按去世年份推荐白/绿/红对联
- **地区覆盖**：支持按地区自定义携带物品和注意事项
- **农历日期查表**：2024-2030 年中元节、寒衣节、除夕、清明的准确公历日期

### AI 族谱识别

通过 `app/ancestors/scan.tsx` 页面，用户可以：

1. 拍摄纸质族谱的照片
2. AI（基于用户配置的 LLM）自动识别族谱中的人名和关系
3. 批量添加识别出的祖先到数据库

### 设置页面

设置页面（`app/settings/`）提供以下配置：

| 设置项 | 文件 | 说明 |
|--------|------|------|
| LLM 配置 | `llm.tsx` | 配置 AI 对话的 API 地址和密钥（OpenAI 兼容） |
| TTS 配置 | `tts.tsx` | 配置语音合成（文字转语音）服务 |
| 地区设置 | `region.tsx` | 选择所在地区，影响习俗知识库的地区覆盖 |
| 日历设置 | `calendar.tsx` | 习俗日历相关配置 |

## 截图

<!-- 截图占位区 — 请替换为实际截图 -->

| 首页 | 族谱树 | 习俗日历 | 对话 |
|------|--------|----------|------|
| ![首页](docs/screenshots/home.png) | ![族谱树](docs/screenshots/tree.png) | ![习俗日历](docs/screenshots/rituals.png) | ![对话](docs/screenshots/chat.png) |

| AI 识别 | 设置 | 寻路指南 | 蒸馏 |
|---------|------|----------|------|
| ![AI识别](docs/screenshots/scan.png) | ![设置](docs/screenshots/settings.png) | ![寻路](docs/screenshots/wayfinding.png) | ![蒸馏](docs/screenshots/distill.png) |

## 快速开始

### 前置条件

- Node.js 20+
- npm 10+
- iOS：Xcode 15+（模拟器）或实体设备
- Android：Android Studio + 模拟器 或实体设备
- Expo Go App（手机扫码测试最简方式）

### 安装

```bash
git clone https://github.com/zh13662813127-code/guichu.git
cd guichu
npm install
npx expo start
```

用手机上的 Expo Go 扫二维码即可运行。

### 运行测试

```bash
npm test
```

### 配置 AI（可选）

想要使用"与长辈对话"或"AI 族谱识别"功能，你需要：

1. 注册 [DeepSeek](https://platform.deepseek.com)（或其它 OpenAI 兼容服务）
2. 获取 API Key
3. 在 App 内 **设置 → LLM 配置** 填入

> 归处不内置任何 API Key，不收集任何数据，不联系任何我方服务器。

## 技术栈

- **Expo SDK 54** + React Native 0.81
- **TypeScript** 5.9
- **React** 19.1
- **expo-sqlite** 15.2（本地数据库）
- **NativeWind** 4.1（Tailwind CSS for RN）+ Tailwind CSS 3.4
- **Zustand** 5.0（状态管理）
- **OpenAI SDK** 4.96（LLM 适配，兼容 DeepSeek 等）
- **date-fns** 4.1（日期计算）
- **Zod** 3.24（数据校验）
- **Lucide React Native**（图标）
- **expo-location / expo-camera / expo-speech / expo-av**（原生能力）
- **Jest** + **ts-jest**（单元测试）

详见 [docs/TECH_STACK.md](docs/TECH_STACK.md)

## 项目结构

```
src/
├── adapters/        # 外部服务适配层（LLM、TTS）
├── components/      # 通用 UI 组件
├── constants/       # 常量定义（辈分体系、颜色等）
├── db/              # 数据库 Schema 与迁移
├── features/        # 功能模块
│   ├── chat/        # 与长辈对话
│   ├── distill-skill/ # 蒸馏 .skill 人格
│   ├── grave-pin/   # 坟墓位置记录
│   ├── rituals/     # 习俗指南（知识库 + 日历引擎）
│   └── voice-clone/ # 声音克隆
├── stores/          # Zustand 状态管理
└── utils/           # 工具函数
```

## 项目文档

| 文档 | 内容 |
|------|------|
| [PRD.md](docs/PRD.md) | 产品需求与验收标准 |
| [APP_FLOW.md](docs/APP_FLOW.md) | 用户流程与屏幕清单 |
| [TECH_STACK.md](docs/TECH_STACK.md) | 技术栈（版本锁定） |
| [FRONTEND_GUIDELINES.md](docs/FRONTEND_GUIDELINES.md) | 设计系统与视觉规范 |
| [BACKEND_STRUCTURE.md](docs/BACKEND_STRUCTURE.md) | 数据库 Schema 与接口 |
| [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | 构建步骤 |

## 参与贡献

1. Fork 本仓库
2. 读完 `docs/` 目录下的文档，了解产品和技术设计
3. 看 `progress.txt` 了解当前进度
4. 选一个未完成的功能或 Issue
5. 本地开发并确保 `npm test` 通过
6. 提 PR，说明改了什么、为什么改

### 习俗知识库贡献

习俗数据位于 `src/features/rituals/customs/`，欢迎补充：

- **通用习俗**：编辑 `common.json`，添加新的 `death_based` 或 `annual` 事件
- **地区差异**：在 `regions/` 目录下添加地区 JSON 文件，格式参考现有文件
- **农历日期**：在 `lunarDates.ts` 中补充更多年份的查表数据

贡献时请注意：
- 习俗数据应有可靠来源（地方志、民俗研究等）
- 日期数据需经过验证
- 保持 JSON 格式一致

## 关于 .skill 文件

`.skill` 是一种基于 Markdown + YAML frontmatter 的数字人格描述文件。它记录了长辈的：

- 身份背景
- 说话风格与口头禅
- 核心人生记忆
- 价值观
- 禁忌话题

你可以用任何文本编辑器打开和编辑它，也可以分享给其他家人。

## 伦理声明

- 这不是"复活"。对话基于你记录的内容生成，不是真人。
- 声音克隆需要本人或直系亲属授权。
- App 不做祭拜仪式、不烧纸钱、不涉及宗教。只做记录与对话。
- 一键可销毁某位长辈的全部数据。

## License

MIT
