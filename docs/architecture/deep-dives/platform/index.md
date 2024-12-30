# Platform Overview

The Platform team manages various developer facing features so that other teams can focus on
building rich consumer facing features.

- [Guiding Principles](#guiding-principles)
- [Ownership Criteria](#ownership-criteria)
- [Current Code Ownership](#current-code-ownership)
- [Other Responsibilities](#other-responsibilities)
- [Terms](#terms)

## Guiding Principles

Our goal is to enable downstream teams to develop user facing features that are available or
relatively easily available in all our clients. To support this goal we follow the following
principles.

1. **Interfaces**. We use interfaces or traits to abstract various implementation so teams only have
   to deal with one API. The details of how it's implemented remain internal and able to evolve.
2. **Flexibility**. Some of our abstractions may encapsulate a feature that isn't available on some
   platforms. Instead of making the abstraction only available on those platforms, we should instead
   give the abstraction a way to inform consumers of it's availability. This way, consumers can
   guard their own usage of it and provide fallback logic in case the feature isn't supported.
3. **Easier Developing**. We should strive for the API's we export for others to consume are
   incredibly high quality. They should be easily discoverable, have detailed docs, code examples,
   tests, and more. Whenever possible, we should try and make misuses of our API's compile time
   errors. If that is not possible we should strive to throw or return an error to them as early as
   possible with plenty of details so that the consumer can fix the mistake. We also make it easier
   to develop by analyzing and fixing weak spots that make the developer loop take longer.
4. **Community platforms**. As a Bitwarden team, we primarily build and maintain features to work on
   Bitwarden managed clients. But as more and more logic is moved to our SDK, we should also strive
   to make it extensible such that community members can build their own Bitwarden client. They may
   have their own way of implementing underlying utilities and we should have the goal of making
   that both possible and easy.
5. **Write Once Run Everywhere**. We should enable teams to be able to write their feature once and
   have it run predictably and safely in all the clients that feature should work in.
6. **Faster Product Building**. We should build our building block utilities such that they can
   easily be used in new Bitwarden products.

## Ownership Criteria

> Not everything that fits this criteria are things that are or should be owned by Platform. They
> are for starting conversation.

- Is it a service used by multiple product teams?
  - Examples: Http, State, Clipboard, Crypto
- Is it something that uses different implementations based on hosting environment?
  - Examples: Notifications
-

## Current Code Ownership

### Crypto

Currently named `CryptoFunctionsService` in our TypeScript clients this service offers ways to
interact with both of our supported key derivation functions (PBKDF2 & Argon2), hashing functions,
symmetric/asymmetric encryption/decryption and random data generation. This service is considered
fundamental and therefore doesn't, and shouldn't need to be used behind `isSupported` style checks.
This service has two main implementations, one for web based implementation based on
`window.crypto.subtle` and one for node that utilizes NPM packages.

### Plaintext Persistent Storage

In Bitwarden applications plaintext storage generally has the following traits: unlimited, available
after restarts, and not inherently protected from other non-Bitwarden applications or even
user-installed malware. The data stored there is generally user settings along with user level
encrypted data that is important for ensuring our apps have usability even when offline.

### Secure Persistent Storage

> TODO

### Memory Storage

Most of our clients use an implementation of memory storage that looks like
[this](https://github.com/bitwarden/clients/blob/81a3dce774c3c8e05153a446370cfcb083552ddc/libs/common/src/platform/state/storage/memory-storage.service.ts#L13).
Just a simple class that has a property that stores a key value pair where the value is a converted
to a json string of the value. Our browser extension complicates this though. In browser there are
two different implementations of memory storage. One that is targeted at countable objects and
focuses on speed (utilizes `chrome.storage.session`) and one that is targeted at uncountable objects
(like users ciphers). These implementation are made available to teams through [state](#state).

### State

This is an abstraction on top of our storage services meant to help facilitate caching, reactivity,
deserialization, and safe key creation.

### Clipboard

> Currently utilized through `PlatformUtilsService`

We offer a way to copy text onto systems clipboard. We should build this functionality into a
utility service that just does very simple reads and writes to the clipboard. We might also own a
wrapper around that that can respect the current users chosen `Clear Clipboard` setting, this
service can take options for whether or not the text about to be written to the clipboard should be
automatically cleared based on that setting. The utility service currently only needs functionality
to write simple strings to the clipboard but we should design it such that it's easily extensible
for copying more richer formats, like files.

### Scheduling

We need to offer a way to register and schedule tasks that might need to take place after a client
context goes away.

### Process Reload

> Currently utilized through `SystemService`

We should offer a `ProcessReloadService` that follows the
[optionally supported pattern](#optionally-supported-pattern) and offers a way to do a process
reload for the clients that support it. The logic of when this method should be used will be owned
by other teams. We only own the means to do it.

### Messaging

We offer services for sending and receiving messages from other contexts of a single Bitwarden
application (often referred to as inter-process communication or IPC).

In general we should discourage messaging, in favor of more specific forms of synchronization.

### Notifications

Notifications are used to communicate server-side events to our clients. They currently use

### Config

### HTTP

Since on the server we should own the error handling middleware we should also own the HTTP services
on the clients so we can add handlers to converting HTTP errors into high quality consumable errors
on the client side.

### Idle Status

> This service does not exist

Detecting when a computer goes to an idle state is not supported on all platforms. For that reason
we should use our [optionally supported pattern](#optionally-supported-pattern). For example, this
would allow the vault timeout options to be constructed in a single place. They can check the
service for if idle status is supported and if it is show `On System Idle` as an option.

### System Locked

> This service does not exist

See [Idle Status](#idle-status) as this will largely have the same look and feel just for system
lock status instead of idle.

## Other Responsibilities

Platform also helps support build pipelines for our applications. We do this for 2 main reasons.
One, so that build tools are both accessible to the CI pipeline as well as to developers locally,
this helps us make it so builds locally are just as repeatable as build in the pipeline. Two, we do
this so that we can analyze the best tools to provide so that feedback from automated tools can be
gathered more quickly, therefore keeping the inner dev loop nice and quick.

## Terms

### Optionally Supported Pattern

We should have a single pattern for teams to find out if a feature is supported if it is not
supported everywhere. Some features may need additional configuration on the host machine, we should
attempt to give a way to have information be shown to the user so that decisions can be made by
feature teams about how to handle each case.

TypeScript

```typescript
type SupportStatus =
  | { type: "supported" }
  | { type: "needs-configuration", name: string, helpLink: string | null }
  | { type: "not-supported" };

interface OptionallySupported<SupportedService> {
  supportStatus$: Observable<SupportStatus>;
}

export async function isSupported(service: OptionallySupported<SupportedService>) service is SupportedService {
  return await firstValueFrom(service.supportStatus$.pipe(map(s => s.type === "supported")));
}

if (await isSupported(this.clipboardService)) {
  // Can use clipboard
  this.clipboardService.copy("stuff");
} else {
  // Cannot use clipboard
}
```

Rust

```rust
struct NeedsConfigurationMessage { name: String; helpLink: Option<String> }

enum OptionalSupport<T> {
  Supported(T),
  NeedsConfiguration(NeedsConfigurationMessage),
  NotSupported,
}

// Example
if let Supported(clipboard) = get_clipboard!() {
  // Use clipboard
  clipboard.copy("stuff");
} else {
  // Cannot use clipboard
}
```

Consider, for example, that the clipboard is not supported in our web client but is supported in
desktop and browser. A feature team can check whether or not the clipboard is supported and use that
check to show/hide the `Copy Password to Clipboard` button. They can now design and implement one
single component for all clients. Then, once we add support for the clipboard API to web, that
button is automatically shown and the functionality is available.

A more advanced example is biometrics, biometrics has no support in our `web` application, needs to
be configured to talk to the desktop application in our `browser` application, and isn't (currently)
supported equally across all OSes on `desktop`. A web implementation of the `BiometricsService` may
unconditionally return `of({ type: "not-supported" })`. Based on that, our Auth team would not show
a setting to enable unlock with biometrics. A browser implementation would first do a check to see
if desktop &lt;-&gt; browser communication has been setup and available. If it is, it would return
`{ type: "supported" }` but if it is not, it would return
`{ type: "needs-configuration", name: "desktop-browser-communication" }`. Based on that, we may show
additional UI to help facilitate that link and once that link has been established it would return
to broadcasting itself as supported. Then on our unlock screen, a button to unlock with biometrics
would be conditionally shown if biometrics is supported and the user has set it up for unlock. This
would help facilitate our unlock component and our settings components not having to have any
different inner-working across clients.

This pattern can help enable us to not support everything across clients equally and incrementally
add support for things as the need and ability arises. It also helps us facilitate getting
information to our users for if there is something they can do on their machine. It means that when
support is added where it previously wasn't feature teams don't have to make changes in their code
to react to that. What this shouldn't mean though is that we add support to a new client and don't
communicate this change to the stakeholders. A very real example of this is secure storage, it is
not supported on all platforms and occasionally requires steps from the user to make it supported
(link to needing to enable password service on linux). With a service like secure storage that has
the side effect of saving user data, the toggling of its support status without being communicated
could cause breaking changes. For example teams could design a feature to go and get information
from secure storage if it is supported but if it's not supported go and settle for saving it in
plaintext storage. If we enable secure storage on a new platform they would start going to secure
storage for that data but it's not there because it was previously saved in plaintext. That's why
it's incredibly important to communicate changes but also to do our best to design API's such that
they are resilient to support changes.

## PlatformUtilsService Vision

`PlatformUtilsService` should be a place that only hosts information about the currently running
application. We should avoid having it do actions and instead actions should be placed onto a
smaller action specific service (possibly using the
[optionally supported pattern](#optionally-supported-pattern)). The data it will likely retain are
`getDevice()`, `getClientType`, `getApplicationVersion`, `getApplicationVersionNumber`,
`isSelfHost`, and `isDev`. Tentative plan for the rest of the methods:

- `getDeviceString` - Replaced with `getDevice().toString()`
- `is[Browser]` - Replaced with `getDevice() === [Browser]`
- `isMacAppStore` - ??? (Some service? Inlined?)
- `isViewOpen` - ??? (Some service?)
- `launchUri` - `OpenLinkService` ?
- `supportsWebAuthn` - New `WebAuthnService`
- `supportsDuo` - Moved to Auth ownership
- `showToast` - Already deprecated, should instead use `ToastService`
- `copyToClipboard` - `ClipboardService`
- `readFromClipboard` - `ClipboardService`
- `supportsBiometric` - `BiometricService`
- `authenticateBiometric` - `BiometricService`
- `supportsSecureStorage` - `SecureStorageService`
- `getAutofillKeyboardShortcut` - Moved to Autofill | Likely `AutofillService`
