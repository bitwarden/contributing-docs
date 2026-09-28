---
sidebar_position: 8
---

# Naming conventions

- Field names `MUST` be in camel case (e.g. `firstName`, `lastName`).
- Fields holding a date or date/time `SHOULD` end in `At` (e.g. `createdAt`, `expiresAt`).
- Boolean fields `MUST NOT` be prefixed with `is` (e.g. `active`, not `isActive`).
- Fields whose value is the identifier of another resource `SHOULD NOT` be suffixed with `Id`. A
  string-valued `assignedTo` is self-evidently the identifier of the user it is assigned to;
  `assignedToId` adds nothing. This standard does not apply to fields that reference external
  identifiers.
