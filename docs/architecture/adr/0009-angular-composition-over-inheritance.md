---
adr: "0009"
status: Accepted
date: 2022-07-25
tags: [clients, angular]
---

# 0009 - Composition over inheritance

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

We currently rely heavily on inheritance for our Angular applications. While this seemed like a
natural decision at the time since it allowed us to quickly share code between different areas. It
has also lead to tight coupling and therefore difficulty in understanding the impact a change will
have. It also encourages large page-level components.

## Considered Options

- **Do nothing** - Maintain the status quo, not really an option.
- **Prefer composition over inheritance** - Split up components into small components that do one
  thing and one thing only. Keep components thin, and share functionality primarily using
  _Services_.

## Decision Outcome

Chosen option: **Prefer composition over inheritance**

### Positive Consequences

- Thinner components
- Better understanding of the impact a change has since it will now be isolated to a single
  component only.

### Negative Consequences

- Inheritance tends to be well understood.
