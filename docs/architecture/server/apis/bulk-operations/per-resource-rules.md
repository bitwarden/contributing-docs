# Per-resource rules

Notation follows the [APIs index](../index.md#notation).

[Targeting](./targeting.md) decides which resources a caller can reach. Per-resource rules decide
what the caller may do to each of them. Both always apply.

- Each targeted resource `MUST` be held to the same authorization, validation, and business rules as
  the corresponding single-resource API - including rules that depend on the resource's current
  state, such as which status transitions are allowed.
- Each resource that changes `MUST` produce the same side effects - events, notifications, audit
  records - as the single-resource API would.

A service `MAY` implement a bulk operation however it likes - including as a single set-based
statement - provided the outcome, including which resources fail and why, is indistinguishable from
applying the single-resource API's rules one resource at a time.
