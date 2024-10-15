# Derived State

It is common to need to cache the result of expensive work that does not represent true alterations
in application state. Derived state exists to store this kind of data in memory and keep it up to
date when the underlying observable state changes.

## `DeriveDefinition`

Derived state has all of the same issues with storage and retrieval that normal state does. Similar
to `KeyDefinition`, derived state depends on `DeriveDefinition`s to define magic string keys to
store and retrieve data from a cache. Unlike normal state, derived state is always stored in memory.
It still takes a `StateDefinition`, but this is used only to define a namespace for the derived
state, the storage location is ignored. _This can lead to collisions if you use the same key for two
different derived state definitions in the same namespace._

Derive definitions can be created in two ways:

<a name="deriveDefinitionFactories"></a>

```typescript
new DeriveDefinition(STATE_DEFINITION, "uniqueKey", _DeriveOptions_);

// or

const keyDefinition: KeyDefinition<T>;
DeriveDefinition.from(keyDefinition, _DeriveOptions_);
```

The first allows building from basic building blocks, the second recognizes that derived state is
often built from existing state and allows you to create a definition from an existing
`KeyDefinition`. The resulting `DeriveDefinition` will have the same state namespace, key, and
`TFrom` type as the `KeyDefinition` it was built from.

### Type Parameters

`DeriveDefinition`s have three type parameters:

- `TFrom`: The type of the state that the derived state is built from.
- `TTo`: The type of the derived state.
- `TDeps`: defines the dependencies required to derive the state. This is further discussed in
  [Derive Definition Options](#derivedefinitionoptions).

### `DeriveDefinitionOptions`

[The `DeriveDefinition` section](#deriveDefinitionFactories) specifies a third parameter as
`_DeriveOptions_`, which is used to fully specify the way to transform `TFrom` to `TTo`.

- `deserializer` - For the same reasons as [Key Definition Options](#keydefinitionoptions),
  `DeriveDefinition`s require have a `deserializer` function that is used to convert the stored data
  back into the `TTo` type.
- `derive` - A function that takes the current state and returns the derived state. This function
  takes two parameters:
  - `from` - The latest value of the parent state.
  - `deps` - dependencies used to instantiate the derived state. These are provided when the
    `DerivedState` class is instantiated. This object should contain all of the application runtime
    dependencies for transform the from parent state to the derived state.
- `cleanupDelayMs` (optional) - Takes the number of milliseconds to wait before cleaning up the
  state after the last subscriber unsubscribes. Defaults to 1000ms. If you have a particularly
  expensive operation, such as decryption of a vault, it may be worth increasing this value to avoid
  unnecessary recomputation.

Specifying dependencies required for your `derive` function is done through the type parameters on
`DerivedState`.

```typescript
new DerivedState<TFrom, TTo, { example: Dependency }>();
```

would require a `deps` object with an `example` property of type `Dependency` to be passed to any
`DerivedState` configured to use the `DerivedDefinition`.

:::warning

Both `derive` and `deserializer` functions should take null inputs into consideration. Both parent
state and stored data for deserialization can be `null` or `undefined`.

:::

## `DerivedStateProvider`

The `DerivedState<TFrom, TTo, TDeps>` class has a purpose-built provider which instantiates the
correct `DerivedState` implementation for a given application context. These derived states are
cached within a context, so that multiple instances of the same derived state will share the same
underlying cache, based on the `DeriveDefinition` used to create them.

Instantiating a `DerivedState` instance requires an observable parent state, the derive definition,
and an object containing the dependencies defined in the `DeriveDefinition` type parameters.

```typescript
interface DerivedStateProvider {
  get: <TFrom, TTo, TDeps extends DerivedStateDependencies>(
    parentState$: Observable<TFrom>,
    deriveDefinition: DeriveDefinition<TFrom, TTo, TDeps>,
    dependencies: TDeps,
  ) => DerivedState<TTo>;
}
```

:::tip

Any observable can be used as the parent state. If you need to perform some kind of work on data
stored to disk prior to sending to your `derive` functions, that is supported.

:::

## `DerivedState`

`DerivedState` is intended to be built with a provider rather than directly instantiated. The
interface consists of two items:

```typescript
interface DerivedState<T> {
  state$: Observable<T>;
  forceValue(value: T): Promise<T>;
}
```

- `state$` - An observable that emits the current value of the derived state and emits new values
  whenever the parent state changes.
- `forceValue` - A function that takes a value and immediately sets `state$` to that value. This is
  useful for clearing derived state from memory without impacting the parent state, such as during
  logout.

:::note

`forceValue` forces `state$` _once_. It does not prevent the derived state from being recomputed
when the parent state changes.

:::
