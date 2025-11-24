---
adr: "0028"
status: "Accepted"
date: 2025-11-24
tags: [clients, angular]
---

# 0028 - Adopt Angular Signals for Component State

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Angular has adopted a new reactive primitive, signals. Signals have various improvements over RxJS:
performance, simplicity, and deeper integrations into the rest of the framework.

RxJS will become an optional dependency of Angular instead of a required. Certain asynchronous
workflows will still benefit from RxJS--signals are synchronous. Furthermore, being a part of the
core Angular library, Angular signals cannot readily be used in non-Angular environments.

As such, Signals should be the default when operating _in the view layer_: components, directives,
pipes, and services that are tightly coupled to the UI/Angular. Services that primarily deal with
business logic should prefer RxJS to maximize portability (or, even better, be moved to the Rust
SDK).

## Outcome

Signal-based APIs (inputs, outputs, child queries) will be required in components via linting:

- `@Input()` → `input()`,
- `@Output()` → `output()`
- `@ViewChild`/`@ContentChild` → `viewChild()`/`contentChild()`

## Reasons against other options

- Disallow usage of signals and only use RxJS for reactivity.
  - This is a non-starter. Signals are being built into Angular.
- Continue the status quo of adhoc usage.
  - Having multiple ways to do the same thing leads to analysis paralysis and complicated code.
  - Signals + OnPush change detection provide a clear path to removing Zone.js. With that comes
    notable performance and debugging improvements.

## Further reading

- [Angular docs](https://angular.dev/guide/signals)
