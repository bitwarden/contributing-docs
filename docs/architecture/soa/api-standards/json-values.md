# JSON values

- Dates `MUST` be formatted in ISO 8601 (for example `2026-01-01T00:00:00Z`), `MUST` include a time
  zone indicator, and `SHOULD` be in UTC.
- Values constrained to a fixed set `SHOULD` be enumerated in uppercase ASCII (for example `RED`,
  `GREEN`, `BLUE`) in the OpenAPI description and in examples. At runtime, APIs `MUST` ignore case
  when validating them.
- APIs `SHOULD` strip leading and trailing whitespace from strings before processing them.
- APIs `MUST` treat an empty string as if the field were not present, and `MUST` treat a field that
  is not present as `null`, except in [partial updates](./partial-updates.md).
- APIs `SHOULD NOT` include `null` fields in responses.

An empty string and `null` are treated alike because a distinction between them has to survive every
serializer, language, and data store a value passes through. Treating them the same removes that
class of bug.
