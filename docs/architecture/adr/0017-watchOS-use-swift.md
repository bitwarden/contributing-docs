---
adr: "0017"
status: Done
date: 2022-12-30
tags: [mobile, watchOS]
---

# 0017 - Use Swift to build watchOS app

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

We would like to ship a watchOS application bundled together with the regular iOS application. The
watchOS application will act as a companion application and initially offer a way to view TOTP codes
from the watch which were previously synchronized from the iPhone.

## Considered Options

- [.Net using Xamarin](https://learn.microsoft.com/en-us/xamarin/ios/watchos/)
- [Swift using WatchKit](https://developer.apple.com/documentation/watchkit/)
- [Swift using SwiftUI](https://developer.apple.com/xcode/swiftui/)

## Decision Outcome

Chosen option: **Swift using SwiftUI**.

### Positive Consequences

- Supports watchOS fully
- We can build and debug the app properly
- Fast development with declarative UI and Previews to enhance the dev experience
- Code organized using components on the UI
- Updates to the framework and the SDKs are available as soon as Apple ships them
- A lot more documentation, examples and public repositories to check

### Negative Consequences

- New tech stack to learn for the team
- Even though we can debug the app properly we can't debug the iOS and the watchOS app at the same
  time (when debugging the watchOS app, a stub iOS app is installed on the iPhone so the original
  one is overridden by the stub one)
- Set up is harder given that we need to bundle the XCode built watchOS app into the Xamarin iOS app
  and update CI accordingly

## Pros and Cons of the Options

### .Net using Xamarin

- :white_check_mark: Keeps same tech stack
- :white_check_mark: Shares a lot of code
- :white_check_mark: Easier learning curve and reviews
- :white_check_mark: Easy integration into the regular iOS app
- :no_entry: Several important issues affecting the watchOS dev experience, particularly can't debug
  correctly
- :no_entry: watchOS platform not being a priority for the .Net team
- :no_entry: No plans to include watchOS support on MAUI and neither on .Net 7 nor on .Net 8

### Swift using WatchKit

- :white_check_mark: It's the native approach meaning it's always up to date
- :white_check_mark: Lots of documentation and examples/projects to look
- :white_check_mark: Debugging works as expected
- :no_entry: Steep learning curve (language + watch related stuff)
- :no_entry: Hard to integrate to the regular iOS app

### Swift using SwiftUI

- :white_check_mark: It's the native approach meaning it's always up to date
- :white_check_mark: Lots of documentation and examples/projects to look
- :white_check_mark: Debugging works as expected
- :white_check_mark: Fast development with SwiftUI Framework
- :white_check_mark: Previews enhance the development experience to the sky taking a lot less effort
- :no_entry: Steep learning curve (language + watch related stuff + SwiftUI framework)
- :no_entry: Hard to integrate to the regular iOS app
- :no_entry: SwiftUI is not polished enough yet so some things to keep in mind are special
  navigation and rendering issues
