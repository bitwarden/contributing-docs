# TypeScript Const Enums

We don't use Typescript enums because they are not fully type-safe and can cause surprises. Instead
of using enums, we use constant objects.

## Our Recommended Approach

```ts
export const PasskeyActions = {
  Register: "register",
  Authenticate: "authenticate",
} as const;

export type PasskeyActionValue = (typeof PasskeyActions)[keyof typeof PasskeyActions];

declare function usePasskeyAction(action: PasskeyActionValue): void;

usePasskey(PasskeyActions.Register); // ✅ Valid
usePasskey(0); // ❌ Invalid
```

## Resources Used

- https://dev.to/ivanzm123/dont-use-enums-in-typescript-they-are-very-dangerous-57bh
- https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums
