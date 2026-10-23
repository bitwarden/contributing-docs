# Naming conventions

Notation follows the [APIs index](./index.md#notation).

- Field names `MUST` be in camel case, such as `emailVerified` and `kdfIterations`.
- Fields holding a date or date/time `SHOULD` end in `Date`, such as `creationDate` and
  `expirationDate`.
- Boolean fields `MUST NOT` be prefixed with `is`. Use `active`, not `isActive`.
- Fields whose value is the identifier of another resource `SHOULD` end in `Id`, such as
  `organizationId`.
