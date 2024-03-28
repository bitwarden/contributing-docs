---
adr: "0022"
status: In progress
date: 2023-01-09
tags: [clients]
---

# 0022 - Team-owned libs

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Historically, much of the feature logic of Bitwarden has existed within the `apps/` directories,
only being moved to `libs/` (usually `libs/common/` or `libs/angular/`) if it needed to be shared
between multiple clients.

This pattern makes it more difficult for teams to independently manage code they own.

## Considered Options

- **Do nothing** - Keep our current pattern.
- **Template-driven forms** - Move functionality out of `apps/`, `libs/common/`, and `libs/angular/`
  and move into libs that are smaller, feature-focused, and owned by a team.

This is informed by [Nx](https://nx.dev/concepts/more-concepts/applications-and-libraries), a
monorepo tool:

> A typical Nx workspace is structured into "apps" and "libs". This distinction allows us to have a
> more modular architecture by following a separation of concerns methodology, incentivizing the
> organization of our source code and logic into smaller, more focused and highly cohesive units.

<blockquote>
A common mental model is to see the application as "containers" that link, bundle and compile functionality implemented in libraries for being deployed. As such, if we follow a 80/20 approach:

    - place 80% of your logic into the libs/ folder
    - and 20% into apps/

Note, these libraries don’t necessarily need to be built separately, but are rather consumed and
built by the application itself directly. Hence, nothing changes from a pure deployment point of
view.

</blockquote>

## Decision Outcome

Chosen option: **Team-owned libs**

### Positive Consequences

- **Clear public API** - Each team can decide what is public and private within their library. This
  prevents teams from relying on code that is meant to be internal.
- **More team autonomy** -
- **Easier to share code between apps** -
- **Clearer dependency graph** - It will be easier to inspect which teams are relying internal and
  external dependencies.
- **Simplified code ownership** -
- **Incremental builds** -

### Negative Consequences

- **Managing circular dependencies** -
- **More boilerplate** -
