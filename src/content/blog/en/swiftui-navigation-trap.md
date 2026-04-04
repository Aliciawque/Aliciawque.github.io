---
title: "The SwiftUI Navigation Trap: How @Published Killed My NavigationStack"
date: 2026-04-04
tags: ["iOS", "SwiftUI", "Debugging"]
lang: "en"
translationSlug: "swiftui-navigation-trap"
excerpt: "A NavigationLink that navigates then immediately pops back. An infinite reload loop. 10+ debugging rounds to find the root cause: @Published cascade re-rendering destroying NavigationStack state. A war story about SwiftUI's most insidious footgun."
canvasRender: false
---

## The Symptom

Tap "Start Chat." ChatView appears for about 0.8 seconds — you can see the welcome message render — then it snaps back to the character list. Tap again. Same thing. An infinite loop of navigate-pop-navigate-pop, with the character list reloading from disk every cycle.

This is in Soulbound, an iOS AI companion app with 10 feature modules, 260+ changed files on the feature branch. The chat navigation had been working for months. Then one day it stopped.

## The Investigation (10+ Rounds)

### Round 1: PNG Format

The first clue was `Read_user_chunkIDOT:918: invalid PNG file: extra chunks between iDOT and IDAT`. Our character card system embeds metadata as PNG tEXt chunks. The insertion code placed them between Apple's proprietary iDOT chunk and IDAT — iOS's image decoder rejected this.

**Fix**: Insert tEXt chunks immediately after IHDR, before any Apple-specific chunks.

This stopped the error messages but didn't fix the navigation.

### Round 2: 31MB Avatar

The avatar image from the photo picker was being stored as raw PNG data — 31MB uncompressed. Every time the character list rendered, `UIImage(data:)` decompressed 31MB to ~120MB RGBA. Multiple re-renders = OOM = Signal 9.

**Fix**: Resize to 512px max dimension before saving. 31MB → 1.7MB.

Navigation still broken.

### Round 3: The Infinite Loop

Added diagnostic logging. The pattern was unmistakable:

```
ChatView.task END
CharacterListView.onAppear — hasLoaded=false, characters=0
CharacterListView.onDisappear
ChatView.onDisappear
CharacterListView.task — loadCharacters()
```

CharacterListView was being **completely recreated** every cycle. `hasLoaded=false` meant it was a brand new instance. `characters=0` meant its `@State` was reset.

### Round 4-8: Whack-a-Mole

Each round eliminated one trigger source:

- **`@EnvironmentObject coordinator` on HomeView** → removed (coordinator injected at App level, children inherit)
- **`@Query ownedPets` on HomeView** → extracted to isolated sub-view (SwiftData changes triggered HomeView re-render)
- **`@Published characters` array replacement** → added ID comparison guard (only replace if IDs actually changed)
- **`selectCharacter()` duplicate calls** → added same-ID guard
- **`loadCharacters()` isLoading toggle** → removed @Published isLoading from the method

None of these fixed it. The loop continued.

### Round 9: The Real Trigger

The diagnostic logs revealed the smoking gun:

```
ChatView.task START for Connor
🎯 selectCharacter CHANGED: nil → Connor     ← @Published fires
...
ChatView.task END for Connor
🏠 HomeView.body EVALUATED                    ← cascade!
CharacterListView.onAppear — hasLoaded=false  ← recreated!
```

`coordinator.selectCharacter(character)` in ChatView's `.task` set `@Published var currentCharacter`. This single property change triggered:

1. `AppCoordinator.objectWillChange` fires
2. `ConnorAssistantApp` (holding coordinator as `@StateObject`) re-evaluates its `body`
3. `HomeView()` is recreated
4. `TabView` is recreated
5. `NavigationStack` is recreated
6. `CharacterListView` gets a brand new instance (all `@State` reset)
7. The active `NavigationLink` no longer exists
8. `ChatView` is popped
9. New `CharacterListView.task` fires `loadCharacters()` 
10. Goto 1

### Round 10: The Fix

The fix was conceptually simple but required understanding the entire cascade:

**ChatView.task must NOT trigger any @Published changes on AppCoordinator.**

```swift
// BEFORE (broken):
.task {
    coordinator.selectCharacter(character)  // 💥 sets @Published
    await loadMessages()                    // uses coordinator.currentCharacter
}

// AFTER (working):
.task {
    await loadMessages()  // uses character.id directly
}
```

Supporting changes:
- `loadMessages()` calls `coordinator.chatService.getMessages(for: character.id)` directly instead of `coordinator.getMessages()` (which relied on `currentCharacter`)
- `sendMessage()` sets `currentCharacter` lazily on first user message — by then, navigation is fully settled
- `ConnorAssistantApp` uses `@State` (not `@StateObject`) to hold coordinator, preventing App.body from subscribing to `objectWillChange`

## The Rule

**Never trigger @Published changes from a NavigationLink destination's `.task` or `.onAppear`.**

The change propagates up through every `@EnvironmentObject`, `@StateObject`, and `@ObservedObject` subscriber in the view hierarchy. If any ancestor view re-renders and the NavigationStack is recreated, your navigation state is destroyed.

## The Broader Lesson

SwiftUI's reactive system is a directed graph. When you set a `@Published` property, you're not just updating a value — you're sending a shockwave through every view that observes the owning object. In a typical app:

```
@Published change
  → ObservableObject.objectWillChange
    → App.body (if @StateObject)
      → HomeView.body
        → TabView recreated
          → NavigationStack recreated
            → All @State reset
              → NavigationLink gone
                → Destination popped
```

The debugging was hard because each node in this chain seemed correct in isolation. The PNG format issue was real. The 31MB avatar was real. The @Query on HomeView was real. But they were all symptoms of the same root cause: **an @Published change at the wrong time in the wrong place.**

## Checklist

For anyone building SwiftUI apps with NavigationStack:

1. **Audit your NavigationLink destinations' `.task` blocks** — do they set any @Published property? If yes, that's a ticking bomb
2. **Check your App struct** — `@StateObject` subscribes to ALL @Published changes. Consider `@State` for reference types in iOS 17+
3. **Don't put @Query or @EnvironmentObject on TabView container views** — any reactive trigger will recreate all tabs
4. **Pass data through init parameters** — don't read from coordinator in `.task` if you can avoid it
5. **Test with diagnostic logging** — add `NSLog` to `onAppear`/`onDisappear`/`.task` on both the list view and detail view. If the list view's `onAppear` fires after the detail view's `.task` ends, you have the cascade problem
