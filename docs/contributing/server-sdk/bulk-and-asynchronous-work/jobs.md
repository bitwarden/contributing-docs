---
sidebar_position: 2
---

# Jobs

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A job is a resource representing work an API accepted to finish later, answered with `202 Accepted`.
The package provides no asynchronous operations and no job resource: every operation answers when
its work is done.

## What to do instead

- **Keep operations synchronous.** Bound each operation's work so it can answer while the caller
  waits. For a bulk operation, set a maximum with `BulkRequests.RequireAtMost`, and say in the
  handler's `<remarks>` that it responds synchronously. See
  [Synchronous and asynchronous](bulk-operations/synchronous-and-asynchronous.md).
- **React with events, not polling.** Where the later work is another service responding to a
  change, publish an event for it to consume rather than offering an asynchronous API.
- **Don't publish your own job shape.** The shape of a job resource (its fields, its states, how a
  caller follows it) isn't settled. A hand-made one becomes a contract every caller depends on and
  that later has to change. If an operation truly can't be bounded, raise it with this package's
  maintainers before building one.

## Things to know

- Bitwarden.Server.Sdk.Jobs is a different thing: it runs recurring background work on a schedule
  inside a service. It has no API and is not a job resource in this sense.

## See also

- [Synchronous and asynchronous](bulk-operations/synchronous-and-asynchronous.md)
- [Bulk operations](bulk-operations/index.md)
