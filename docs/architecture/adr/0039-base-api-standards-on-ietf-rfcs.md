---
adr: "0039"
status: Proposed
date: 2026-10-05
tags: [server, server-sdk]
---

# 0039 - Base API standards on IETF RFCs

<AdrTable frontMatter={frontMatter}></AdrTable>

{/* cspell:ignore ciphertext Hydra */}

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately.

## Context and problem statement

[ADR-0036](./0036-service-to-service-api-standards.md) requires service-to-service APIs to conform
to a comprehensive, documented set of standards. It does not say what those standards are built on:
an existing specification, published design guidelines, a different API technology, or nothing at
all. This ADR decides that. The ADRs that follow set the standards themselves:

- ADR-0040: request, response, and error payloads.
- ADR-0041: contracts and their evolution.
- ADR-0042: creating resources.
- ADR-0043: reading resources.
- ADR-0044: updating and deleting resources.
- ADR-0045: acting upon resources.
- ADR-0046: bulk processing resources.

Authentication and authorization will follow in a later ADR.

Three ground rules keep the comparison fair:

- **Earlier decisions are not criteria.** ADR-0035's OpenAPI requirement and ADR-0036's list of
  topics both assume HTTP resource APIs. Choosing GraphQL or gRPC would mean revising them, and that
  cost is not counted against those options.
- **No option is adopted wholesale.** Each would be adapted, so the choice is what the standards
  start from and borrow from, not whom they defer to. Whatever the starting point, the standards
  state every rule themselves.
- **Every audience counts.** The scope is service-to-service APIs, but each option is judged as if
  it would also serve our own clients and our customers. A second standard for those APIs would mean
  two of everything.

## Decision drivers

1. Answers the common design questions: payloads, errors, querying, paging, concurrency, bulk
   operations, asynchronous work, versioning, and deprecation.
2. Leaves room for a version, so an unavoidable breaking change has somewhere to go.
3. Customer-friendly: callable from any language, from a browser, and with `curl`.
4. Machine-readable contracts and generated clients in C#, Rust, TypeScript, Swift, and Kotlin.
5. The owning service decides what can be queried. Most vault data is ciphertext, which cannot be
   filtered or sorted.
6. Works through customer-operated proxies on self-hosted installs, and with standard HTTP
   infrastructure.
7. Fits ASP.NET Core and data access that is largely Dapper over stored procedures.

## Considered options

- **Our own standards on IETF RFCs:** write the standards ourselves, and wherever an IETF RFC covers
  a topic, adopt it or record why not.
- **[JSON:API](https://jsonapi.org/):** a published specification for JSON resource APIs, covering
  document shape, errors, and query parameter families.
- **Hypermedia formats:** [HAL](https://datatracker.ietf.org/doc/draft-kelly-json-hal/),
  [Siren](https://github.com/kevinswiber/siren),
  [Collection+JSON](https://github.com/collection-json/spec), and
  [JSON-LD](https://www.w3.org/TR/json-ld11/) with
  [Hydra](https://www.hydra-cg.com/spec/latest/core/). Links and actions let a client discover an
  API at run time.
- **[OData](https://www.odata.org/documentation/):** an OASIS standard with a URL query language
  over a declared entity data model.
- **[GraphQL](https://spec.graphql.org/):** a typed schema and caller-composed queries, usually sent
  to a single endpoint.
- **[gRPC](https://grpc.io/):** Protocol Buffers contracts called over HTTP/2 with binary payloads.
- **[Google AIP](https://google.aip.dev/):** Google's numbered API design guidance, defined in
  Protocol Buffers.
- **[Microsoft Azure REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md):**
  Microsoft's guidelines for Azure HTTP APIs.

✅ yes, ❌ no, ⚠️ partly or with qualification.

|                                     | Own on RFCs | JSON:API | Hypermedia | OData | GraphQL | gRPC | AIP | Azure |
| ----------------------------------- | :---------: | :------: | :--------: | :---: | :-----: | :--: | :-: | :---: |
| Answers the common design questions |     ⚠️      |    ⚠️    |     ❌     |  ✅   |   ❌    |  ❌  | ✅  |  ✅   |
| Room for a version                  |     ✅      |    ✅    |     ✅     |  ✅   |   ⚠️    |  ✅  | ✅  |  ✅   |
| Contracts express required fields   |     ✅      |    ✅    |     ✅     |  ✅   |   ✅    |  ⚠️  | ⚠️  |  ✅   |
| Customer-friendly                   |     ✅      |    ✅    |     ✅     |  ⚠️   |   ❌    |  ❌  | ⚠️  |  ✅   |
| Generated clients                   |     ✅      |    ✅    |     ⚠️     |  ⚠️   |   ✅    |  ✅  | ✅  |  ✅   |
| Owner decides what can be queried   |     ✅      |    ✅    |     ✅     |  ⚠️   |   ⚠️    |  ✅  | ⚠️  |  ⚠️   |
| Works through customer proxies      |     ✅      |    ✅    |     ✅     |  ✅   |   ✅    |  ❌  | ⚠️  |  ✅   |
| Works with HTTP infrastructure      |     ✅      |    ✅    |     ✅     |  ✅   |   ❌    |  ⚠️  | ⚠️  |  ✅   |
| Fits our stack                      |     ✅      |    ⚠️    |     ✅     |  ⚠️   |   ✅    |  ✅  | ⚠️  |  ✅   |
| Streaming and push                  |     ❌      |    ❌    |     ❌     |  ❌   |   ✅    |  ✅  | ⚠️  |  ❌   |
| Compact wire format                 |     ❌      |    ❌    |     ❌     |  ❌   |   ❌    |  ✅  | ⚠️  |  ❌   |
| Published origin                    |     ⚠️      |    ✅    |     ⚠️     |  ✅   |   ✅    |  ✅  | ⚠️  |  ⚠️   |

## Decision outcome

Chosen option: **Our own standards on IETF RFCs**.

- Three options are customer-friendly and leave the query surface entirely to the owning service:
  this one, JSON:API, and the hypermedia formats. The hypermedia formats answer almost none of the
  design questions. JSON:API answers more, but would be departed from in many places. It does not
  cover concurrency or deprecation, and covers asynchronous processing only in non-normative
  recommendations. This option takes RFCs topic by topic and covers those topics through them.
- Where a published standard exists, it is used as published. Where none exists, the standards
  supply their own answer. They are therefore entirely ours without being invented from nothing.
- Good conventions from elsewhere remain available on their merits, with credit, such as JSON:API's
  document shape and query parameters and AIP-136's custom-method syntax.

The rules:

1. The standards `MUST` be self-contained. Every rule is stated in the standards, and no rule is
   incorporated by reference.
2. Where an IETF RFC covers a topic, the standards `SHOULD` adopt it as published. Where they keep
   their own answer instead, they `MUST` record why.
3. Conventions taken from other specifications `SHOULD` be credited to their source.

### Positive consequences

- One set of answers, stated in our own words, with every borrowed rule credited.
- Wherever an RFC exists, a rule rests on an IETF standard that HTTP libraries and tooling already
  understand.
- The owning service keeps control of what can be queried.
- The same standards could later serve client-facing and public APIs without a second design.

### Negative consequences

- Topics with no RFC, such as payload shape, filtering, sorting, paging, and bulk operations, are
  ours to write and maintain.
- No single outside document describes the standards. They are learned from these ADRs.
- Every departure from an RFC needs a recorded reason, and each is a point someone may contest.

### Rejected options

- **JSON:API:** full conformance is impractical, because its media type, `PATCH`-only updates, `400`
  for unrecognized query parameters, and `relationships` objects would all be departed from. It does
  not cover concurrency or deprecation, and covers asynchronous processing only in non-normative
  recommendations. Its useful conventions remain available to the standards, with credit.
- **Hypermedia formats:** they answer almost none of the design questions, and are built for clients
  that discover an API at run time, where ours are generated at build time. JSON-LD aside, none is
  an adopted standard.
- **OData:** a general-purpose query language over every exposed property, most of which cannot
  apply to ciphertext. `$expand` does not cross service boundaries, its ASP.NET Core library depends
  on `IQueryable`, and `$filter` is a string grammar.
- **GraphQL:** it discourages versioning, cannot be used without learning a query language, needs
  authorization per field and per path plus GraphQL-aware infrastructure, and leaves write semantics
  and most design questions to us.
- **gRPC:** a transport rather than an API design standard. proto3 has no required fields, customers
  and browsers need additional tooling, and HTTP/2 with trailers cannot be guaranteed through
  customer-operated proxies.
- **Google AIP:** its tooling is protobuf-first, its filter grammar is a string language, its errors
  are Google-specific, and it is written for Google's infrastructure.
- **Azure guidelines:** written for Azure service teams and infrastructure, with an Azure-specific
  error envelope, a dated `api-version` query parameter on every request, and an OData-style filter
  grammar.
