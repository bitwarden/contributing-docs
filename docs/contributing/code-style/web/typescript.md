# TypeScript

We use [Prettier](https://prettier.io/) and [ESLint](https://eslint.org/) to automatically format
and lint the code base. `npm ci` will automatically install pre-commit hooks to run Prettier and
ESLint on your changes each time you create a commit.

Alternatively, you can run them manually:

```bash
npm run prettier
npm run lint:fix
```

## Naming

- For `boolean` variables, use base word, do **not** include prefixes such as `is`, `has`, etc.
  unless meaning cannot be conveyed without it, such as to avoid confusion with another property.

## Import statements

We have a couple of guidelines for import statements, which are enforced using the eslint rules
[`no-restricted-imports`](https://eslint.org/docs/latest/rules/no-restricted-imports),
[`import/order`](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md),
and
[`import/no-restricted-paths`](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md).

These rules aim to:

- Prevent relative imports across package boundaries.
- Restrict packages from importing application specific code.
- Enforce a convention for the order of import statements.

### Imports within the same package

Use relative imports when importing within the same package. For example, `MyNewService` and
`LogService` are both in the `@bitwarden/common` package.

```typescript
import { LogService } from "../../abstractions/log.service";

export class MyNewService {}
```

### Imports from different packages

For imports from different packages, use absolute imports. For example `DifferentPackageService` is
not in `@bitwarden/common` and needs to import `LogService` from `@bitwarden/common`.

```typescript
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";

export class DifferentPackageService {}
```

## Avoid TypeScript Enums

TypeScript enums are not fully type-safe and can [cause surprises][enum-surprises]. Your code should
use [constant objects][constant-object-pattern] instead of introducing a new enum.

### Our Recommended Approach ([ADR-0025](../../../architecture/adr/0025-ts-deprecate-enums.md))

- Use the same name for your type- and value-declaration.
- Use `type` to derive type information from the const object.
- Avoid asserting the type of an enum-like. Use explicit types instead.
- Create utilities to convert and identify enums modelled as primitives.

#### Numeric enum-likes

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
export type CipherType = (typeof CipherType)[keyof typeof CipherType];
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

#### String enum-likes

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
export type CredentialType = (typeof CredentialType)[keyof typeof CredentialType];
```

:::note[Enum-likes are structural types!]

Unlike string-typed enums, enum-likes do not reify a type for each member. This means that you can
use their string value or their enum member interchangeably.

```ts
let value: CredentialType = CredentialType.Username;

// this is typesafe!
value = "email";
```

However, the string-typed values are not always identified as enum members. Thus, when the const
object is in scope, prefer it to the literal value.

:::

### Utilities

The following utilities can be used to maintain type safety at runtime.

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
