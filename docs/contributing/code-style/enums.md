# TypeScript Const Enums

We don't use Typescript enums because they are not fully type-safe and can cause surprises. Instead
of using enums, we use constant objects.

## Our Recommended Approach

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

## Resources Used

- https://dev.to/ivanzm123/dont-use-enums-in-typescript-they-are-very-dangerous-57bh
- https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums
- https://devblogs.microsoft.com/typescript/announcing-typescript-5-8-beta/#the---erasablesyntaxonly-optio
