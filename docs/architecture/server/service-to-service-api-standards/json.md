---
sidebar_position: 7
---

# JSON

- Dates `MUST` be formatted in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format (e.g.
  `2026-01-01T00:00:00Z`) and `MUST` include a time zone indicator and `SHOULD` standardize on UTC.
- Field values that are constrained to a fixed set of values `SHOULD` enumerate the valid values in
  all caps (e.g. `RED`, `GREEN`, `BLUE`), restricted to only ASCII characters, in both in the
  OpenAPI spec and in example JSON to help distinguish these fields from free-text string fields. At
  runtime, however, APIs `MUST` ignore case when validating these values.
- APIs `SHOULD` strip leading and trailing whitespace from all strings before processing them.
- APIs `MUST` treat an empty string the same as if the field is not present.
- APIs `MUST` treat a field that isn't present the same as `null`, except in
  [partial updates](./partial-updates.md).
- APIs `SHOULD NOT` include `null` fields in responses.
