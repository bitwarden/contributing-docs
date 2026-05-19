---
adr: "0029"
status: "Accepted"
date: 2025-11-24
tags: [clients, angular]
---

# 0028 - Adopt Angular Signals for Component State

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Angular has adopted a new reactive primitive, signals. Signals have various improvements over RxJS:
performance, simplicity, and deeper integrations into the rest of the framework.

RxJS will become an optional dependency of Angular. Certain asynchronous workflows will still
benefit from RxJS (signals are synchronous). Furthermore, being a part of the core Angular library,
Angular signals cannot readily be used in non-Angular environments.

As such, Signals should be the default when operating _in the view layer_: components, directives,
pipes, and services that are tightly coupled to the UI/Angular. Services that primarily deal with
business logic should prefer RxJS to maximize portability (or, even better, be moved to the Rust
SDK).

## Decision

Signal-based APIs (inputs, outputs, child queries) will be required in components and directives via
linting:

- `@Input()` → `input()`
- `@Output()` → `output()`
- `@ViewChild`/`@ContentChild` → `viewChild()`/`contentChild()`

Services tightly coupled to Angular should use signals. Services with non-presentational business
logic should prefer RxJS for portability. Use `toSignal()` and `toObservable()` to bridge between
RxJS and signals when necessary.

## Implementation Plan

New code must use signal-based APIs; existing code will be migrated gradually. Angular provides
automatic code migrations for signal
[inputs](https://angular.dev/reference/migrations/signal-inputs) and
[queries](https://angular.dev/reference/migrations/signal-queries).

Much of `libs/components` was updated using these migrators:
https://github.com/bitwarden/clients/pull/15340

See the
[Angular Modernization Guide](https://contributing.bitwarden.com/contributing/code-style/web/angular-migration-guide/#signals)
for more information.

## Consequences

**Positive:**

- Improved performance and simpler change detection
- Clear path to removing Zone.js dependency
- Better debugging experience
- Aligned with Angular's direction
- Simpler than RxJS for many common use cases

**Negative:**

- Temporary complexity during migration with mixed RxJS/Signals patterns
- Learning curve for team members unfamiliar with signals
- Migration effort required for existing codebase

## Reasons against other options

- Disallow usage of signals and only use RxJS for reactivity.
  - This is a non-starter. Signals are being built into Angular.
- Continue the status quo of ad hoc usage.
  - Having multiple ways to do the same thing leads to analysis paralysis and complicated code.
  - Signals + OnPush change detection provide a clear path to removing Zone.js. With that comes
    notable performance and debugging improvements.

## Further reading

- [Angular docs](https://angular.dev/guide/signals)
