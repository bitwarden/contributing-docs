---
adr: "0001"
status: In progress
date: 2022-05-28
tags: [clients, angular, forms]
---

# 0001 - Angular Reactive Forms

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Most of the forms in our Angular applications use the template driven forms. Lately we have been
noticing issues scaling and maintaining these forms. And have begun mixing the use of
template-driven with reactive forms.

Maintaining two ways of handling forms are complex and moving full into a single approach will
ensure a more consistent experience for developers and users.

## Considered Options

- **Reactive forms** - Provide direct, explicit access to the underlying forms object model.
  Compared to template-driven forms, they are more robust: they're more scalable, reusable, and
  testable. If forms are a key part of your application, or you're already using reactive patterns
  for building your application, use reactive forms.
- **Template-driven forms** - Rely on directives in the template to create and manipulate the
  underlying object model. They are useful for adding a simple form to an app, such as an email list
  signup form. They're straightforward to add to an app, but they don't scale as well as reactive
  forms. If you have very basic form requirements and logic that can be managed solely in the
  template, template-driven forms could be a good fit.

Source: https://angular.io/guide/forms-overview#choosing-an-approach

## Decision Outcome

Chosen option: **Reactive forms**, because our needs exceed what template-driven forms are
recommended for.

### Positive Consequences

- You never need to think which form method to use.

### Negative Consequences

- Using only reactive form means we might have some additional boilerplate.
