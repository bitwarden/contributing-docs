---
adr: "0028"
status: "Proposed"
date: 2025-11-29
tags: [server]
---

# 0028 - Server: Clarify CQS vs CQRS Terminology

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

In [ADR-0008](./0008-server-CQRS-pattern.md), we adopted what we called "CQRS" (Command Query
Responsibility Segregation) for the server architecture. However, upon reflection and after several
years of implementation, it has become clear that our actual implementation does not match the full
scope and complexity of CQRS as defined in industry literature.

**CQRS** is a comprehensive architectural pattern that separates the read and write models at the
data storage level. A full CQRS implementation typically includes:

- Separate data models for reads and writes
- Event sourcing
- Eventual consistency between read and write stores
- Complex synchronization mechanisms
- Often, separate databases or data stores for queries vs commands

**CQS** (Command Query Separation) is a simpler, more focused principle that states:

- Commands change state but don't return data (or only return operation results)
- Queries return data but don't change state
- Each operation should have a single responsibility

Our implementation follows CQS principles: we break up large service classes into smaller command
and query classes, but we do not maintain separate data models or storage layers. This is exactly
what CQS aims to achieve - smaller, more focused classes that are easier to test and maintain.

The terminology mismatch has caused confusion for developers joining the project, as they research
CQRS and find it describes a much more complex architecture than what we've actually implemented.
This creates an unnecessary learning curve and misaligned expectations.

## Considered options

- **Keep CQRS terminology** - Continue using CQRS terminology despite the mismatch. This is
  difficult to justify.

- **Adopt CQS terminology** - Update our documentation to use CQS terminology, which accurately
  describes what we've implemented. This provides clarity for new developers and aligns our
  documentation with our actual implementation.

- **Implement full CQRS** - Actually implement the full CQRS pattern with separate read/write
  models. This would be a large architectural change that has not been proposed and which is out of
  scope in any case. This ADR is focused on aligning our documentation with our current practices.

## Decision outcome

Chosen option: **Adopt CQS terminology**.

The terminology change better reflects our implementation and reduces confusion. It also
acknowledges that what we've built what we needed: a pragmatic solution to break up large service
classes without the additional complexity of full CQRS.

### Positive consequences

- **Clarity for new developers** - Developers can research CQS and find documentation that matches
  our implementation
- **Accurate documentation** - Our architecture documentation reflects what we actually built
- **Reduced complexity** - We're not implying architectural complexity we haven't implemented
- **Better expectations** - Team members understand the scope and scale of what we're maintaining

### Negative consequences

- **Historical confusion** - Older discussions, PRs, and code comments may still reference "CQRS"
- **Name change overhead** - Some mental adjustment needed for developers familiar with the old
  terminology

### Migration plan

1. Update this documentation to use CQS terminology, particularly the
   [Server Architecture](../server/index.md) page.
1. Update ADR-0008 status to "Superseded" with a reference to this ADR. Add a note referencing this
   ADR.
1. No code changes required - class names like `CreateCipherCommand` remain appropriate as "command"
   and "query" are common to both patterns

## Further reading

- [Martin Fowler on CQS](https://martinfowler.com/bliki/CommandQuerySeparation.html) - a succinct
  high level summary of our approach
- [ADR-0008: Server CQRS Pattern](./0008-server-CQRS-pattern.md) (superseded by this ADR)
