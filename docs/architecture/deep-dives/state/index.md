# State Provider Framework

The state provider framework was designed for the purpose of allowing state to be owned by domains but also to enforce good practices, reduce boilerplate around account switching, and provide a trustworthy observable stream of that state.

An example usage of the framework is below:

```typescript
import { FOLDERS_USER_STATE, FOLDERS_GLOBAL_STATE } from "../key-definitions";

class FolderService {
  private folderGlobalState: GlobalState<GlobalFolderState>;
  private folderUserState: UserState<FolderState>;

  constructor(
    private userStateProvider: UserStateProvider,
    private globalStateProvider: GlobalStateProvider
  ) {
    this.folderUserState = userStateProvider.get(FOLDERS_USER_STATE);
    this.folderGlobalState = globalStateProvider.get(FOLDERS_GLOBAL_STATE);
  }

  get folders$(): Observable<Folder[]> {
    return this.folderUserState.pipe(map(folders => this.transform(folders)));
  }
}
```

The constructor takes in 2 new interfaces that both expose a `get` method that takes a single argument, a `KeyDefinition` that should be imported from a file where it was defined as a `const`. A `KeyDefinition` has the following structure.

```typescript
class KeyDefinition<T> {
  stateDefinition: StateDefinition;
  key: string;
  deserializer: (jsonValue: Jsonify<T>) => T;
}
```

If a service is stateless or only needs one of either global or user state they only need to take the specific provider that they need. But if you do need state and you call the `get` methods you are returned `UserState<T>` and `GlobalState<T>` respectively. They both expose 2 common properties, those are `state$: Observable<T>` and `update(configureState: (state: T) => T): Promise<T>`.


The `state$` property is a stream of state in the shape of the generic `T` that is defined on the `KeyDefinition` passed
into the providers `get` method. The `state$` observable only subscribes to it's upstream data sources when it itself is subscribed to.

The `update` property is a method that you call with your own function that updates the current state with your desired
shape. The callback style of updating state is such that you can make additive changes to your state vs just replacing the
whole value (which you can still do). An example of this could be pushing an item onto an array.

The `update` method on both `UserState<T>` and `GlobalState<T>` will cause an emission to the associated `state$` observable. For `GlobalState<T>` this is the only way the `state$` observable will update, but for `UserState<T>` it will emit when the currently active user updates. When that updates the observable will automatically update with the equivalent
data for that user.

## UserState&lt;T&gt;

UserState includes a few more API's that help you interact with a users state, it has a `updateFor` and `createDerived`.

The `updateFor` method takes a `UserId` in its first argument that allows you to update the state for a specified user
instead of the user that is currently active. Its second argument is the same callback that exists in the `update` method.

The `createDerived` method looks like this:

```typescript
createDerived<TTo>(derivedStateDefinition: DerivedStateDefinition<T, TTo>): DerivedUserState<T, TTo>
```

and the definition of `DerivedStateDefinition` looks like:

```typescript
class DerivedStateDefinition<TFrom, TTo> {
  keyDefinition: KeyDefinition<TFrom>;
  converter: (data: TFrom, context: { activeUserKey: UserKey, encryptService: EncryptService}) => Promise<TTo>
}
```

This class encapsulates the logic for how to go from one version of your state into another form. This is often because encrypted data is stored on disk, but decrypted data is what will be shown to the user.
