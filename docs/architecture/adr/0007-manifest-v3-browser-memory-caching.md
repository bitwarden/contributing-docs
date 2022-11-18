---
adr: "0007"
status: In progress
date: 2022-07-12
tags: [browser, angular]
---

import AdrTable from '@site/src/MDXComponents/AdrTable';

# 0007 - Manifest V3 sync Observables

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Manifest v3 brings ephemeral contexts to web extensions by disallow a long-lived background process.
This means that we need to store and synchronize state through different popup/service worker/web
worker instances. This is done through `LocalBackedMemoryStorageService`.

Moving away from StateService to observables has made this harder because observables are
fundamentally tied to the extension instance.

We need to store these observables to maintain state. State should be loaded on init, updated on
next, and updated via a reload message.

## Considered Options

- **Init in constructor and update in UpdateObservables** - This is simple and clean, but lacks the
  guarantees that we always will update storage and emit messages. It also doesn't provide a way to
  sync data live if a side bar is open and a cipher is saved via the content scripts. We could build
  a timer to sync these items periodically from memory.
- **Decorator pattern** - Use a decorator to wrap service constructors. This decorator will
  - initialize from `LocalBackedMemoryStorage`
  - Subscribe to the observer to update `LocalBackedMemoryStorage` and push event to workers to
    update observable from memory
  - Push `observable.next` on update event
  - Avoid a circular event loop here? (loops occur both on message and on observable)
    - message can be fixed with a guid
    - TODO: issue with message -> `observable.next` -> subscribe -> storage service is unknown

## Decision Outcome

Chosen option: **Decorator Pattern**. This will be more reusable and the cleaner solution going
forward. It needs more thought to determine how to avoid circular events, but once solved, it is
solved.

### Positive Consequences <!-- optional -->

- reusable, clean solution
- adheres to observable best practices

### Negative Consequences <!-- optional -->

- some unknown implementation details may cause bumps along development
