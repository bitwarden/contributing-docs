# Angular & TypeScript

## HTML

Please ensure each input field and button has a descriptive ID. This will allow QA to more
efficiently write test automation.

The IDs should have the three following _components_:

- **Component Name**: To ensure IDs stay unique we prefix them with the component name. While this
  may change it rarely does and since we avoid re-using the same component name multiple times this
  should be unique.
- **HTML Element**: This allows you at a quick glance understand what we're accessing.
- **Readable name**: Descriptive name of what we're accessing.

Please use dashes within components, and separate the _components_ using underscore.

```
<component name>_<html element>_<readable name>

register_button_submit
register-form_input_email
```

When writing components for the component library it's sometimes necessary to ensure an ID exists in
order to properly handle accessibility with references to other elements. Consider using an auto
generated ID but ensure it can be overridden. Use the following naming convention for automatic IDs:

```
<component selector>-<incrementing number>

bit-input-0
```

Please ensure words in the selector are separated using dash and not camelCase.

## JavaScript / TypeScript

We use [Prettier](https://prettier.io/) and [ESLint](https://eslint.org/) to automatically format
and lint the code base. `npm ci` will automatically install pre-commit hooks to run Prettier and
ESLint on your changes each time you create a commit.

Alternatively, you can run them manually:

```bash
npm run prettier
npm run lint:fix
```

### Angular Style Guide

We generally follow the [Angular Style Guide](https://angular.io/guide/styleguide).

### Variable Naming

- For `boolean` variables, use base word, do **not** include prefixes such as `is`, `has`, etc.
  unless meaning cannot be conveyed without it, such as to avoid confusion with another property.

## RxJS

We have a couple of guidelines when writing RxJS code, which are enforced using the
[`eslint-plugin-rxjs`](https://github.com/cartant/eslint-plugin-rxjs) and the
[`eslint-plugin-rxjs-angular`](https://github.com/cartant/eslint-plugin-rxjs-angular). These rules
are designed to assist in avoiding common RxJS pitfalls which can cause Observables to not be
cleaned up, or behave unexpectedly.

### Avoid subscriptions

Whenever possible we should avoid explicit subscriptions, and instead use the `| async` pipe in the
templates. This will ensure that the subscription is cleaned up when the component is destroyed
without any of the boilerplate.

To this end, we can use the `.pipe` operation along with the rxjs operators to modify the input
observable into something we can display.

Consider the following example, it's quite easy to forget to unsubscribe from the observable, we
also have a bit more boilerplate than we'd like.

```typescript
private destroy$ = new Subject();
public transformed = [];

observable$
  .pipe(takeUntil(this.destroy$))
  .subscribe((v) => {
    transformed = transform(v);
  });

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}

// Template
<div *ngFor="let t of transformed">
  {{t}}
</div>
```

Now instead consider the following example, in which we replaced the subscribe with `| async`.

```typescript
transformed$ = observable$.pipe(map(transform));

// Template
<div *ngFor="let t of transformed$ | async">
  {{t}}
</div>
```

### Unsubscribe using `takeUntilDestroyed`

Dangling subscriptions are a common cause of memory leaks. To avoid this we use the
[`prefer-takeUntil`](https://github.com/cartant/eslint-plugin-rxjs-angular/blob/main/docs/rules/prefer-takeuntil.md)
rule. Which requires that any subscription is first piped through a
[`takeUntilDestroyed`](https://angular.io/api/core/rxjs-interop/takeUntilDestroyed) operator.

The main benefit of the `takeUntil` pattern is that reviewers can at a quick glance verify the
subscription is cleaned up.

```ts
constructor() {
  // takeUntilDestroyed must be called from an injector context
  this.observable$
    .pipe(takeUntilDestroyed())
    .subscribe(value => console.log);
}
```

When not called from an injector context, you can pass the `DestroyRef` as an argument.

```ts
constructor(private destroyRef: DestroyRef){}

ngOnInit() {
  this.observable$
    .pipe(takeUntilDestroyed(this.destroyRef))
    // This subscription will automatically be cleaned up when the component is destroyed
    .subscribe(value => console.log);
}
```

### No async subscribes

Async subscriptions rarely work as you expect them. Rather than executing in sequence, there is a
chance of them executing in parallel. Which can easily lead to unexpected behavior. To avoid this,
async subscriptions are forbidden in our codebase, and you instead need to pick the right operation.

Some appropriate operators are:

- [`switchMap`](https://www.learnrxjs.io/learn-rxjs/operators/transformation/switchmap): Cancels the
  previous operation making it appropriate for scenarios where we do not care about old results
  after a new input has been received.
- [`concatMap`](https://www.learnrxjs.io/learn-rxjs/operators/transformation/concatmap): Runs the
  async operations in order, preventing parallel and out of order execution. Use this if we care
  about processing each event.
- [`mergeMap`](https://www.learnrxjs.io/learn-rxjs/operators/transformation/mergemap): Please
  consider carefully if this is the right operator for your use case. mergeMap will flatten
  observables but not care about the order. If ordering is important use `concatMap`. If you only
  care about the latest value use `switchMap`.

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

### String-backed Enum-likes ([ADR-0025](../../architecture/adr/0025-ts-deprecate-enums.md))

String-typed enum likes can be used as inputs of a component directly. Simply expose the enum-like
property from your component:

```ts
// given:
const EnumLike = { Some = "some", Value: "value" };
type EnumLike = EnumLike[keyof typeof EnumLike];

// add the input:
@Component({ ... })
class YourComponent {
   @Input() input: EnumLike = EnumLike.Some;

   // ...
}
```

Composers can use the enum's string values directly:

```html
<my-component input="value" />
```

### Numeric Enum-likes ([ADR-0025](../../architecture/adr/0025-ts-deprecate-enums.md))

Using numeric enum-likes in components should be avoided. If it is necessary, follow the same
pattern as a string-backed enum.

Composers that need hard-coded enum-likes in their template should expose the data from their
component:

```ts
import { EnumLike } from "...";

// add the input to your component:
@Component({ ... })
class TheirComponent {
   protected readonly EnumLike = EnumLike;
}
```

And then bind the input in the template:

```ts
<my-component [input]='EnumLike.Value' />
```
