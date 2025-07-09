---
adr: "0026"
status: "Proposed"
date: 2025-05-30
tags: [client]
---

# 0026 - Adopt `@ngrx/signals` for Component State Stores

<AdrTable frontMatter={frontMatter}></AdrTable>

## Prior Reading

- [ADR Draft - Adopt Angular Signals for Component State](https://bitwarden.atlassian.net/wiki/spaces/EN/pages/1538326529)
- [Angular Signals](https://angular.dev/guide/signals)
- [NgRx Docs](https://ngrx.io/guide/signals)


## Context and Problem Statement

Building on [ADR Draft - Adopt Angular Signals for Component State](https://bitwarden.atlassian.net/wiki/spaces/EN/pages/1538326529) decision to adopt Angular signals for component state, this ADR addresses state management patterns across our application on the component level.

The DIRT team frequently interacts with multiple services on the domain layer and exposes this data to various components. Current implementation shows duplicate patterns for managing service data, transforming it for UI consumption, and sharing it between components.

### Problem

We need a standardized approach to manage cross-component state that leverages Angular signals while reducing code duplication and improving developer experience.

### Context

@ngrx/signals provides a signal store that captures these repeating patterns and centralizes state management in a way that complements our existing signal adoption

## Considered Options

- **Continue with Angular Signals only**
  - Maintain current approach using signals within individual components
  - Does not provide the state management features and cross-component patterns that @ngrx/signals offers through the signal store
- **Alternative state management solutions**
  - Explore other state management libraries
  - Existing options like the original NgRx store involve significant boilerplate, don’t leverage signals, and lack team support
- **Adopt @ngrx/signals package**
  - Implement the signal store to capture repeating patterns and manage state across components
  - Builds upon our existing signal adoption

## Decision Outcome

**Adopt @ngrx/signals for state management on the component level**

The benefits significantly outweigh the costs of learning curve and dependency addition. The potential negatives can be addressed through phased implementation and clear documentation.

### Positive Consequences

- Improved developer experience
- Captures repeating patterns (huge bonus)
- Creates single source of truth from services to UI layer
- Builds existing signal adoption

### Negative Consequences

- Learning curve (though minimal compared to other state management solutions like NgRx store)
- Potential confusion if different state management patterns emerge or exist in the code-base
- May require refactoring existing service-level shared data patterns
- Need to establish organization-level guidance/examples (not just team-level)
- Introduces another dependency
- Limited debugging tools

### Plan

**Learning curve mitigation:** Presentation on the @ngrx/signals package for detailed tutorial/documentation (refinement if needed)

**Pattern standardization:** Establish guidelines for when to use different state management approaches and document existing state management patterns

**Phased implementation:** Start with DIRT proof of concept, then expand to organization level with clear folder structure and guidelines

**Refactoring support:** Use current proof of concept as a template for migration patterns

**Limited debugging:** Current NgRx DevTools don’t fully support signal stores; Expose manual debugging through a feature until NgRx team releases updated tooling

## Guidelines

**When to use a signal store:** Cross-component state management, service data aggregation, repeating UI patterns

**Security considerations:** Do not store decrypted sensitive data in signal stores; use for UI state, metadata, and non-sensitive application data only

**Data types:** Suitable for display preferences, loading state, filtered/sorted lists, navigation state - not for decrypted vault data

**Team coordination:** Coordinate with security experts for any questions about data classification

## Further reading

- [NgRx Signal Store POC by Banrion](https://github.com/bitwarden/clients/pull/15186)
- [The new NGRX Signal Store for Angular: 3+n Flavors - ANGULARarchitects](https://www.angulararchitects.io/en/blog/the-new-ngrx-signal-store-for-angular-2-1-flavors/)
- [Rethinking Reactivity w/ Alex Rickabaugh | Dec '23 | AngularNation.net](https://www.youtube.com/watch?v=_yMrnSa2cTI)
- [NgRx Signals Introduction Slides](https://docs.google.com/presentation/d/1vHVLlSmc51emZS6t_9MwEoH7FBp-yVovMgNPSOqaP_k/edit?usp=drive_link)