# CLAUDE.md — 归处 Guichu AI 会话操作手册

> 此文件在每次 Claude Code 会话启动时自动加载。它告诉 AI "可以做什么" 和 "不能做什么"。

## 项目概况

- **项目名**：归处 Guichu — 本地优先的开源电子族谱
- **技术栈**：Expo SDK 50 + React Native 0.73.6 + TypeScript 5.3.3
- **路由**：expo-router 3.4.10（基于文件系统）
- **状态管理**：Zustand 4.5.2
- **数据库**：expo-sqlite 13.4.0（本地 SQLite，无服务端）
- **UI**：NativeWind 4.0.36（Tailwind for RN）
- **图标**：lucide-react-native
- **LLM**：openai SDK 4.47.1（OpenAI 兼容接口，BYOK）
- **TTS**：适配器模式（system / minimax / elevenlabs）

## 必读文档

开始任何实现之前，先读这些：

1. `docs/PRD.md` — 功能范围与验收标准
2. `docs/APP_FLOW.md` — 每个屏幕的详细流程
3. `docs/TECH_STACK.md` — 依赖版本锁定
4. `docs/FRONTEND_GUIDELINES.md` — 设计 token、组件规范
5. `docs/BACKEND_STRUCTURE.md` — 数据库 schema、适配器接口
6. `docs/IMPLEMENTATION_PLAN.md` — 构建步骤
7. `progress.txt` — 当前进度（每次会话首先读取这个）

## 规则

### 必须做的

- ✅ 每次会话开始时先读 `progress.txt`
- ✅ 使用 TypeScript，所有新文件必须 `.ts` / `.tsx`
- ✅ 遵守 `TECH_STACK.md` 中锁定的版本号
- ✅ 所有颜色从 `FRONTEND_GUIDELINES.md` 取 Tailwind token，不硬编码
- ✅ 所有图标从 `lucide-react-native` 取
- ✅ 敏感数据（API key）用 `expo-secure-store`
- ✅ 偏好设置用 `react-native-mmkv`
- ✅ 数据库操作在 `src/db/` 目录下
- ✅ 功能代码在 `src/features/` 下按功能分目录
- ✅ 适配器在 `src/adapters/` 下
- ✅ 完成一个功能后立即更新 `progress.txt`

### 禁止做的

- ❌ 不要引入任何新依赖，除非先确认 license 兼容（MIT/Apache/BSD/ISC）
- ❌ 不要在仓库中提交任何 API key、token、secret
- ❌ 不要创建 `.js` 文件
- ❌ 不要使用 `any` 类型（除非适配外部 API 并加注释）
- ❌ 不要引入任何后端/云服务 SDK（Firebase、Supabase 等）
- ❌ 不要在组件里硬编码颜色值（用 Tailwind token）
- ❌ 不要添加不在 `TECH_STACK.md` 中的包
- ❌ 不要修改数据库 schema 而不更新 migrations
- ❌ 不要在 `.skill` 文件中编造长辈没说过的事

### 代码风格

- 组件：函数式 + hooks
- 命名：文件 `kebab-case.tsx`，组件 `PascalCase`，函数/变量 `camelCase`
- 导出：命名导出（非 default），除了路由页面
- 注释语言：中文（这是中文优先项目）
- Commit message：中文，格式 `feat: 实现XX功能` / `fix: 修复XX问题`

### 测试

- 每个 `src/features/` 模块至少 3 个测试
- 测试框架：jest-expo + @testing-library/react-native
- 测试文件：`__tests__/xxx.test.ts`

## 快速参考

### 常用命令

```bash
npx expo start              # 启动开发
npx expo start --ios        # iOS 模拟器
npx expo start --android    # Android 模拟器
npm test                    # 运行测试
npx expo lint               # Lint
```

### 文件路由（expo-router）

| 路由 | 文件 |
|------|------|
| `/` | `app/index.tsx` |
| `/ancestors` | `app/ancestors/index.tsx` |
| `/ancestors/123` | `app/ancestors/[id].tsx` |
| `/ancestors/123/chat` | `app/ancestors/[id]/chat.tsx` |
| `/tree` | `app/tree.tsx` |
| `/settings` | `app/settings/index.tsx` |

### 设计 Token 速查

```
背景：bg-paper (#F7F3EC) / bg-paper-dark (#EFE9DD)
文字：text-ink (#1F1B16) / text-ink-light (#5E574E)
操作：bg-vermilion (#B33A2A)
成功：bg-jade (#3F7A5E)
圆角：rounded-sm(6) / rounded-md(10) / rounded-lg(16) / rounded-full
间距：xs(4) sm(8) md(12) base(16) lg(24) xl(32)
```
