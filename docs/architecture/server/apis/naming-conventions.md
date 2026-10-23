# Naming conventions

Notation follows the [APIs index](./index.md#notation).

- Field names `MUST` be in camel case, such as `emailVerified` and `kdfIterations`.
- Fields holding a date or date/time `SHOULD` end in `Date`, such as `creationDate` and
  `expirationDate`.
- Boolean fields `MUST NOT` be prefixed with `is`. Use `active`, not `isActive`.
- Fields whose value is the identifier of another resource `SHOULD NOT` be suffixed with `Id`. A
  string-valued `assignedTo` is self-evidently the identifier of the user it is assigned to, so
  `assignedToId` adds nothing. This standard does not apply to fields that reference external
  identifiers.
