---
sidebar_position: 4
---

# Dependency Injection

Dependency injection (DI) in our Typescript clients is manually configured across several locations.

You will need to update the DI configuration when you create a new service or change the
dependencies injected into an existing service.

## Angular and Non-Angular contexts

Our Typescript clients use both Angular and non-Angular contexts. This can vary:

- between apps - for example, the web client is entirely Angular, whereas the CLI client does not
  use Angular at all
- within apps - for example, the browser client uses Angular in its popup but not in its background
  page/service worker

This has important consequences for how we write services and how we configure DI. In particular:

- Angular contexts use the Angular dependency injection framework
- non-Angular contexts do not use any dependency injection framework and must manually instantiate
  their dependencies

The overall effect of these items is that we use Angular DI in a non-standard way. It forces
interfaces to be abstract classes and requires that we manually wire up dependencies in service
modules, rather than relying on `Inject` decorators that would import Angular dependencies into
non-Angular contexts.

## Services

Services should be organized as follows depending on where they're used:

- `libs/common` for services used by **multiple clients** in **non-Angular contexts (or a mix of
  Angular and non-Angular contexts)**
- `libs/angular` for services used by **multiple clients** in **Angular contexts only**
- `apps/<client-name>` for services used by a single client only

Some teams also have their own `libs` folder, which are structured similarly. e.g. `libs/auth`,
containing `libs/auth/common` and `libs/auth/angular`. These should be used if available.

If a service is used in an Angular context only (e.g. `app/<angular-only-client>` or
`libs/angular`), it can use the Angular `@Injectable` decorator to automatically configure its
dependencies. If a service is used in mixed contexts (e.g. `libs/common`), it must not use Angular
decorators and its dependencies must be manually configured.

## Interfaces

You should have an abstraction for your services:

1. When you need to present a subset of your service's API to a consumer (i.e. the [facade
   pattern][facade-pattern]).
2. When your service is exported from a module. All services exported from a module must follow the
   [bridge pattern][bridge-pattern].

If neither of these apply to you, you probably don't need to define an abstract interface for your
service.

:::tip

You can combine these patterns to create an internal module API:

```ts
// Injected in other modules
abstract class MyService {
  abstract externalMethod(): void;
}

// Injected in the MyService feature module
abstract class InternalMyService extends MyService {
  abstract internalMethod(): void;
}

class MyService implements InternalMyService {
  abstract externalMethod(): void;
  abstract internalMethod(): void;
}
```

:::

## Configuring DI

### Angular modules

Angular contexts generally use ngModules
[dependency providers](https://angular.io/guide/dependency-injection-providers) to configure DI. For
example:

:::danger[DON'T DO THIS]

This is a simplified example only - read on to learn about safeProvider.

:::

```ts
@NgModule({
  providers: [
    // If the service does not have @Injectable decorators
    {
      provide: MyService, // abstract interface
      useClass: DefaultMyService, // concrete implementation
      deps: [DepA, DepB], // abstract interfaces for each dependency required by the DefaultMyService constructor
    },
    // If the service does have @Injectable decorators (Angular-only)
    {
      provide: SomeAngularService,
      useClass: DefaultSomeAngularService,
      // no deps array required
    },
  ],
})
export class MyServicesModule {}
```

By default, this is not type safe - Angular does not verify that the implementation actually
implements the abstract interface, or that the `deps` array matches the constructor parameters.

We provide a helper function called `safeProvider`, which acts as a wrapper around each provider
entry and provides compile-time type checking of your configuration. For example (continuing with
the example above):

:::tip[RECOMMENDED]

`safeProvider` is the preferred way to register services in ngModules.

:::

```ts
@NgModule({
  providers: [
    safeProvider({
      provide: MyService,
      useClass: DefaultMyService,
      deps: [DepA, DepB],
    }),
    safeProvider({
      provide: SomeAngularService,
      useClass: DefaultSomeAngularService,
      useAngularDecorators: true, // this tells safeProvider to not require a deps array
    }),
  ],
})
export class MyServicesModule {}
```

:::note

The `useAngularDecorators` option is not type safe - it is your responsibility to ensure that the
class actually uses the `@Injectable` decorator.

:::

Our primary service modules require the use of `safeProvider`, otherwise you will receive type
errors. However, you should use `safeProvider` wherever you are configuring an Angular provider to
benefit from its type checking.

### Angular root module

Services that will be used globally and which don't have an abstract interface can be registered
using the `provideIn` property. This avoids having to create and manage service modules. When
exporting services through feature modules, it can be tricky to manage their lifetime, and it's easy
to end up with multiple instances of the service being created.

```ts
@Injectable({
  provideIn: "root",
})
export class MyService {}
```

### Angular components

Services that are not stateful and/or are only supposed to be used locally to extract complex logic
from a component can be injected directly into standalone components, completely bypassing modules.

```ts
@Component({
  providers: [
    // This example assumes that MyService uses @Injectable decorators and does not have an abstract interface
    safeProvider(MyService),
  ],
  standalone: true,
})
export class MyComponent {}
```

### Non-Angular contexts

Non-Angular contexts do not use a DI framework and must therefore manually instantiate their
dependencies **in the correct order**. Instantiating dependencies out of order may result in null
values being injected into services, causing runtime errors.

## DI by client

### Shared Angular DI

`libs/angular` contains `JslibServicesModule`, a services module which registers common dependencies
used across Angular Typescript clients (web, browser and desktop).

A client may override this DI if a client-specific configuration is required.

### Web

`core.module.ts` contains the main services module for the web client. It imports
`JslibServicesModule`.

However, the web module heavily uses [feature modules](https://angular.io/guide/feature-modules) and
[standalone components](https://angular.io/guide/standalone-components) to divide its code by
feature. Feature modules and standalone components should configure their own DI wherever possible
for feature-specific (non-global, non-stateful) services.

### Browser

Browser DI is split across the following locations:

- `services.module.ts` is the main services module for the browser extension popup. It imports
  `JslibServicesModule`
- `main.background.ts` manually instantiates services used in the background page (for Manifest v2)
  or the service worker (for Manifest v3). It does not use any dependency injection framework
- a series of exported factory functions with the naming convention `[name]-service.factory.ts`.
  These were used early in development for Manifest v3, but will be removed in the near future

The background page/service worker still does a lot of work in the browser extension, so many
services are registered in all the above locations.

### Desktop

Desktop DI is split across the following locations:

- `services.module.ts` is the main services module for the Electron renderer process, which is
  responsible for bootstrapping and rendering the Bitwarden app. It imports `JslibServicesModule`
- `main.ts` manually instantiates services used in the main process. It does not use any dependency
  injection framework

The main process is primarily used for Electron behavior and native integrations (e.g. storage,
biometrics, window behavior), so it registers a smaller subset of services. Many services are only
registered in the renderer process.

### CLI

`bw.ts` contains all DI for the CLI client. It does not use any dependency injection framework.

[facade-pattern]: https://en.wikipedia.org/wiki/Facade_pattern
[bridge-pattern]: https://en.wikipedia.org/wiki/Bridge_pattern
