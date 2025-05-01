# How to use Enums

Following an architecture discussion we've decided to stop using TypeScript's native `enum`s and
favor using objects.

### Reasons include:

- Type-safe
- Smaller bundle size
- Feature parity with native TypeScript enums.
- Fewer surprises

## Our Recommended Approach

Instead of using `enum`s, we use constant objects and derive union types:

**Safe Alternative:**

```ts
export const CipherTypes = {
  Login: 1,
  SecureNote: 2,
  Card: 3,
  Identity: 4,
  SshKey: 5,
} as const;

export type CipherTypeValue = (typeof CipherTypes)[keyof typeof CipherTypes];

declare function useCipher(type: CipherTypeValue): void;

useCipher(CipherTypes.Login); // ✅ Valid
useCipher(42); // ❌ Invalid
```

## The Problems with `enum`s

### 1. `enum`s Emit Extra Code

TypeScript `enum`s generate additional JavaScript code at compile time, increasing bundle size and
potentially degrading performance.

**Example:**

```ts
export enum CipherType {
  Login = 1,
  SecureNote = 2,
  Card = 3,
  Identity = 4,
  SshKey = 5,
}
```

**Compiled Output:**

```js
var CipherType;
(function (CipherType) {
  CipherType[(CipherType["Login"] = 1)] = "Login";
  CipherType[(CipherType["SecureNote"] = 2)] = "SecureNote";
  CipherType[(CipherType["Card"] = 3)] = "Card";
  CipherType[(CipherType["Identity"] = 4)] = "Identity";
  CipherType[(CipherType["SshKey"] = 5)] = "SshKey";
})(CipherType || (CipherType = {}));
```

### 2. Numeric `enum`s Are Not Type Safe

TypeScript allows arbitrary numbers to be passed to functions expecting a numeric `enum`.

**Example:**

```ts
declare function useCipher(type: CipherType): void;

useCipher(42); // This compiles! 😱
```

This undermines the purpose of type safety and can introduce hard-to-track bugs.

### 3. `enum`s Are Named Types

Even when using string or numeric enums, their named type behavior reduces compatibility with
structurally similar values.

## Resources Used

- https://dev.to/ivanzm123/dont-use-enums-in-typescript-they-are-very-dangerous-57bh
- https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums
- https://devblogs.microsoft.com/typescript/announcing-typescript-5-8-beta/#the---erasablesyntaxonly-optio
