---
adr: "0027"
status: "Accepted"
date: 2025-07-21
tags: [clients, angular]
---

# 0027 - Adopt Angular Signals for Component State

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Signals are the new way to model reactive state in Angular (made stable in v17). Angular has made it
clear that signals are the future of the framework:

- Angular is actively working to remove RxJS as a core dependency of the framework
- Core Angular APIs are being migrated to signals, including: inputs, outputs, and queries
- The Angular team has deprecated several RxJS-based APIs in favor of signal equivalents
- Future Angular features will be built signal-first

This migration is effectively a foregone conclusion - Angular has chosen signals for the ecosystem.
However, we can still make conscious decisions about how we adopt and interoperate between signals
and RxJS.

**The Challenge: Portability vs. Angular Integration**

Bitwarden's architecture presents unique challenges for signal adoption. We use RxJS extensively
across:

1. **Angular UI layer** - Components, services, and state management
2. **Shared JavaScript service layer** - Business logic used across multiple contexts
3. **Non-Angular environments** - Browser extension background/content scripts, Electron main
   process, CLI tools

Signals are Angular-specific and cannot be used outside of Angular injection contexts, which
excludes significant portions of our codebase. This creates a tension between following Angular's
direction and maintaining code portability across our diverse runtime environments.

## Considered Options

- **Ad-hoc usage** - Where we are today, Angular Signals are allowed and used occasionally
  throughout the codebase but without systematic guidance on when to use signals vs. RxJS.
- **Encourage usage** - Start encouraging signal usage through team training and code review
  guidance, but maintain flexibility for appropriate RxJS usage.
- **Enforce usage in Angular contexts** - Systematically enforce signal usage for Angular-specific
  state (components, directives) while maintaining RxJS for shared service layer and interop
  scenarios.
- **Disallow usage** - Not viable. Angular's migration path makes signals unavoidable in Angular
  applications.

## Decision Outcome

Chosen option: **Enforce usage in Angular contexts**.

We will adopt a layered approach that acknowledges both Angular's direction and Bitwarden's
architectural constraints:

1. **Angular UI Layer**: Enforce signals for component state, inputs, outputs, and Angular-specific
   reactive patterns
2. **Shared Service Layer**: Maintain RxJS for business logic that must work across Angular and
   non-Angular contexts
3. **Interop Layer**: Use built-in RxJS interop methods at the boundary between the two layers

This means migrating Angular components to use:

- Signal-based component properties and computed values
- Signal inputs and outputs (`@Input()` → `input()`, `@Output()` → `output()`)
- Signal-based queries (`ViewChild`/`ContentChild` → `viewChild()`/`contentChild()`)

### Positive Consequences

- **Angular Alignment**: Follows Angular's established migration path and future direction
- **Framework Integration**: Seamless integration with Angular's signal-based APIs (inputs, outputs,
  queries)
- **Performance Benefits**: Better change detection, smaller bundle sizes, eventual ZoneJS removal
- **Developer Experience**: Simpler reactive patterns for typical Angular component development
- **Future-Proofing**: Positions us well for upcoming Angular features and migrations
- **Clear Boundaries**: Establishes explicit patterns for when to use signals vs. RxJS

### Negative Consequences

- **Learning Curve**: New reactive paradigm for developers familiar with RxJS patterns
- **Interop Complexity**: Managing conversions between signals and observables at layer boundaries
- **Ecosystem Split**: Two reactive systems within the same codebase require careful coordination
