---
adr: "0017"
status: In progress
date: 2022-12-30
tags: [clients, watchOS]
---

# 0017 - Use Swift to build watchOS app

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

In order to build a watchOS application bundled to our iOS application we need to consider which
technology to use. The requirements would be to remain in the same tech stack if possible and to
have a watchOS app that we can build and can be bundled into our iOS app so that they are delivered
together (the purpose is not to build an independant watchOS app).

## Considered Options

- **.Net using Xamarin** - Has the advantage of keeping the same tech stack, we can share a lot more
  of code, takes less time to learn and it's easier to have reviewers, plus it'd be all in the same
  solution. The main problem here is that the watchOS development is not a priority on the .Net team
  so there are several issues that affect a lot the development experience. Furthermore, there are
  no plans to include watchOS support on MAUI and neither on .Net 7 nor on .Net 8 (at least at the
  moment of writing this).
- **Swift using UIKit** - Has the advantages of working with up to date native technology, a lot
  more documentation and examples/projects done. However moving away from the tech stack means a
  steep learning curve given that we need to also learn a new language and how things are done
  there + additional libraries we may not be using in Xamarin.
- **Swift using SwiftUI** - Idem to the previous one but with the additional advantage of having the
  `SwiftUI` framework which accelerate the development a lot, specially using Previews. However,
  it's an additional framework to learn and there are many things that are not polished enough so
  it's something to consider like some special navigations and rendering issues are not easy to
  debug.

## Decision Outcome

Chosen option: **Swift using SwiftUI**.

### Positive Consequences

- Supports watchOS fully
- We can build and debug the app properly
- Fast development with declarative UI and Previews
- Code organized using components on the UI
- Updates to the framework and the SDKs are available as soon as Apple ships them
- A lot more documentation, examples and public repositories to check

### Negative Consequences

- New tech stack to learn for the team
- Even though we can debug the app properly we can't debug the iOS and the watchOS app at the same
  time (when debugging the watchOS app, a stub iOS app is installed on the iPhone so the original
  one is overriden by the stub one)
- Set up is harder given that we need to bundle the XCode built watchOS app into the Xamarin iOS app
  and update CI accordingly
