# `CredentialGeneratorService`

The `CredentialGeneratorService` is the entry point to the generator ecosystem. It
serves generator instances, persistent settings, user preferences, and algorithm
metadata to its callers. Its interfaces are fully reactive, and its settings objects
operate like rxjs subjects.

:::tip[Run hot]

The service's observables are optimized to run hot, and are inefficient
when used with `firstValueFrom`. For the best performance, prefer
subscription to one-time activation.

:::

## Reactivity

The generator's reactivity relies on three reactive dependency patterns. When your
observables follow these patterns, generator emissions are highly predictable.

* `Do<T>`   - An observable that emits requests to be fulfilled by the service.
              The `generate$` method watches an `Do<GeneratorRequest>` that signals
              when it should generate a new value.
* `Live<T>` - An observable that emits when its value changes. These interfaces
              are mostly used to track internal state. The `Observable<T>`
              returned by `preference$` acts like a `Live<T>`.
* `Once<T>` - An observable that emits a single value and completes when that
              value is no longer available. Many methods complete when their
              `Once<Account>` dependency completes.


In code, these are all modelled using `Observable<T>` for interoperability. Their
their behaviors are enforced programmatically.

All generator observables have nondeterministic behavior. The primary form of
nondeterminism is asynchronous observables. Methods like `algorithms$` and
`generate$` depend on user state, and thus are necessarily asynchronous.
Consult the service documentation and tests for further details.

### Applied Reactivity

Assume:
```ts
import * from "@bitwarden/generator-core"; // other imports omitted

// on$ requires `Do<GeneratorRequest>` semantics
const on$ = new Subject<GeneratorRequest>();

// account$ requires `Once<Account>` semantics
const account$ = inject(AccountService).activeAccount$.pipe(pin());

const service = inject(CredentialGeneratorService);
```

#### Generating an email address

The following example generates an email address using the user's preferred
email generator algorithm.

```ts
service.generate$({ on$, account$ }).subscribe((generated) => {
  console.log(generated);
});

on$.next({ type: Type.email });
```

#### Generating a password

The following example generates a password explicitly. If the password type is
rejected by a policy, then `generate$` falls back to a passphrase.

```ts
service.generate$({ on$, account$ }).subscribe((generated) => {
  console.log(generated);
});

on$.next({ algorithm: Algorithm.password })
```

:::info

If your use case requires a precise algorithm, you need to create a custom profile
that disables the default policy. See [Add a Profile](./add-a-profile.md) for more
information.

:::

#### Loading and saving built-in settings

Settings are always algorithm-specific. They're loaded from the service
using  a subject that derives its type from its metadata argument.

`BuiltIn` contains static metadata for algorithms provided by the generator
system.

```ts
// settings are emitted once $account emits and the `UserKey` becomes available.
const settings$ = service.settings$(BuiltIn.passphrase, { $account });
settings$.subscribe({
  next: (settings) => console.log(settings),
  error: (error) => console.log(error),
  complete: () => console.log("settings$ completed"),
});

// write to the settings using `next(...)`; the value emits on *all* instances
// loaded using `BuiltIn.passphrase`.
settings$.next({
  numWords: 6,
  wordSeparator: "-";
  capitalize: true;
  includeNumber: true;
})

// settings$ forwards errors to instance subscribers only
service.settings$(BuiltIn.passphrase, { $account }).subscribe({
  error: () => console.log("this doesn't receive the error"),
});
settings$.error(new Error("I've made a huge mistake"));

// settings$ forwards complete to listeners subscribed to settings$ instance only
service.settings$(BuiltIn.passphrase, { $account }).subscribe({
  compelte: () => console.log("this doesn't receive the complete"),
});
settings$.complete();
```

#### Loading and saving forwarder extension settings

The forwarder metadata is constructed dynamically and must be queried.

```ts
import { Vendor } from "@bitwarden/common/tools/extension/vendors"

const forwarder = service.forwarder(Vendor.bitwarden);
const settings$ = service.settings(forwarder, { $account });

// from here it acts as above.
```


## Algorithm metadata

Algorithm metadata includes shared i18n keys and UX behavior hints so that service
consumers can provide a consistent experience with the angular components. They also
indicate an algorithm's type and algorithm.

### Applied Metadata

```ts
import * from "@bitwarden/generator-core"; // other imports omitted

// on$ requires `Do<GeneratorRequest>` semantics
const on$ = new Subject<GeneratorRequest>();

// account$ requires `Once<Account>` semantics
const account$ = inject(AccountService).activeAccount$.pipe(pin());

const service = inject(CredentialGeneratorService);
```

#### System metadata

```ts
const passwordAlgorithm = service.algorithm(Algorithm.password);
const emailAlgorithms = service.algorithms(Type.email);
const mixedAlgorithms = service.algorithms([Type.email, Type.username]);

// the email category contains forwarder algorithms
const forwarderAlgorithms = service.algorithms(Type.email).map(isForwarderExtensionId);
```

:::warn

Metadata provided by the system endpoints does not enforce algorithm
availability policy.

:::


#### Live algorithm metadata

Live algorithm  metadata requires an account and filters its output according
to the account's policy controls.

```ts
const emailAlgs$ = service.algorithms$(Type.email, { $account });
const passwordAlgs$ = service.algorithms$(Type.password, { $account });
const usernameAlgs$ = service.algorithms$(Type.username, { $account });
```





## Forwarder Extensions

Vendors can integrate their email forwarding services at the `forwarder` extension
site. The site allows them to define an account identifier lookup and a generate
forwarding address RPC. Forwarder settings storage and availability are delegated
to the extension system. All forwarders share a single format for their settings
and determine which are surfaced to the user via the extension's `requestedFields`
logic.

Forwarder extensions presently invoke 3rd party APIs using `tools/integration/rpc`
functions. These interfaces let the generator surface contextual information,
such as the user's current website or a custom API host, to the extension
on a need-to-know basis. At the time of writing, the website is specified as a
generator request parameter.

:::note

The integration code, including RPC and context control, will not be discussed
at the present time. These systems were introduced hastily, and require refinement.

It is our intention to review the interfaces as we port the generator system to
the SDK.

:::

