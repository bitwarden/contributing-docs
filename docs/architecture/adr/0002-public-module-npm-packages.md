---
adr: "0002"
status: In progress
date: 2022-06-02
tags: [clients]
---

import AdrTable from '@site/src/MDXComponents/AdrTable';

# 0002 - Public API for modules

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

We currently use direct file reference across different packages. This had led to everything in the
packages being available to any other package across our projects. Which makes it difficult to
identity what potential side effects a change might have as they are not isolated to the individual
package. Traditionally only a specific subset of a package is exposed as a public module, which
provides safety that changes will be internal to the package and ideally covered by it's unit tests.

## Considered Options

- **Direct references** - We can decide to continue as is. Without a public API.
- **Define public modules using index.ts** - We add `index.ts` to each folder that defines the
  "public" interfaces. The other packages then imports the root index file and are forbidden from
  direct references to internal files.

## Decision Outcome

Chosen option: **Define a public module using index.ts**.

### Positive Consequences <!-- optional -->

- The public module is defined.
- Imports can be kept cleaner since not every file needs to be manually imported.
- Safety in knowing that a change is isolated to the package.

### Negative Consequences <!-- optional -->

- We will have to update `index.ts` files whenever we add a new exported API.
