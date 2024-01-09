---
adr: "0022"
status: In progress
date: 2023-01-09
tags: [clients]
---

# 0001 - Team-owned libs

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Historically, much of the feature logic of Bitwarden has existed within the `apps/` directories,
only being moved to `libs/` (usually `libs/common/` or `libs/angular/`) if it needed to be shared
between multiple clients.

This pattern makes it more difficult for teams to independently manage code they own.

## Considered Options

- **Do nothing** - Keep our current pattern.
- **Template-driven forms** - Break functionality out of `apps/`, `libs/common/`, and
  `libs/angular/` and move into libs that are smaller, feature-focused, and owned by a team.

Source: https://angular.io/guide/forms-overview#choosing-an-approach

## Decision Outcome

Chosen option: **Team-owned libs**

### Positive Consequences

- **Clear public API** - Each team can decide what is public and private within their library. This
  prevents teams from relying on code that is meant to be internal.
- **Faster builds** -
- **More team autonomy** -
- **Easier to share code between apps** -
- **Clearer dependency graph** - It will be easier to inspect which teams are relying internal and
  external dependencies.
- **Simplified code ownership** -

### Negative Consequences

- **Managing circular dependencies** -
- **More boilerplate** -
