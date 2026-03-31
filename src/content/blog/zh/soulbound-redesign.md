---
title: "Soulbound：用 AI 重设计一款 iOS App 的全过程"
date: 2026-03-31
tags: ["iOS", "SwiftUI", "Design", "AI"]
lang: "zh"
translationSlug: "soulbound-redesign"
excerpt: "一个 AI 角色陪伴 App 的完整 UI 重设计记录：从莫兰迪配色到灵魂小球，从浏览器 Mockup 到 89 个文件的全量迁移，全程由 Claude Code 驱动。"
canvasRender: false
---

## 从 Connor Assistant 到 Soulbound

Connor Assistant 是我做的一款 iOS AI 角色陪伴 App。它有六个模块——角色对话、互动剧情、角色创建、记忆系统、转生迁移、身份卡管理。功能不少，但 UI 一直停留在"能用就行"的状态：系统默认蓝、灰色卡片、垂直列表、SF Symbol 图标。

这次重设计的目标很明确：让它看起来配得上 App Store。

## 设计方向：浪漫的理性

花了不少时间在小红书和 Dribbble 上找参考。最终确定了两套主题：

**日间 — 莫兰迪色系**
雾蓝 #6F8AA7 做主色，藕粉 #D7B3BE 做辅助，杏仁 #E5CFC7 做点缀。低饱和度，不刺眼，但不会无聊。

**夜间 — 漆黑 × 蒂芙尼蓝**
背景 #161823 几乎纯黑但带微紫调，蒂芙尼蓝 #81D8D0 一刀切入打破沉闷。层级不靠阴影，靠黑橡 #202F39 和漆黑之间的明度差。

配色确认后，我让 Claude 在浏览器里生成了实时预览页面，把两套主题的手机 Mockup 并排放在一起对比。这比盯 JSON 色值直观多了。

## 灵魂小球

每个 App 都需要一个灵魂。Soulbound 的灵魂是一颗对话气泡形状的小球——圆圆的身体，极简的笑脸，底部一个小尾巴。

日间版是珠光乳白，带微妙的粉蓝紫虹彩。夜间版是深灰蓝球体，眼睛和嘴巴会发光。

它出现在 App 的每个角落：首页 Logo 旁边、生成等待页面（弹跳 + "注入灵魂中…"）、聊天中作为 AI 头像、空状态的友好提示。

## 技术实现

整个重设计在 Claude Code 里完成，用了 Subagent-Driven Development——每个任务派一个独立的 Agent 执行，做完自动 review。

### Phase 1：地基

`Theme.swift` 是一切的基础。一个 struct，接收 `ColorScheme`，吐出所有设计 token。通过 SwiftUI 的 `@Environment(\.theme)` 注入到每个 View。

```swift
@Environment(\.theme) private var theme
// theme.primary, theme.surface, theme.text, theme.cardRadius...
```

### Phase 2：核心页面

首页从垂直列表变成了 2×3 网格。角色和剧情选择页参考了 Peacock 的设计——顶部一张大 Hero 卡，下面横滑小卡片。

聊天背景支持用户上传图片。技术上是用 15 级渐变停点实现的：图片铺满全屏，上面盖一层从边缘到中心逐渐透明的主题色渐变。没有硬边，没有横杠，过渡完全连续。

### Phase 3-4：全量迁移

63 个 View 文件，1337 处需要替换。`.blue` → `theme.primary`，`Color(.systemGray5)` → `theme.surface`，`.cornerRadius(16)` → `theme.cardRadius`。

这种活最适合给 Agent 干——4 个 Agent 并行，按复杂度分批，每批 14-17 个文件。不到 20 分钟全部搞定。

### Phase 5：打磨

iOS 26 的 Liquid Glass 效果加到了导航栏和首页卡片上。聊天气泡在有自定义背景时自动降低透明度。首页卡片有交错渐入动画，灵魂小球加载页有微粒 sparkle 效果。

## 最终数据

- 20 个 commit
- 89 个文件改动
- +2993 / -2022 行
- 12 个新组件
- 从设计到实现大约 3 小时

## 感想

这次重设计让我意识到 AI 辅助开发的真正优势不是"写代码快"，而是"不怕改"。以前改 63 个文件的配色是不敢想的事，现在只是一句 prompt 加 20 分钟等待。

设计本身反而是最费时间的部分——反复看参考图、调配色、在浏览器里预览 Mockup、确认布局。这些需要人的审美判断，AI 只是把你的判断高效地落地了。
