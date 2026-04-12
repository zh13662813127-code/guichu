# FRONTEND_GUIDELINES — 归处 Guichu 设计系统

> 每个视觉决策都锁定。AI 在写组件时只能从这份文件取值。

## 1. 设计哲学

**克制 / 安静 / 留白**。归处是一个关于死亡与思念的 App，不能花哨。整个 UI 应该像一本宣纸笔记本，而不是一个游戏。

三原则：
1. **一屏一事**：一个屏幕只做一件事。Home 只有一个按钮。
2. **大而清晰**：长辈们也可能上手；按钮 ≥56pt，正文字号 ≥17pt。
3. **不打扰**：不弹通知、不放广告、不诱导分享。

## 2. 调色板（锁定）

主色调取自宣纸 / 墨 / 朱砂的传统中国色。

| 名称 | 用途 | Hex | Tailwind token |
|------|------|-----|----------------|
| `paper` | 主背景（宣纸） | `#F7F3EC` | `bg-paper` |
| `paper-dark` | 卡片底色 | `#EFE9DD` | `bg-paper-dark` |
| `ink` | 主文本（墨黑） | `#1F1B16` | `text-ink` |
| `ink-light` | 次要文本 | `#5E574E` | `text-ink-light` |
| `ink-mute` | 禁用/占位 | `#A39A8C` | `text-ink-mute` |
| `vermilion` | 主操作色（朱砂） | `#B33A2A` | `bg-vermilion` |
| `vermilion-pressed` | 主按钮按压态 | `#8C2A1E` | `bg-vermilion-pressed` |
| `jade` | 成功（青玉） | `#3F7A5E` | `bg-jade` |
| `amber` | 警告（琥珀） | `#C68A2E` | `bg-amber` |
| `crimson` | 错误（绛红） | `#8B1E1E` | `bg-crimson` |
| `divider` | 分割线 | `#D9D2C2` | `border-divider` |

**深色模式（v0.3 加入）**：

| 名称 | Hex |
|------|-----|
| `paper` | `#1A1714` |
| `paper-dark` | `#221E19` |
| `ink` | `#EDE6D6` |
| `ink-light` | `#A39A88` |
| `vermilion` | `#D85544` |

## 3. 字体

### iOS
- 中文：苹方 `PingFang SC`
- 英文/数字：`SF Pro Text`

### Android
- 中文：思源黑体 `Source Han Sans SC`
- 英文/数字：`Roboto`

### 字号刻度

| Token | Size | Line | 用途 |
|-------|------|------|------|
| `text-display` | 36pt | 44 | 主页大按钮上的字 |
| `text-title` | 24pt | 32 | 屏幕标题 |
| `text-headline` | 20pt | 28 | 卡片标题、人名 |
| `text-body-lg` | 18pt | 26 | 长辈说的话、对话气泡 |
| `text-body` | 17pt | 24 | 正文（默认） |
| `text-caption` | 14pt | 20 | 次要信息 |
| `text-meta` | 12pt | 16 | 时间戳、坐标 |

字重：`Regular (400)` / `Medium (500)` / `Semibold (600)`。**不使用 Bold/Light**，避免在中文里显得突兀。

## 4. 间距刻度（4pt grid）

```
xs: 4   sm: 8   md: 12   base: 16   lg: 24   xl: 32   2xl: 48   3xl: 64
```

布局规则：
- 屏幕左右安全区 padding：`base (16)`
- 卡片之间垂直间距：`md (12)`
- 卡片内 padding：`base (16)`
- 段落之间：`lg (24)`

## 5. 圆角

| Token | px | 用途 |
|-------|----|----|
| `rounded-sm` | 6 | 输入框、tag |
| `rounded-md` | 10 | 卡片 |
| `rounded-lg` | 16 | 大卡片 |
| `rounded-2xl` | 24 | 弹窗 |
| `rounded-full` | 9999 | 主按钮、头像 |

## 6. 阴影

只用一档极轻的阴影，避免拟物：

```css
shadow-soft: 0 2px 8px rgba(31, 27, 22, 0.06);
```

## 7. 核心组件规范

### 7.1 PrimaryButton
- 形状：胶囊（`rounded-full`）
- 高度：`56pt`（最小可点区域）
- 背景：`vermilion` / 按压 `vermilion-pressed`
- 文字：`text-body` / Semibold / `paper`
- 按压触觉：`Haptics.medium`

### 7.2 BigCircleButton（Home 页专用）
- 圆形，直径 `200pt`
- 背景：`vermilion`，外圈一条 `2pt` 同色阴影
- 文字：`📍 记录此地` / `text-display` / `paper`
- 按下：缩放到 `0.96` + 触觉强反馈
- 长按 200ms 触发主行为（避免误触）

### 7.3 AncestorCard
```
┌──────────────────────────┐
│  [圆形头像 64pt]          │
│   名字（Headline）        │
│   关系 · 1938-2020 (caption)│
│   ✦ 已记录访谈              │
│   📍 已定位墓地             │
└──────────────────────────┘
```
- 背景 `paper-dark` / 圆角 `rounded-lg` / padding `base`

### 7.4 ChatBubble
- 长辈：左对齐 / 背景 `paper-dark` / 文字 `ink` / 字号 `text-body-lg`
- 用户：右对齐 / 背景 `vermilion` / 文字 `paper`
- 圆角 `rounded-lg`，发送方那一角改为 `rounded-sm`
- 最大宽度 `80%`

### 7.5 InputField
- 高度 `48pt`
- 背景 `paper-dark`
- 圆角 `rounded-sm`
- 占位文字 `ink-mute`

### 7.6 BottomTab
- 4 个 tab，高度 `64pt + safeArea`
- 图标 `lucide-react-native`，尺寸 `24pt`
- 选中：图标 + 文字变为 `vermilion`，未选中 `ink-light`

## 8. 图标库

固定使用 `lucide-react-native`。常用图标：

| 用途 | 图标名 |
|------|--------|
| 主页 | `Home` |
| 长辈 | `Users` |
| 族谱 | `Network` |
| 设置 | `Settings` |
| 录音 | `Mic` |
| 拍照 | `Camera` |
| 定位 | `MapPin` |
| 导航 | `Navigation` |
| 对话 | `MessageCircle` |
| 播放 | `Play` |
| 暂停 | `Pause` |
| 删除 | `Trash2` |

## 9. 动效

- **不滥用动画**。归处的节奏是慢的、安静的。
- 默认转场：`reanimated` 的 `fade` 200ms
- 按压反馈：scale 0.96 / 100ms
- 列表加载：骨架屏，不用 spinner
- 录音时：脉冲圆环动画（呼吸感，1.8s 一次）

## 10. 文案语气

- **不卖惨，不煽情**。文案应该像一个老朋友的便签。
- 用"您"称呼长辈，用"你"称呼用户。
- 错误提示不用"出错了"，用"再试一次"。
- 不用 emoji 装饰每段文字，只在关键按钮里用一个。
- ✘"赶紧记录吧！趁还来得及！" → ✓"按一下，记住此地。"

## 11. 响应式断点

| 名称 | 宽度 | 用途 |
|------|------|------|
| `phone` | 0–600 | 默认 |
| `tablet` | 601–960 | 双栏：左列表右详情 |
| `desktop` | 960+ | 不支持，跳到 phone |

## 12. 可访问性

- 所有可点元素 `accessibilityLabel` 必填
- 颜色对比度 ≥ WCAG AA（4.5:1）
- 支持系统字号缩放（最大 200%）
- VoiceOver/TalkBack 完整支持
- 录音按钮支持双击触发（手抖用户）

## 13. tailwind.config.js（最终值）

完整配置见 `tailwind.config.js`，所有 token 必须从这里取，**禁止在组件里硬编码颜色和尺寸**。
