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
| 记录坟墓位置 | 开发中 | 一键 GPS 定位 + 照片 + 语音备注 |
| 导航回坟墓 | 开发中 | 调起高德/苹果/百度/Google 地图 |
| 蒸馏长辈 .skill | 开发中 | 引导式访谈 → AI 生成数字人格 |
| 与长辈对话 | 开发中 | 基于 .skill 的文字/语音对话 |
| 声音克隆 | 开发中 | 用长辈的声音念出 AI 回复 |
| 族谱树 | 开发中 | 简单可视化家谱 |

## 快速开始

### 前置条件

- Node.js 20+
- npm 10+
- iOS：Xcode 15+（模拟器）或实体设备
- Android：Android Studio + 模拟器 或实体设备
- Expo Go App（手机扫码测试最简方式）

### 安装

```bash
git clone https://github.com/YOUR_USERNAME/guichu.git
cd guichu
npm install
npx expo start
```

用手机上的 Expo Go 扫二维码即可运行。

### 配置 AI（可选）

想要使用"与长辈对话"功能，你需要：

1. 注册 [DeepSeek](https://platform.deepseek.com)（或其它 OpenAI 兼容服务）
2. 获取 API Key
3. 在 App 内 **设置 → LLM 配置** 填入

> 归处不内置任何 API Key，不收集任何数据，不联系任何我方服务器。

## 技术栈

- Expo SDK 50 + React Native
- TypeScript
- expo-sqlite（本地数据库）
- NativeWind（Tailwind CSS for RN）
- Zustand（状态管理）
- OpenAI 兼容 SDK（LLM 适配）

详见 [docs/TECH_STACK.md](docs/TECH_STACK.md)

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
2. 读完 `docs/` 目录下的文档
3. 看 `progress.txt` 了解当前进度
4. 选一个未完成的功能
5. 提 PR

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
