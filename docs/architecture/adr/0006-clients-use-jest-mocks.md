---
adr: "0006"
status: In progress
date: 2022-07-18
tags: [clients, tests]
---

# 0006 - Clients: Use Jest Mocks

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

We currently use [Substitute](https://www.npmjs.com/package/@fluffy-spoon/substitute) to create
mocks in our tests. This includes matching arguments, mocking return values, and spying on calls.
However, we also use Jest, which comes with its own mocking, spying and matching functions. This
means we have two libraries that provide the same functionality.

This is undesirable because:

- We have duplication of functionality between two competing libraries
- It's not clear which library the team is supposed to use
- Those familiar with Jest will naturally use Jest for their mocks, which is not the pattern we
  currently follow
- Substitute is less well-known and used compared to Jest, and is another library to learn
- It requires that we mix syntax, particularly for assertions: we use Jest's `expect` to assert the
  test result, but we use Substitute's `Arg` to match arguments within mock calls.

We should just pick one.

## Considered Options

- **Use Substitute and ban developers from using Jest mocks** - we keep both libraries and continue
  to use them both in tandem. In this case, we should provide clear guidance and training to
  developers to use Substitute for all mocking and argument matching (not Jest).

- **Deprecate Substitute and use Jest with jest-mock-extended instead** - we deprecate Substitute
  and update all existing tests to use Jest mocks instead. We use
  [jest-mock-extended](https://github.com/marchaos/jest-mock-extended/) for convenient mocking
  syntax and better integration with Typescript. There should not be any loss of functionality
  arising from this change.

- **Use a different mocking library and/or test runner** - we change to something else entirely.
  This is not really on the table here, but it is an option. Jest is working well so far, so I don't
  propose we change it.

## Decision Outcome

Chosen option: **Deprecate Substitute and use Jest with jest-mock-extended instead**

We should also host a training/learning session to encourage and empower developers to unit test
their code.

### Positive Consequences

- Front-end developers are more likely to be familiar with Jest than Substitute
- Jest has more documentation and resources (Medium articles, StackOverflow answers, etc)
- It's an integrated part of Jest
- No mixing different libraries or syntax

### Negative Consequences

- Backend developers will have more of a learning curve compared to Substitute, which is a port of
  NSubstitute for .NET. However, this is still not a particularly steep learning curve, and it makes
  sense to use front-end tools in a front-end environment.
- Some effort involved to change existing tests, but this is not substantial.
