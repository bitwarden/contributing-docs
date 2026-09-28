---
sidebar_position: 5
---

# Breaking changes and versioning

APIs `SHOULD NOT` make **breaking changes**. A breaking change is any change that causes a request
that is valid today to be rejected tomorrow, or a response that a caller can process today to become
unprocessable. In practice, that means:

1. Adding a new, required field.
1. Making an optional field required.
1. Changing the datatype of a field.
1. Adding additional constraints to a field.
1. Removing a field from a response.

The verb is `SHOULD NOT` rather than `MUST NOT` because these are service-to-service APIs and we own
every caller. A team `MAY` make a breaking change in place when it can account for every caller —
either because the change has been coordinated with them, or because the rejection surfaces
somewhere the caller or the user can act on it.

Bugs, however, `SHOULD` be fixed "in place", without creating new versions of the API, even if the
changes would technically be considered breaking changes.

Otherwise, if changes need to be made that _would_ be breaking changes, a new version of the API
`MUST` be created and the old one [deprecated](./deprecation.md).

> **Adding a value to a constrained field deserves a second look.** It is additive, so it is not a
> breaking change by the definition above, and a caller that treats the field as an open string is
> unaffected. But a generated client that deserializes the field into a closed enumeration will fail
> on a value it has never seen — and it will fail at the client, on a change that looked safe from
> the service. Consider whether the callers of that field are tolerant of unknown values before
> adding one.
