# Avoid TypeScript Enums

TypeScript enums are not fully type-safe and can [cause surprises][enum-surprises]. Your code should
use [constant objects][constant-object-pattern] instead of introducing a new enum.

## Our Recommended Approach ([ADR-0025](../../architecture/adr/0025-ts-deprecate-enums.md))

- Use the same name for your type- and value-declaration.
- Use `type` to derive type information from the const object.
- Avoid asserting the type of an enum-like. Use explicit types instead.
- Create utilities to convert and identify enums modelled as primitives.

### Example

Given the following enum:

```ts
export enum CipherType {
  Login: 1,
  SecureNote: 2,
  Card: 3,
  Identity: 4,
  SshKey: 5,
};
```

You can redefine it as an object like so:

```ts
// freeze to prevent member injection
export const CipherType = Object.freeze({
  Login: 1,
  SecureNote: 2,
  Card: 3,
  Identity: 4,
  SshKey: 5,
} as const);

// derive the enum-like type from the raw data
export type CipherType = CipherType[keyof typeof CipherType];
```

And use it like so:

```ts
// Can be imported together
import { CipherType } from "./cipher-type";

// Used as a type
function doSomething(type: CipherType) {}

// And used as a value (just like a regular `enum`)
doSomething(CipherType.Card);

// advanced use-case: discriminated union definition
type CipherContent =
  | { type: typeof CipherType.Login, username: EncString, ... }
  | { type: typeof CipherType.SecureNote, note: EncString, ... }
```

The above pattern also works with string-typed enum members:

```ts
// freeze to prevent member injection
export const CredentialType = Object.freeze({
  Password: "password",
  Username: "username",
  Email: "email",
  SshKey: "ssh-key",
} as const);

// derive the enum-like type from the raw data
export type CredentialType = CredentialType[keyof typeof CredentialType];
```

:::warning

Unlike an enum, TypeScript lifts the type of the members of `const CipherType` to `number`. Code
like the following requires you explicitly type your variables:

```ts
// ✅ Do: strongly type enum-likes
let value: CipherType = CipherType.Login;
const array: CipherType[] = [CipherType.Login];
const subject = new Subject<CipherType>();

// ❌ Do not: use type inference
let value = CipherType.Login; // infers `1`
const array = [CipherType.Login]; // infers `number[]`

// ❌ Do not: use type assertions
let value = CipherType.Login as CipherType; // this operation is unsafe
```

:::

## Utilities

The following utilities can be used to maintain type safety after compilation. This code assumes
`const CipherType` is frozen.

```ts
import { CipherType } from "./cipher-type";

const namesByCipherType = new Map<CipherType, keyof CipherType>(
  Array.fromEntries(Object.entries(CipherType), ([k, v]) => [v, k]),
);

export function isCipherType(value: number): value is CipherType {
  return namesByCipherType.has(value);
}

export function asCipherType(value: number): CipherType | undefined {
  return isCipherType(value) ? value : undefined;
}

export function nameOfCipherType(value: CipherType): keyof CipherType | undefined {
  return namesByCipherType.get(value);
}
```

[enum-surprises]: https://dev.to/ivanzm123/dont-use-enums-in-typescript-they-are-very-dangerous-57bh
[constant-object-pattern]: https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums
