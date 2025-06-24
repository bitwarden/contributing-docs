# Avoid TypeScript Enums

TypeScript enums are not fully type-safe and can [cause surprises][enum-surprises]. Your code should
use [constant objects][constant-object-pattern] instead of introducing a new enum.

## Our Recommended Approach ([ADR-0025](../../architecture/adr/0025-ts-deprecate-enums.md))

- Use the same name for your type- and value-declaration.
- Use `type` to derive type information from the const object.
- Create utilities to convert and identify enums modelled as primitives.

:::tip

This pattern should simplify the usage of your new objects, improve type safety in files that have
adopted TS-strict, and make transitioning an enum to a const object much easier.

:::

### Example

Given the following enum:

```ts
export enum CipherType = {
  Login: 1,
  SecureNote: 2,
  Card: 3,
  Identity: 4,
  SshKey: 5,
};
```

You can redefine it as an object like so:

```ts
const CipherType = {
  Login: 1,
  SecureNote: 2,
  Card: 3,
  Identity: 4,
  SshKey: 5,
} as const;

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
```

:::warning

Unlike an enum, typescript lifts the type of the members of `const CipherType` to `number`. Code
like the following requires you explicitly type your variables:

```ts
// ✅ Do: strongly type enum-likes
const subject = new Subject<CipherType>();
let value: CipherType = CipherType.Login;

// ❌ Do not: use type inference
const array = [CipherType.Login]; // infers `number[]`
let value = CipherType.Login; // infers `1`
```

:::

The following utilities may assist introspection:

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
