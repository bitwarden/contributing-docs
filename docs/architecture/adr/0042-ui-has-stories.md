---
adr: "0042"
status: Proposed
date: 2026-11-20
tags: [clients, angular]
---

# 0042 - Use Storybook for UI development

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

A lot of our UI is now written with coding agents. The person reviewing the work needs a quick way
to see what was built, and the agent needs a way to check its own output. Today that means running
an app, signing in and navigating to the right place, for every change.

Storybook solves this. A story renders a piece of UI in a chosen state at a URL anyone can open, and
[Chromatic](../../contributing/pull-requests/chromatic.md) snapshots every story on every pull
request. That also fills a gap in our testing: unit tests assert what the code does and end-to-end
tests assert that a flow reaches the right outcome, but nothing else checks how the interface looks.

We already have both in the `clients` repository, but most of our UI has no stories. We should make
stories the norm rather than the exception.

## Decision

Every component that renders something has a story file next to it, covering the states it can be
in. A pull request that adds or changes UI also adds or updates the stories. Storybook is where we
review and document our interface.

### Positive consequences

- Reviewers and designers can look at any part of the interface without running an app.
- An agent can open the story it wrote and verify the result before handing it off.
- Chromatic catches visual regressions everywhere, not just where someone happened to check.

### Negative consequences

- Every UI change now includes a story change.
- Components that inject services need those services mocked to render in Storybook, and the mocks
  need to be kept up to date.

## Further reading

- [Thin components](../../contributing/code-style/web/angular.md#thin-components) - a thin component
  is easy to put in a story
- [components.bitwarden.com](https://components.bitwarden.com)
- [Storybook docs](https://storybook.js.org/docs)
