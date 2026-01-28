---
sidebar_position: 0
---

# Server Architecture

The Bitwarden server follows architectural patterns and conventions designed to maintain clean,
maintainable, and scalable code.

## Key patterns

### Command Query Separation (CQS)

We use the CQS pattern to break up large service classes into smaller, focused commands and queries.
This results in classes with fewer interdependencies that are easier to change and test.

See [Command Query Separation](command-query-separation.md) for details.

### Model separation of concerns

API contracts (request/response models) are kept separate from internal data models. This allows
APIs to evolve independently from internal data structures and business logic.

See [Model separation of concerns](model-separation-of-concerns.md) for details.
