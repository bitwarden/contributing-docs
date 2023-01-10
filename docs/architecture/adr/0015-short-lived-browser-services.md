---
adr: "0015"
status: In progress
date: 2022-12-09
tags: [browser, clients, typescript]
---

# 0015 - Short Lived Browser Services

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

[ADR-003](./0003-observable-data-services.md) introduced the usage of Observables into our
TypeScript codebase. That same ADR describes using `ngDestroy` to trigger unsubscribing from all
subscribed `Observables`. However, `ngDestroy` is only called when the Angular router is used to
navigate away from the page. In SPAs, this isn't a problem. If the router isn't used, it means you
closed the page and the SPA is dead. In Browser Extensions, we have a persistent background that
survives such closing events. This means that subscriptions exist in the Observers queue which no
longer exist.

In Firefox, in particular, this is a catastrophic failure. Firefox will swap out all object
belonging to a DOM object that no longer exists with a `DeadObject`. When `next()` is called on the
`Subject`, the `DeadObject` is treated like and Observer and throws an error, preventing any further
notification to subsequent Observers and causes catastrophic breaks in the extension.

## Considered Options

- **Revert ADR 003 and remove Observables** - We remove Observables from the codebase and revert to
  the previous state.
- **Browser events** - We use the `beforeunload`, `unload`, `visibilityChange`, and/or `pageHide`
  events to trigger the destruction of Angular services.
  - These triggers are not guaranteed to be called, and may not be called in all browsers.
- **Short Lived Subjects** - We ensure that subscriptions created in components do not reference
  long-lives subscriptions.

## Decision Outcome

Chosen option: **Short Lived Subjects**.

This option is the most flexible and allows us to keep the benefits of Observables while avoiding
the flakiness associated with the page visibility events.

These short lived subject will be accomplished by creating visualization-level services with the
same lifetime as the components they serve. Data will be synced between these short-lived services
and the long-lived extensions living in the background.

### Positive Consequences <!-- optional -->

- No impact to writing component-level code
- Takes us in a direction needed for Manifest V3 anyway
- Bypasses potential memory leaks due to dangling subscriptions

### Negative Consequences <!-- optional -->

- Increases memory footprint of the browser extension since service's observables need to be created
  per visualization and background context.
- Requires synchronization of the service's observables between the foreground and background
  contexts.
- Requires a more complex implementation of the service's observables.

### Synching a Subject Between Contexts

Synchronization of a subject between contexts has been developed using a combination of `Observable`
subscriptions, the browser messaging API, and browser storage API.

Storage or direct object sharing is used as a communal data store. Subscriptions are used to write
to the communal store and fire off a message, which triggers a read from subsequent read on the
other end.

### Implementing a Browser Service

In this section, we walk through an example of how to implement a browser service. We will use the
`FolderService` as an example.

`FolderService` provides two `Observables`, backed by `BehaviorSubject`s, `_folders` and
`_folderViews`.

```typescript
export class FolderService {
  private _folders = new BehaviorSubject<Folder[]>([]);
  private _folderViews = new BehaviorSubject<FolderView[]>([]);

  readonly folders = this._folders.asObservable();
  readonly folderViews = this._folderViews.asObservable();
}
```

The following sections discuss changes needed to separate the service's observables into foreground
and background contexts.

#### The libs Service

The libs service needs to make the `Subject`s backing the `Observable`s available to the Browser
Service extending it.

```diff
export class FolderService {
-  private _folders = new BehaviorSubject<Folder[]>([]);
-  private _folderViews = new BehaviorSubject<FolderView[]>([]);
+  protected _folders = new BehaviorSubject<Folder[]>([]);
+  protected _folderViews = new BehaviorSubject<FolderView[]>([]);

  readonly folders = this._folders.asObservable();
  readonly folderViews = this._folderViews.asObservable();
}
```

#### The Browser Service

The Browser Service must simple extend the libs service and wrap itself and the `Subject`s in a few
decorators.

```typescript
@browserSession()
export class BrowserFolderService extends FolderService {
  @sessionSync({ .initializer: Folder.fromJSON, initializeAs: 'array' })
  protected _folders: BehaviorSubject<Folder[]>;
  @sessionSync({ initializer: FolderView.fromJSON, initializeAs: 'array' })
  protected _folderViews: BehaviorSubject<FolderView[]>;

}
```

The `@sessionSync` decorator is responsible for registering properties to be synced and providing
information about how to initialize the data should it need to be serialized. The `@browserSession`
decorator reads registered properties and sets up synchronization between all instances of the given
class.

#### Dependency Injection

Once the service is implemented, it can be registered with Angular's dependency injection system. Be
sure to update or add any necessary providers.

#### main.background

`@browserSession` only syncs between identical classes, so background services need to use the same
class as the foreground service. Currently, the background services are initialized in
`main.background.ts`.

```diff
-import { FolderSerivce } from '@bitwarden/common/src/services/folder.service';
+import { BrowserFolderService } from '../services/browser-folder.service';

-this.folderService = new FolderService(
+this.folderService = new BrowserFolderService(
  this.cryptoService,
  this.i18nService,
  this.cipherService,
  this.stateService
);
```
