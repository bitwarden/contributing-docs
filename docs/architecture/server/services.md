---
sidebar_position: 3
---

# Services

**Audience:** Bitwarden engineers and AI agents building, extracting, or reviewing a server-side
service.

This page is the living standard for how Bitwarden's services relate to one another: what a service
owns, how a boundary is crossed, and what every service publishes. It was adopted in
[ADR-0035](../adr/0035-service-oriented-architecture.md). The rules below evolve by pull request
without superseding that decision.

[RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`, `SHOULD`,
`SHOULD NOT`, `MAY`) are used deliberately. A `MUST` or `MUST NOT` is not negotiable at team level;
a team that needs an exception brings the case to the architecture group.

## Terms

| Term                   | Definition                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Consumer**           | Anything that calls a service: another service, a user interface, or an external integration.                                                       |
| **Row-level security** | The rules an owning service applies to decide which rows a caller may see, covering both organization scoping and any narrower per-user visibility. |
| **Service**            | An independently deployable process that owns a set of resources and publishes a contract over them.                                                |
| **Service client**     | The package a service publishes so consumers can call it without hand-writing transport.                                                            |

## Principles

1. Service boundaries `MUST` derive from data ownership, not from team structure.
2. Every resource `MUST` have exactly one owning service, and that service is the only process that
   reads or writes its data store.
3. Services `MUST` be built on the `Bitwarden.Server.Sdk` package.
4. Services `MUST` document their APIs in [OpenAPI format](https://www.openapis.org/) and conform to
   **API Standards**.
5. Services `MUST NOT` make breaking changes. Changes that _would_ be breaking `MUST` follow the API
   versioning process as outlined by API Standards.
6. Services `MUST` provide a **service client** for consumers.
7. Service clients `SHOULD` make use of a network cache to mitigate performance issues.
   - Any cache used `MUST` be owned and invalidated by the owning service.
   - Serving results from cache `MUST NOT` bypass authorization the owning service would otherwise
     enforce.
8. Services that need to read, write, or validate data owned by another service `SHOULD` do so via
   the service's published service client.
9. A service `MAY` hold a local copy of another service's data only with a recorded justification
   (e.g. a measured hot-path volume, a stated availability requirement, etc.).
   - Any service holding a local copy `MUST` enforce the owner's row-level security on that copy and
     document the security ramifications of a stale copy (due to messaging lag, event processing
     failures, etc.).
10. Services `MUST` publish events for every state change using the "transactional outbox" pattern,
    regardless of whether there are any known consumers.

## Related standards

- [ADR-0008 Server: Adopt CQS](../adr/0008-server-CQRS-pattern.md)
- [ADR-0028 Adopt FusionCache](../adr/0028-adopt-fusion-cache.md)
- [ADR-0031 Adopt Minimal APIs](../adr/0031-adopt-minimal-apis.md)
- [ADR-0032 Break up the Core project](../adr/0032-break-up-core.md)
- [Command Query Separation (CQS)](./command-query-separation.md)
