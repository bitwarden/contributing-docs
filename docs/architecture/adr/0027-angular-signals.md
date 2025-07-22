---
adr: "0026"
status: "Accepted"
date: 2025-07-21
tags: [clients, angular]
---

# 0026 - Adopt Angular Signals for Component State

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Signals are the new way to model reactive state in Angular (made as stable in v17). They

- Angular is looking to remove RxJS as a dependency of the framework.

Core Angular APIs are being updated to use signals, including: inputs, outputs, queries. As such,
signals proliferate through the codebase one way or the other.

At the time of writing, Bitwarden uses RxJS to model reactivity throughout 1.) the Angular UI layer,
and 2.) the non-Angular JavaScript service layer.

## Considered Options

- **Ad-hoc usage** - Where we are today, Angular Signals are allowed to be used and are used
  occasionally throughout the codebase but they is no outside encouragement to use them.
- **Encourage usage** - Start encouraging usage through team training and encouragement to use them
  in code reviews but don't make any automatic check to enforce usage.
- **Enforce usage** - Start enforcing usage by...
- **Disallow usage** - This is not possible. Angular has chosen signals for us to some degree.

## Decision Outcome

Chosen option: **Enforce usage**.

### Positive Consequences

- Standardization across the codebase
- Follows Angular best practices and recommendations
- Mitigates Angular deprecations early
- Simpler for typical component development
- Lower bundle size
- More performant (can eventually remove ZoneJS as a dependency)

### Negative Consequences

- New paradigm.

### Plan
