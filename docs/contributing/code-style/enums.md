# TypeScript Const Enums

We don't use Typescript enums because they are not fully type-safe and can cause surprises. Instead
of using enums, we use constant objects.

## Our Recommended Approach

```ts
export const _PasskeyAction = Object.freeze({
  Register: "register",
  Authenticate: "authenticate",
} as const);

export type PasskeyAction = (typeof _PasskeyAction)[keyof typeof _PasskeyAction];
export const PasskeyAction: { [K in keyof typeof _PasskeyAction]: PasskeyAction } = _PasskeyAction;

// Usage examples
const register = PasskeyAction.Register; // ✅ Type = const register: PasskeyAction

declare function usePasskey(action: PasskeyAction): void;

usePasskey(PasskeyAction.Authenticate); // ✅ Valid
usePasskey(0); // ❌ Invalid
```

## Resources Used

- https://dev.to/ivanzm123/dont-use-enums-in-typescript-they-are-very-dangerous-57bh
- https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums
