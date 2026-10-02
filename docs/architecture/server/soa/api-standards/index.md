# API standards

In general, RESTful APIs are resource-oriented and do one of 4 things:

- **Create** a resource.
- **Read** a resource.
- **Update** a resource.
- **Delete** a resource.

This is the familiar CRUD paradigm and, while there will always be exceptions, developers `SHOULD`
strive to think in these terms for every API created. Both for simplicity and consistency.

Standards for APIs that don't fit cleanly into the CRUD paradigm (e.g. actions, bulk processing)
will be forthcoming .

## Well-defined APIs

A well-defined API spells out exactly how it should be called and what the caller can expect in
return - for both the happy path and the not-so-happy path. Developers are encouraged to think in
terms of resources and be on guard against **API proliferation** that can result from over-tailoring
APIs to the unique needs of this caller or that.

In general, it is better to have one API per resource that can be called two different ways (e.g.
query parameters) than two APIs that can only be called one way.

## Notation

The keywords `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY` are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/info/rfc2119/).

## Contents

- [API paths](./api-paths.md)
- [Verbs](./verbs.md)
- [Creating resources](./creating-resources.md)
- [Read many](./read-many.md)
- [Read one](./read-one.md)
- [Updating resources](./updating-resources.md)
- [Deleting resources](./deleting-resources.md)
  - [Soft deletes](./deleting-resources.md#soft-deletes)
