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

## Services

Services should be organized as follows depending on where they're used:

- `libs/common` for services used by **multiple clients** in **non-Angular contexts (or a mix of
  Angular and non-Angular contexts)**
- `libs/angular` for services used by **multiple clients** in **Angular contexts only**
- `apps/<client-name>` for services used by a single client only

If a service is used in an Angular context only, it can use the Angular `@Injectable` decorator to
automatically configure its dependencies. If a service is used in mixed contexts (e.g.
`libs/common`), it must not use Angular decorators and its dependencies must be manually configured.

## Configuring DI

### Angular contexts

Angular contexts use ngModules
[dependency providers](https://angular.io/guide/dependency-injection-providers) to configure DI. For
example:

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

:::note The `useAngularDecorators` option is not type safe - it is your responsibility to ensure
that the class actually uses the `@Injectable` decorator. :::

Our primary service modules require the use of `safeProvider`, otherwise you will receive type
errors. However, you should use `safeProvider` wherever you are configuring an Angular provider to
benefit from its type checking.

### Non-Angular contexts

Non-Angular contexts do not use a DI framework and must manually instantiate their dependencies **in
the correct order**. Instantiating dependencies out of order may result in null values being
injected into services, causing runtime errors.

## DI by client

### Shared Angular DI

`libs/angular` contains `jslib-services.module.ts`, a services module which registers common
dependencies used across Angular Typescript clients (web, browser and desktop).

A client may override this DI if a client-specific configuration is required.

### Web

`core.module.ts` contains the main services module for the web client. It imports
`JslibServicesModule`.

However, the web module heavily uses [feature modules](https://angular.io/guide/feature-modules) to
divide its code by feature. Feature modules should configure their own DI wherever possible for
feature-specific (non-global) services.

### Browser

Browser DI is split across the following locations:

- `services.module.ts` is the main services module for the browser extension popup. It imports
  `JslibServicesModule`
- `main.background.ts` manually instantiates services used in the background page (for manifest v2)
  or the service worker (for manifest v3). It does not use any dependency injection framework
- a series of exported factory functions with the naming convention `[name]-service.factory.ts`.
  These may be used in manifest v3 service workers in the future

The background page/service worker still does a lot of work in the browser extension, so many
services are registered in all the above locations.

### Desktop

Desktop DI is split across the following locations:

- `services.module.ts` is the main services module for the Electron renderer process. It imports
  `JslibServicesModule`
- `main.ts` manually instantiates services used in the main process. It does not use any dependency
  injection framework

The main process is primarily used for Electron behavior and native integrations (e.g. storage,
biometrics, window behavior), so it registers a smaller subset of services. Many services are only
registered in the renderer process.

### CLI

`bw.ts` contains all DI for the CLI client. It does not use any dependency injection framework.
