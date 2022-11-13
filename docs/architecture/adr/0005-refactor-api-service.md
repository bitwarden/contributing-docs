---
adr: "0005"
status: In progress
date: 2022-07-08
tags: [clients, angular]
---

# 0005 - Refactor Api Service

## Context and Problem Statement

The `ApiService` currently handles _all_ API requests. This has resulted in the class evolving into
a Bloater, and as of right now consists of **2021** lines of code, and has **268** methods.
Additionally, since it knows everything related to the servers it also needs to import every request
and response which nessesates that the `ApiService` and request/responses are put in the same npm
package.

## Considered Options

- **Extract Class** - We should break up the class using the _Extract Class_ refactor, where each
  domain context should have its own _API_ service. The `ApiService` should be converted into a
  generic service that doesn't care what the request or response is and should only be used within
  other API services.
- **Do nothing** - Leave it as is.

## Decision Outcome

Chosen option: **Extract Class**

The naming of these new classes should be `{Domain}ApiService`, the folder domain for example should
be called `FolderApiService`.

Example of the refactor:

- [`folder-api.service.ts`][folder-api]: Create a new service, move the methods from `ApiService` to
  the new service. During this refactor we also moved the server knowledge from the `FolderService`,
  as it should only be responsible for maintaining it's state.
- [`api.service.ts`][api]: Remove the old methods from the `ApiService`.

[folder-api]:
  https://github.com/bitwarden/clients/pull/3011/files#diff-11b3488b9977f06625349680f81554505613715cfcc9890ebb356a74579c236a
[api]:
  https://github.com/bitwarden/clients/pull/3011/files#diff-6c8f3163b688c01f589d1e9ee5b7998aea4a0aedde8333c3939fb6181c301bed
