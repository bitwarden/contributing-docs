# State Provider Framework

The state provider framework was designed for the purpose of allowing state to be owned by domains
but also to enforce good practices, reduce boilerplate around account switching, and provide a
trustworthy observable stream of that state.

## APIs

- [Storage definitions](#storage-definitions)
  - [`StateDefinition`](#statedefinition)
  - [`KeyDefinition`](#keydefinition)
- [`StateProvider`](#stateprovider)
- [`ActiveUserState<T>`](#activeuserstatet)
- [`GlobalState<T>`](#globalstatet)
- [`SingleUserState<T>`](#singleuserstatet)

### Storage definitions

In order to store and retrieve data, we need to have constant keys to reference storage locations.
This includes a storage medium (disk or memory), and a unique key. `StateDefinition` and
`KeyDefinition` classes that allow for reasonable reuse of partial namespaces while allowing
expansion to precise keys. They exist to help minimize the potential of overlaps in a distributed
storage framework.

:::warning

Once you have created the definitions, you need to take extreme caution when changing any part of
the namespace. If you change the name of a `StateDefinition` pointing at `"disk"` without also
migrating data from the old name to the new name you will lose data. Data pointing at `"memory"` can
have their name changed.

:::

#### `StateDefinition`

`StateDefinition` is a simple API but a very core part of making the State Provider Framework work
smoothly. It defines a storage location and top-level namespace for storage. Teams will interact
with it only in a single, `state-definitions.ts`, file in the
[`clients`](https://github.com/bitwarden/clients) repository. This file is located under platform
code ownership but teams are expected to create edits to it. A team will edit this file to include a
line like such:

```typescript
export const MY_DOMAIN_DISK = new StateDefinition("myDomain", "disk");
```

The first argument to the `StateDefinition` constructor is expected to be a human readable,
camelCase formatted name for your domain, or state area. The second argument will either be the
string literal `"disk"` or `"memory"` dictating where all the state using this `StateDefinition`
should be stored. The platform team will be responsible to reviewing all new and updated entries in
this file and will be looking to make sure that there are no duplicate entries containing the same
state name and state location. Teams CAN have the same state name used for both `"disk"` and
`"memory"` locations. Tests are included to ensure this uniqueness and core naming guidelines so you
can ensure a review for a new `StateDefinition` entry can be done promptly and with very few
surprises.

_TODO: Make tests_

:::note

Secure storage is not currently supported as a storage location in the State Provider Framework. For
now, don't migrate data that is stored in secure storage but please contact platform when you have
data you wanted to migrate so we can prioritize a long term solution. If you need new data in secure
storage, use `StateService` for now.

:::

#### `KeyDefinition`

`KeyDefinition` builds on the idea of [`StateDefinition`](#statedefinition) but it gets more
specific about the data to be stored. `KeyDefinition`s can also be instantiated in your own teams
code. This might mean creating it in the same file as the service you plan to consume it or you may
want to have a single `key-definitions.ts` file that contains all the entries for your team. Some
example instantiations are:

```typescript
const MY_DOMAIN_DATA = new KeyDefinition<MyState>(MY_DOMAIN_DISK, "data", {
  // convert to your data from serialized representation `{ foo: string }` to fully-typed `MyState`
  deserializer: (jsonData) => MyState.fromJSON(jsonData),
});

// Or if your state is an array, use the built in helper
const MY_DOMAIN_DATA: KeyDefinition<MyStateElement[]> = KeyDefinition.array<MyStateElement>(
  MY_DOMAIN_DISK,
  "data",
  {
    deserializer: (jsonDataElement) => MyState.fromJSON(jsonDataElement), // provide a deserializer just for the element of the array
  },
);

// record
const MY_DOMAIN_DATA: KeyDefinition<Record<string, MyStateElement>> =
  KeyDefinition.record<MyStateValue>(MY_DOMAIN_DISK, "data", {
    deserializer: (jsonDataValue) => MyState.fromJSON(jsonDataValue), // provide a deserializer just for the value in each key-valu pair
  });
```

The first argument to `KeyDefinition` is always the `StateDefinition` that this key should belong
to. The second argument should be a human readable, camelCase formatted name of the `KeyDefinition`.
For example, the accounts service may wish to store a known accounts array on disk and choose
`knownAccounts` to be the second argument. This name should be unique amongst all other
`KeyDefinition`s that consume the same `StateDefinition`. The responsibility of this uniqueness is
on the team. As such, you should never consume the `StateDefinition` of another team in your own
`KeyDefinition`. The third argument is an object of type
[`KeyDefinitionOptions`](#keydefinitionoptions).

##### `KeyDefinitionOptions`

`deserializer` (required) - Takes a method that gives you your state in it's JSON format and makes
you responsible for converting that into JSON back into a full JavaScript object, if you choose to
use a class to represent your state that means having it's prototype and any method you declare on
it. If your state is a simple value like `string`, `boolean`, `number`, or arrays of those values,
your deserializer can be as simple as `data => data`. But, if your data has something like `Date`,
which gets serialized as a string you will need to convert that back into a `Date` like:
`data => new Date(data)`.

`cleanupDelayMs` (optional) - Takes a number of milliseconds to wait before cleaning up the state
after the last subscriber has unsubscribed. Defaults to 1000ms.

### `StateProvider`

`StateProvider` is an injectable service that includes 3 methods for getting state. These three
methods are helpers for invoking their more modular siblings `ActiveStateProvider.get`,
`SingleUserStateProvider.get`, and `GlobalStateProvider.get` and they have the following type
definitions:

```typescript
interface StateProvider {
  getActive<T>(keyDefinition: KeyDefinition<T>): ActiveUserState<T>;
  getUser<T>(userId: UserId, keyDefinition: KeyDefinition<T>): SingleUserState<T>;
  getGlobal<T>(keyDefinition: KeyDefinition<T>): GlobalState<T>;
}
```

A very common practice will be to inject `StateProvider` in your services constructor and call
`getActive`, `getGlobal`, or both in your constructor and then store private properties for the
resulting `ActiveUserState<T>` and/or `GlobalState<T>`. It's less common to need to call `getUser`
in the constructor because it will require you to know the `UserId` of the user you are attempting
to edit. Instead you will add `private` to the constructor argument injecting `StateProvider` and
instead use it in a method like in the below example.

```typescript
import { FOLDERS_USER_STATE, FOLDERS_GLOBAL_STATE } from "../key-definitions";

class FolderService {
  private folderGlobalState: GlobalState<GlobalFolderState>;
  private folderUserState: ActiveUserState<Record<string, FolderState>>;

  folders$: Observable<Folder[]>;

  constructor(private stateProvider: StateProvider) {
    this.folderUserState = stateProvider.getActive(FOLDERS_USER_STATE);
    this.folderGlobalState = stateProvider.getGlobal(FOLDERS_GLOBAL_STATE);

    this.folders$ = this.folderUserState.pipe(
      map((foldersRecord) => this.transform(foldersRecord)),
    );
  }

  async clear(userId: UserId): Promise<void> {
    await this.stateProvider.getUser(userId, FOLDERS_USER_STATE).update((state) => null);
  }
}
```

### `ActiveUserState<T>`

`ActiveUserState<T>` is an object to help you maintain and view the state of the currently active
user. If the currently active user changes, like through account switching. The data this object
represents will change along with it. Gone is the need to subscribe to
`StateService.activeAccountUnlocked$`. You can see the type definition of the API on
`ActiveUserState<T>` below:

```typescript
interface ActiveUserState<T> {
  state$: Observable<T>;
  update: <TCombine>(updateState: (state: T, dependency: TCombine) => T, stateUpdateOptions?: StateUpdateOptions<TCombine>): Promise<T>;
}
```

:::note

Specifics around `StateUpdateOptions` are discussed in the [Advanced Usage](#advanced-usage)
section.

:::

The `update` method takes a function `updateState: (state: T) => T` that can be used to update the
state in both a destructive and additive way. The function gives you a representation of what is
currently saved as your state and it requires you to return the state that you want saved into
storage. This means if you have an array on your state, you can `push` onto the array and return the
array back. The return value of the `updateState` function is always used as the new state value --
do not rely on object mutation to update!

The `state$` property provides you with an `Observable<T>` that can be subscribed to.
`ActiveUserState<T>.state$` will emit for the following reasons:

- The active user changes.
- The chosen storage location emits an update to the key defined by `KeyDefinition`. This can occur
  for any reason including:
  - You caused an update through the `update` method.
  - Another service in a different context calls `update` on their own instance of
    `ActiveUserState<T>` made from the same `KeyDefinition`.
  - A `SingleUserState<T>` method pointing at the same `KeyDefinition` as `ActiveUserState` and
    pointing at the user that is active that had `update` called
  - Someone updates the key directly on the underlying storage service (Please don't do this)

### `GlobalState<T>`

`GlobalState<T>` has an incredibly similar API surface as `ActiveUserState<T>` except it targets
global scoped storage and does not emit an update to `state$` when the active user changes, only
when the stored value is updated.

### `SingleUserState<T>`

`SingleUserState<T>` behaves very similarly to `GlobalState<T>` where neither will react to active
user changes and you instead give it the user you want it to care about up front, which is publicly
exposed as a `readonly` member.

Updates to `SingleUserState` or `ActiveUserState` handling the same `KeyDefinition` will cause each
other to emit on their `state$` observables if the `userId` handled by the `SingleUserState` happens
to be active at the time of the update.

## Migrating

Migrating data to state providers is incredibly similar to migrating data in general. You create
your own class that extends `Migrator<From, To>`. That will require you to implement your own
`migrate(migrationHelper: MigrationHelper)` method. `MigrationHelper` already includes methods like
`get` and `set` for getting and settings value to storage by their string key. There are also
methods for getting and setting using your `KeyDefinition` or `KeyDefinitionLike` object to and from
user and global state. An example of how you might use these new helpers is below:

```typescript
type ExpectedGlobalState = { myGlobalData: string };

type ExpectedAccountState = { myUserData: string };

const MY_GLOBAL_KEY_DEFINITION: KeyDefinitionLike = {
  stateDefinition: { name: "myState" },
  key: "myGlobalKey",
};
const MY_USER_KEY_DEFINITION: KeyDefinitionLike = {
  stateDefinition: { name: "myState" },
  key: "myUserKey",
};

export class MoveToStateProvider extends Migrator<10, 11> {
  async migrate(migrationHelper: MigrationHelper): Promise<void> {
    const existingGlobalData = await migrationHelper.get<ExpectedGlobalState>("global");

    await migrationHelper.setGlobal(MY_GLOBAL_KEY_DEFINITION, {
      myGlobalData: existingGlobalData.myGlobalData,
    });

    const updateAccount = async (userId: string, account: ExpectedAccountState) => {
      await migrationHelper.setUser(MY_USER_KEY_DEFINITION, {
        myUserData: account.myUserData,
      });
    };

    const accounts = await migrationHelper.getAccounts<ExpectedAccountState>();

    await Promise.all(accounts.map(({ userId, account }) => updateAccount(userId, account)));
  }
}
```

:::note

`getAccounts` only gets data from the legacy account object that was used in `StateService`. As data
gets migrated off of that account object the response from `getAccounts`, which returns a record
where the key will be a users id and the value being the legacy account object.

_TODO: Implement method just for user ids_

:::

### Example PRs

_TODO: Include PR's_

## Testing

Testing business logic with data and observables can sometimes be cumbersome, to help make that a
little easier, there are a suite of helpful "fakes" that can be used instead of traditional "mocks".
Now instead of calling `mock<StateProvider>()` into your service you can instead use
`new FakeStateProvider()`.

_TODO: Refine user story_

## Advanced usage

### `update`

The update method has options defined as follows:

```typescript
{ActiveUser|SingleUser|Global}State<T> {
  // ... rest of type left out for brevity
  update<TCombine>(updateState: (state: T, dependency: TCombine) => T, options?: StateUpdateOptions);
}

type StateUpdateOptions = {
  shouldUpdate?: (state: T, dependency: TCombine) => boolean;
  combineLatestWith?: Observable<TCombine>;
  msTimeout?: number
}
```

The `shouldUpdate` option can be useful to help avoid an unnecessary update, and therefore avoid an
unnecessary emission of `state$`. You might want to use this to avoid setting state to `null` when
it is already `null`. The `shouldUpdate` method gives you in it's first parameter the value of state
before any change has been made to it and the dependency you have, optionally, provided through
`combineLatestWith`. To avoid setting `null` twice you could call `update` like below:

```typescript
await myUserState.update(() => null, { shouldUpdate: (state) => state != null });
```

The `combineLatestWith` option can be useful when updates to your state depend on the data from
another stream of data. In
[this example](https://github.com/bitwarden/clients/blob/2eebf890b5b1cfbf5cb7d1395ed921897d0417fd/libs/common/src/auth/services/account.service.ts#L88-L107)
you can see how we don't want to set a user id to the active account id unless that user id exists
in our known accounts list. This can be preferred over the more manual implementation like such:

```typescript
const accounts = await firstValueFrom(this.accounts$);
if (accounts?.[userId] == null) {
  throw new Error();
}
await this.activeAccountIdState.update(() => userId);
```

The use of the `combineLatestWith` option is preferred because it fixes a couple subtle issues.
First, the use of `firstValueFrom` with no `timeout`. Behind the scenes we enforce that the
observable given to `combineLatestWith` will emit a value in a timely manner, in this case a
`1000ms` timeout but that number is configurable through the `msTimeout` option. The second issue it
fixes, is that we don't guarantee that your `updateState` function is called the instant that the
`update` method is called. We do however promise that it will be called before the returned promise
resolves or rejects. This may be because we have a lock on the current storage key. No such locking
mechanism exists today but it may be implemented in the future. As such, it is safer to use
`combineLatestWith` because the data is more likely to retrieved closer to when it needs to be
evaluated.

## FAQ

### Do I need to have my own in memory cache?

If you previously had a memory cache that exactly represented the data you stored on disk (not
decrypted for example), then you likely don't need that anymore. All the `*State` classes maintain
an in memory cache of the last known value in state for as long as someone is subscribed to the
data. The cache is cleared after 1000ms of no one subscribing to the state though. If you know you
have sporadic subscribers and a high cost of going to disk you may increase that time using the
`cleanupDelayMs` on `KeyDefinitionOptions`.

### I store my data as a Record/Map but expose it as an array, what should I do?

Give `KeyDefinition<T>` generic the record shape you want, or even use the static `record` helper
method. Then to convert that to an array that you expose just do a simple
`.pipe(map(data => this.transform(data)))` to convert that to the array you want to expose.

### Why KeyDefinitionLike

`KeyDefinitionLike` exists to help you create a frozen in time version of your `KeyDefinition` this
is helpful in state migrations so that you don't have to import something from the greater
application which is something that should rarely happen.

### When does my deserializer run?

The `deserialier` that you provide in the `KeyDefinitionOptions` is used whenever your state is
retrieved from a storage service that stores it's data as JSON. All disk storage services serialize
data into JSON but memory storage differs in this area across platforms. That's why it's imperative
to include a high quality JSON deserializer even if you think your object will only be stored in
memory. This can mean you might be able to drop the `*Data` class pattern for your code. Since the
`*Data` class generally represented the JSON safe version of your state which we now do
automatically through the `Jsonify<T>` given to your in your `deserializer` method.

## Structure

![State Diagram](State_Diagram.svg)
