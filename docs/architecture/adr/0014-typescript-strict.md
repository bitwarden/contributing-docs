---
adr: "0014"
status: In progress
date: 2022-09-02
tags: [clients, typescript]
---

import AdrTable from '@site/src/MDXComponents/AdrTable';

# 0014 - Adopt Typescript Strict flag

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

For compatibility reasons since the codebase was originally written in JavaScript we have never been
able to use the TypeScript strict flag. This has lead to several issues with bugs and resulted in a
lower code quality.

### TypeScript Strict

> The `strict` flag enables a wide range of type checking behavior that results in stronger
> guarantees of program correctness. Turning this on is equivalent to enabling all of the strict
> mode family options.
>
> <cite>https://www.typescriptlang.org/tsconfig#strict</cite>

Of particular note is the [Strict Null Checks][null]. By default TypeScript will ignore `false`,
`null` and `undefined` allowing them to be used for any types. When `strictNullChecks` are enabled
they must be explicitly allowed in the type definition.

### Typescript strict mode plugin

The [Typescript strict mode plugin][plugin] is a TypeScript plugin that allows you to progressively
turn on strict mode on a file by file basis. This will allow us to progressively update our codebase
to support strict mode without requiring a significant initial engineering effort.

## Considered Options

- **Keep strict disabled** - We will continue to run into null issues, and code quality will be
  lower than it could be.
- **Enable strict flag immediately** - Turn on the strict flag immediately and assign an engineer to
  resolve all errors caused by it. This will take a long time, and result in a multitude of
  conflicts.
- **Progressively enable strict flag** - Use the TypeScript plugin to migrate files one by one.

## Decision Outcome

Chosen option: **Progressively enable strict flag**.

<!-- optional: brief reason for decision **or** the positive/negative consequences sections below -->

### Positive Consequences <!-- optional -->

- We can immediately start using the strict flag.
- Lower initial developer effort.

### Negative Consequences <!-- optional -->

- Migration will be slower.
- We will continue to have parts of the code with null issues.
- Might lead to false security if a file is strict but uses non-strict dependencies.
- Few best practices.

### Files to be updated

- libs/common: 310
  - models: 174
  - services: 40
  - abstractions: 45
- libs/angular: 64
- libs/node: 11
- libs/electron: 10
- apps: 309
  - web: 163
  - browser: 80
  - desktop: 30
  - cli: 36

### Plan

There are several potential pitfalls related to progressively enabling strict mode. Which will
benefit from having a plan on how we should tackle the migration. Each category of files should have
a proper example how how they should be migrated. And during the initial migration period a best
effort should be made to be strict-compliant, but we should not prevent people from adding new files
that are not strict. What we should prevent is people adding new non-strict files in the category
that we are currently migrating.

#### Preparation

Enable the plugin and run `update-strict-comments` which adds the `//@ts-strict-ignore` comment to
all files which produce a strict error.

#### Transition

1. Migrate `libs/common/models`.
2. Migrate `libs/common/services` and `libs/common/abstractions`.
3. Migrate remaining `libs/common`.
4. Migrate `libs/angular`.
5. Migrate apps. (And forbid anyone from adding new non-strict files)

### Guidelines

Below are some helpful guidelines for migrating files to strict mode.

#### Avoid null, prefer undefined

The `strictNullChecks` flag essentially requires that we add `| null` to almost all our types. This
is quite annoying and a better approach is to use `undefined` instead. Which allows us to use the
`?` operator to define the fields as optional. This essentially adds a `| undefined` to the type.

For some additional context behind this discussion, please read
[Guidelines for choosing between `null` and `undefined` with `strictNullChecks` · Issue #9653 · microsoft/TypeScript](https://github.com/microsoft/TypeScript/issues/9653).

##### Use find references / search

During the migration strict mode will only be allowed on a subset of the files. This means that
changing the interface from null to undefined may result in places that still use undefined. Please
double check that null is removed to ensure the expected behavior.

#### Avoid making non-optional fields optional

It may be tempting to just add a `?` to all fields while migrating the code. Please think carefully
wether the field should actually be optional or not. Arrays for example should almost never be
`undefined` and a more sensible default is `[]`.

#### Use optional chaining

Take advantage of optional chaining to avoid null checks. Optional chaining allows you to rewire the
following code.

```ts
// Avoid
if (obj == null || obj.field == null) {
  return false;
}
return true;

// Prefer
return obj?.field != null;
```

#### Use Nullish coalescing operator (`??`)

https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator

```ts
const foo = null ?? "default string";
```

[null]: https://www.typescriptlang.org/tsconfig#strictNullChecks
[plugin]: https://github.com/allegro/typescript-strict-plugin
