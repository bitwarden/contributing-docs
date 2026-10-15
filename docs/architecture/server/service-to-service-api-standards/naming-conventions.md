---
sidebar_position: 7
---

# Naming conventions

- Field names `MUST` be camel case (for example `firstName`).
- Fields holding a date or date and time `SHOULD` end in `At` (for example `expiresAt`).
- Boolean fields `MUST NOT` be prefixed with `is` (`active`, not `isActive`).
- Fields holding the identifier of another resource `SHOULD NOT` be suffixed with `Id`. A
  string-valued `assignedTo` is self-evidently the identifier of the user it is assigned to. This
  does not apply to fields holding external identifiers.
