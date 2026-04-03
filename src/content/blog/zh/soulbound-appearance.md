---
title: "让每个角色都有自己的「皮肤」：Soulbound 的外观自定义系统"
date: 2026-04-03
tags: ["iOS", "SwiftUI", "AI", "UI"]
lang: "zh"
translationSlug: "soulbound-appearance"
excerpt: "同一个 app，跟不同的角色聊天，气泡颜色、字体大小、背景风格都可以不一样。这不是换主题——是给每个角色一套独立的视觉身份。从数据模型到三级覆盖机制到一个藏了两小时的 isLoading bug，记录整个设计和实现过程。"
canvasRender: false
---

## 为什么要做这个

Soulbound 是一个 AI 角色陪伴 app。你可以创建多个角色，每个角色有自己的性格、记忆、世界书。但有一个问题：所有角色的聊天界面看起来都一样。

跟一个温柔的角色聊天，气泡是蓝粉色。跟一个赛博朋克风的角色聊天，气泡还是蓝粉色。视觉上没有区分感。

SillyTavern 和 RikkaHub 的做法是全局换主题。但我觉得更好的体验是：**每个角色可以有自己的视觉风格**，不影响其他角色。就像给每个角色穿了不同的衣服。

## 三级覆盖机制

设计的核心是一个三级优先级链：

```
角色级配置  >  全局配置  >  Theme 默认值
```

`AppearanceConfig` 是一个全 Optional 的 Codable 结构体。每个字段为 nil 表示"使用上级默认"。`AppearanceManager.resolve()` 按优先级合并，输出一个全非 Optional 的 `ResolvedAppearance`，直接用于渲染。

```swift
func resolve(characterId: UUID?, theme: Theme) -> ResolvedAppearance {
    let global = globalConfig
    let perChar = characterId.flatMap { loadForCharacter($0) }
    
    return ResolvedAppearance(
        bubbleUserColor: colorFor(perChar?.bubbleUserColor, global.bubbleUserColor, default: theme.userBubble),
        // ... 每个字段都是这个模式
    )
}
```

这和 CSS 的继承一模一样：子元素没设的属性，从父元素继承；父元素没设的，用浏览器默认。

## 可以调什么

四个维度，覆盖了聊天界面的所有视觉元素：

**气泡**：用户/AI 气泡颜色、透明度（50%-100%）、圆角（8-24pt）。

**主题色**：主色调、副色调、强调色。覆盖 Theme 系统但不破坏它——Theme.swift 完全不动。

**字体**：大小（12-24pt）、字体族（系统/圆角/等宽/衬线）。

**背景**：无/纯色/渐变/图片四选一。纯色和渐变用 ColorPicker 选色，图片复用已有的 BackgroundManager。

## UI 设计

两个入口：

**Settings → Appearance** — 全局配置。设一次，所有角色默认用这套。

**ChatView → ... 菜单 → Chat Appearance** — 角色级覆盖。每个 section 有一个 "Use Custom" toggle，关掉就回退到全局值。预览区实时显示当前设定效果。

剧情模式也有同样的入口，工具栏上一个画笔按钮。

## 一个藏了两小时的 bug

实现完毕，测试时发现：Chat 模式的自定义外观怎么都不生效。但剧情模式可以。同一个 `CharacterAppearanceView`，一个能保存一个不能。

加了日志，发现所有 `saveConfig()` 调用都打印 `skipped (isLoading)`。`isLoading` 永远没变成 `false`。

原因藏在 `loadConfig()` 里：

```swift
private func loadConfig() {
    loadGlobalDefaults()
    
    // 首次使用时，没有 per-character config
    guard let config = manager.loadForCharacter(characterId) else { return }  // ← 这里 return 了
    
    // ... 加载 per-character 覆盖 ...
    
    DispatchQueue.main.async { isLoading = false }  // ← 永远执行不到
}
```

首次打开外观设置时，没有保存过的 per-character config，`guard` 直接 return。`isLoading = false` 在 return 之后，永远执行不到。所有后续的保存操作都被 `guard !isLoading` 拦住。

一行修复：

```swift
guard let config = manager.loadForCharacter(characterId) else {
    DispatchQueue.main.async { isLoading = false }  // ← 加在 return 之前
    return
}
```

剧情模式能工作是因为它之前恰好触发过一次保存（创建剧情时有初始数据），所以 `guard` 没有走 early return。

这种 bug 最阴险的地方在于：它只在**首次使用**时触发。如果你之前保存过一次配置，后续都正常。测试时如果先测了保存再测的首次打开，就永远发现不了。

## 技术选择

**存储**：UserDefaults，JSON 编码。不值得用 SwiftData——配置数据小且低频。

**不改 Theme**：外观自定义是覆盖层，不是替换。Theme.swift 保持双主题系统（Light Morandi + Dark 漆黑蒂芙尼蓝）完全不动。自定义外观在渲染时覆盖 Theme 的默认值。

**自动保存**：用 `configFingerprint`（所有字段拼接的字符串）+ 单个 `onChange` 监听。比给每个字段加 `onChange` 更简洁，也避免了 Swift 类型检查器在 17+ 个 onChange 链上超时。

**ColorPicker P3 安全**：iOS 的 ColorPicker 在广色域屏幕上返回 P3 色域的 Color。直接 `UIColor.getRed()` 可能在非 sRGB 颜色上返回 0,0,0。转换到 sRGB 再读取分量。
