# IMPLEMENTATION_PLAN — 归处 Guichu 构建顺序

> 步骤越多，AI 猜测越少。每一步都对应一个可验证的交付物。

## 阶段 0：项目初始化

### 0.1 初始化 Expo 项目
```bash
npx create-expo-app@latest guichu --template expo-template-blank-typescript
cd guichu
```

### 0.2 安装全部依赖
按 `TECH_STACK.md` 的确切版本安装。分批执行避免冲突：
```bash
# 核心
npx expo install expo-router expo-location expo-camera expo-av expo-file-system expo-sqlite expo-image-picker expo-linking expo-sharing expo-document-picker expo-secure-store expo-haptics react-native-maps

# UI
npx expo install nativewind tailwindcss react-native-reanimated react-native-gesture-handler react-native-svg
npm install lucide-react-native

# 状态 + 工具
npm install zustand react-native-mmkv date-fns nanoid zod

# LLM
npm install openai eventsource-parser

# 开发
npm install -D @types/react @types/node eslint eslint-config-expo prettier jest jest-expo @testing-library/react-native
```

### 0.3 创建文件夹结构
按 `TECH_STACK.md` 第 6 节手动创建所有目录（不靠脚手架）。

### 0.4 配置 tailwind
按 `FRONTEND_GUIDELINES.md` 创建 `tailwind.config.js`，写入所有 design token。

### 0.5 配置 expo-router
在 `app.json` 设置 `"scheme": "guichu"`。创建 `app/_layout.tsx` 根布局。

### 0.6 验证
```
✅ `npx expo start` 能启动
✅ 模拟器显示空白页 + 底部 tab 框架
```

---

## 阶段 1：F1 — 记录坟墓位置（MVP 核心）

### 1.1 初始化 SQLite 数据库
- 创建 `src/db/schema.ts`，写入所有 CREATE TABLE SQL
- 创建 `src/db/migrations.ts`，迁移逻辑
- 创建 `src/db/database.ts`，导出 `getDatabase()` 单例

### 1.2 构建 BigCircleButton 组件
- 按 `FRONTEND_GUIDELINES.md` 7.2 实现
- 200pt 圆形 + vermilion + 触觉反馈 + 缩放动画
- 长按 200ms 触发

### 1.3 实现定位逻辑
- `src/features/grave-pin/useGravePin.ts`
- 请求 `expo-location` 权限
- 获取高精度坐标（精度 ≤10m 自动确认）
- 超时 10 秒降级

### 1.4 构建确认页
- 按 `APP_FLOW.md` 第 2 节实现
- 显示坐标 + 精度
- 「关联长辈」选择器（可跳过）
- 「加照片」调起 `expo-image-picker`
- 「加语音」调起 `expo-av` 录音

### 1.5 持久化
- 写入 `grave_locations` 表
- 照片压缩后存入 `/photos/`
- 音频存入 `/audio/`

### 1.6 验证
```
✅ 按下大按钮 → 定位 → 确认 → 保存 → Toast
✅ 杀掉 App 重开，数据仍在
✅ 飞行模式下仍能保存（离线）
```

---

## 阶段 2：F2 — 寻路指南 + 导航

### 2.1 长辈列表页
- `app/ancestors/index.tsx`
- `AncestorCard` 组件（FRONTEND_GUIDELINES 7.3）
- 从 SQLite 查询，按 generation 排序

### 2.2 长辈详情页
- `app/ancestors/[id].tsx`
- 展示头像、姓名、关系、生卒年
- 墓地位置卡片 + 寻路指南入口
- 功能入口：寻路指南 / 访谈 / 对话 / 声音训练

### 2.3 新建长辈页
- `app/ancestors/new.tsx`
- 最简表单：姓名（必填）、关系（下拉）、性别、生年、卒年

### 2.4 路线记录模式
- `app/ancestors/[id]/route/record.tsx`
- 全屏模式，底部常驻「📌 记录路线点」大按钮
- 每个路线点：自动 GPS + 拍照/相册选图（必选≥1张）+ 文字备注 + 语音
- 写入 `route_waypoints` 表，`sort_order` 自增
- 终点自动关联 `grave_locations`

### 2.5 寻路指南页（查看）
- `app/ancestors/[id]/route.tsx`
- 竖向图文列表：每个路线点 = 大图 + 备注 + 两点间距离
- 支持编辑路线点（改图片/备注）、删除、中间插入
- 底部两个导航按钮：「导航到起点」/「导航到终点」

### 2.6 步进寻路模式
- 全屏卡片：一次显示一个路线点的大图 + 备注
- 「上一步 / 下一步」切换
- 最后一步显示「你到了」

### 2.7 调起第三方地图
- `src/features/grave-pin/useNavigate.ts`
- 支持 Apple Maps / 高德 / 百度 / Google Maps
- 用户偏好存 MMKV

### 2.8 验证
```
✅ 列表页展示已录入的长辈
✅ 详情页展示墓地位置 + 寻路指南入口
✅ 记录路线：走 5 个点 → 拍照 → 备注 → 保存
✅ 寻路指南：图文列表 + 两点间距离正确
✅ 步进模式：一步步翻页 → 到终点
✅ 导航按钮 → 调起手机地图 App
✅ 新建长辈流程 30 秒可完成
✅ 路线点可编辑/删除/插入
```

---

## 阶段 3：F3 — 蒸馏长辈 .skill

### 3.1 设置页：LLM 配置
- `app/settings/llm.tsx`
- Provider 下拉、baseURL、apiKey（密码模式）、model
- 「测试连接」按钮
- 存储到 `expo-secure-store`

### 3.2 LLM 适配器
- `src/adapters/llm/base.ts` — 接口定义
- `src/adapters/llm/openai-compat.ts` — 用 `openai` SDK 实现
- 流式输出 + abort 支持 + 错误处理

### 3.3 访谈模板
- `src/features/distill-skill/templates.ts`
- 5 大主题 × 4 个默认问题 = 20 问
- 支持用户增删问题

### 3.4 访谈页
- `app/ancestors/[id]/interview.tsx`
- 按 `APP_FLOW.md` 第 4 节实现
- 逐题展示 + 长按录音 + 自动计时
- 进度条 `3/20`
- 录音存入 SQLite `interview_answers`

### 3.5 .skill 生成
- `src/features/distill-skill/generateSkill.ts`
- 拼接所有转写文本 → 调用 LLM
- prompt 模板：要求输出符合 `BACKEND_STRUCTURE.md` 第 7 节的格式
- 返回 Markdown 存入 `ancestors.skill_content`

### 3.6 .skill 预览 + 编辑 + 导出
- 渲染 Markdown
- 简单文本编辑器
- `expo-sharing` 导出

### 3.7 .skill 导入
- `expo-document-picker` 选择 .md 文件
- 解析 frontmatter
- 存入对应长辈

### 3.8 验证
```
✅ 配置 DeepSeek key → 测试连接 → 成功
✅ 访谈 20 题 → 录音 → 保存
✅ 点击蒸馏 → 等待 → 生成 .skill
✅ .skill 内容格式正确
✅ 导出/导入 .skill 文件
```

---

## 阶段 4：F4 — 与长辈对话

### 4.1 对话页
- `app/ancestors/[id]/chat.tsx`
- ChatBubble 组件（FRONTEND_GUIDELINES 7.4）
- 底部输入框 + 发送按钮

### 4.2 对话逻辑
- `src/features/chat/useChat.ts`
- 组装 messages：system(.skill + 安全护栏) + 历史 + 用户输入
- 调用 LLM 适配器流式输出
- 逐 token 渲染气泡

### 4.3 伦理弹窗
- 首次进入对话页弹窗（APP_FLOW 第 5 节）
- 标记 MMKV `ethics_dismissed_{ancestor_id}`

### 4.4 对话历史
- 写入 `conversations` + `messages` 表
- 支持清空、导出 Markdown

### 4.5 验证
```
✅ 首次弹伦理提示
✅ 发消息 → 流式回复 → 风格匹配 .skill
✅ 杀掉重开 → 历史还在
✅ 20 轮对话流畅
```

---

## 阶段 5：F5 — 声音克隆（可选）

### 5.1 设置页：TTS 配置
- `app/settings/tts.tsx`
- 引擎单选 + apiKey

### 5.2 TTS 适配器
- `src/adapters/tts/base.ts` — 接口
- `src/adapters/tts/system.ts` — expo-speech 实现
- `src/adapters/tts/minimax.ts` — MiniMax API
- `src/adapters/tts/elevenlabs.ts` — ElevenLabs API

### 5.3 声音训练页
- 收集样本录音（复用访谈录音 + 新增录制）
- 伦理确认弹窗
- 调用 `cloneVoice()` → 保存 `voice_id`

### 5.4 对话页集成语音
- 开关：「用 xx 的声音念」
- 每条回复调用 `speak()` 播放

### 5.5 验证
```
✅ system TTS 零配置即可念出回复
✅ 配置 MiniMax → 克隆 → 用克隆声音播放
```

---

## 阶段 6：F6 — 族谱树

### 6.1 树渲染
- `app/tree.tsx`
- 用 `react-native-svg` 画节点 + 连线
- 从 `ancestors` 表读数据，按 `generation` + `parent_id` 构建树

### 6.2 交互
- 点击节点跳转详情页
- 长按弹菜单（添加关系/编辑/删除）
- 双指缩放

### 6.3 验证
```
✅ 3 代 5 人渲染正确
✅ 点击跳转
✅ 添加父母/子女/配偶
```

---

## 阶段 7：收尾

### 7.1 首次启动引导
- 欢迎页 → 权限请求 → 进入 Home

### 7.2 数据导入导出
- 导出 zip（BACKEND_STRUCTURE 第 9 节）
- 导入 zip + 合并/覆盖选择

### 7.3 关于页
- 版本号、GitHub 链接、MIT、隐私声明

### 7.4 测试
- 每个 feature 模块 ≥3 个单元测试
- 核心路径 E2E（可选 Detox）

### 7.5 文档完善
- 更新 README.md 安装/使用说明
- 截图 + GIF 演示

### 7.6 最终验证
```
✅ clone 仓库 → npm install → expo start → 15 分钟跑起来
✅ 全流程走一遍无报错
✅ 单元测试全绿
✅ README 步骤无遗漏
```
