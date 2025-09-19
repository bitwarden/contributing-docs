# Angular

At Bitwarden we use Angular as our client side framework. It's recommended to have a basic
understanding of Angular before continuing reading, and when uncertain please refer to the official
[Angular Docs][docs] or the [Getting started with Angular][start]. We also make an effort at
following the [Angular Style Guide][styleguide].

This document aims to cover the best practices we follow. Many of them are originally based on
different ADRs, however while ADRs are good at describing the why, they provide a suboptimal reading
experience.

## Best practices

Always strive to write idiomatic up to date Angular code. Since Angular is a living framework, the
best practices and recommendations may evolve over time. Stay informed about the latest changes and
adapt your code accordingly.

### Change Detection

Use the `OnPush` change detection strategy. We will eventually enforce this project wide for
performance reasons.

### Control flow

Only use the new Angular Control Flow syntax (`@if`), do **not** use the older structural directives
(`*ngIf`).

### Dependency injection

Use the `inject` function to retrieve dependencies instead of constructor injection in Angular
primitives (Components, Pipes, etc.). Do note that this only works in Angular contexts and you
should still use constructor injection when writing code that is shared with non Angular clients.

### Host bindings

> Always prefer using the `host` property over `@HostBinding` and `@HostListener`. These decorators
> exist exclusively for backwards compatibility.
>
> <cite>https://angular.dev/guide/components/host-elements#the-hostbinding-and-hostlistener-decorators</cite>

### Standalone

Use standalone components, directives and pipes. `NgModules` can still be used for grouping multiple
components but the inner components **should** be standalone.

## Naming ([ADR-0012](../../adr/0012-angular-filename-convention.md))

We follow the [Naming](https://angular.io/guide/styleguide#naming) section from the Angular Style
Guide. More specifically use dashes to septate words in the descriptive name, and dots to separate
name from the type.

We use the following conventional suffixes suggested by [Style-02-01][style-02-01]:

- `service` - Service (At Bitwarden this type denotes an abstract service)
- `component` - Angular Components
- `pipe` - Angular Pipe
- `module` - Angular Module
- `directive` - Angular Directive

At Bitwarden we also use a couple of more types:

- `.api` - Api Model
- `.data` - Data Model (used for serializing domain model)
- `.view` - View Model (decrypted domain model)
- `.export` - Export Model
- `.request` - Api Request
- `.response` - Api Response
- `.type` - Type definition
- `.enum` - Enum

The class names are expected to use the suffix as part of their class name as well. I.e. a service
implementation will be named `FolderService`, a request model will be named `FolderRequest`.

### Abstract & Default Implementations

The Bitwarden clients codebase serves multiple clients, one of which is node based and unable to
utilize the Angular Dependency Injection. In order to make code useable in both Angular and non
Angular based clients we generally use _abstract_ classes to define interfaces. Ideally we would use
_interfaces_ but TypeScript interfaces exists at compile time only and therefore cannot be used to
wire up dependency injection in JavaScript.

All consumers will use the abstract class as a parameter in their constructor which will be manually
wired up in the CLI and use Angular dependency injection in Angular contexts. In the case a
dependency is only used in the Angular client, the abstract class can be omitted and the
implementation referenced directly using `@Injectable`.

To improve readability and avoid potential confusion caused by import aliases, we avoid naming
implementations the same name as the abstract class. Depending on the class usage the following
prefixes are allowed:

- `Default`: Used for the default implementation of an abstract class.
- `Web`, `Browser`, `Desktop` and `Cli` for platform specific implementations.

## Organize by Feature ([ADR-0011](../../adr/0011-angular-folder-structure.md))

We strive to follow the [Application structure and NgModules][style-structure] section from the
Angular Style Guide.

The folder structure should be organized by feature, in a hierarchial manner. With features in turn
being owned by a team. Below is a simplified folder structure which may diverge somewhat from the
current structure.

In the example we have a single team, `auth` which has a single feature _Emergency Access_. The
_Emergency Access_ feature consists of a service, some components and a pipe. The feature is further
broken down into a `view` feature which handles viewing another users vault.

The `core` and `shared` directories don't match a single team but is owned by the platform team. The
`core` and `shared` modules are standard concepts in Angular, with `core` consisting of singleton
services used throughout the application, and `shared` consisting of heavily reused components.

```ts
apps/web/src/app/
├─ core/                         // Core services vital to the web app
|  ├─ services/
|  |  ├─ web-platform-utils.service.ts
│  ├─ shared.module.ts
│  ├─ index.ts
├─ shared/                       // Shared functionality usually owned by platform
│  ├─ feature/                   // Feature module
│  ├─ shared.module.ts
│  ├─ index.ts
├─ auth/                         // Auth team
│  ├─ shared/                    // Generic components shared across the team
│  ├─ emergency-access/          // Feature module
│  │  ├─ access-type.pipe.ts
│  │  ├─ ea.module.ts
│  │  ├─ ea-routing.module.ts
│  │  ├─ ea.service.ts           // Service encapsulating all business logic
│  │  ├─ ea.component.{ts,html)
│  │  ├─ dialogs/                // Dialogs used by the root component.
│  │  ├─ view/                   // Logical group of components for viewing ea vault
│  │  ├─ index.ts
│  ├─ index.ts                   // Public interface that can be used by other teams
├─  app.component.ts
├─ app.module.ts
```

## Reactivity ([ADR-0003](../../adr/0003-observable-data-services.md) & ADR-0028)

We make heavy use of reactive programming using [Angular Signals][signals] [RxJS][rxjs]. Generally
components should always derive their state reactively from services whenever possible.

### Signals

Angular Signals is a new reactivity model introduced in Angular 16 and made stable in Angular 17.
Signals provides a simple and intuitive way to manage state and reactivity in Angular applications.

However Signals are limited to Angular contexts only, and cannot be used in non Angular clients.
Therefore we mostly limit our usage of Signals to components and presentational services only.
Everywhere else we use RxJS.

```ts
// Example component which uses signals for a local state
@Component(
  selector: "app-counter",
  template: `
    <h1>Current value of the counter {{counter()}}</h1>

    <button (click)="increment()">Increment</button>
  `,
})
export class Countcomponent {
  protected counter = signal(0);

  increment() {
    this.counter.set(this.counter() + 1);
  }
}
```

### RxJS

RxJS is a powerful library for reactive programming using Observables. We use RxJS whenever we need
interoperability with non Angular clients, or when we need more advanced operators not available in
Signals.

```ts
// Example component which displays a list of folders
@Component({
  selector: "app-folders-list",
  template: `
    <ul>
      <li *ngFor="let folder of folders$ | async">
        {{ folder.name }}
      </li>
    </ul>
  `,
})
export class FoldersListComponent {
  private folderService = inject(FolderService);

  protected folders$: Observable<FolderView[]> = this.folderService.folderViews$;
}
```

### Reactive Forms ([ADR-0001](../../adr/0001-reactive-forms.md))

We almost exclusively use [Angular Reactive forms](https://angular.io/guide/reactive-forms) instead
of Template Driven forms. And the Bitwarden Component library is designed to integrate with Reactive
forms.

> Provide direct, explicit access to the underlying form's object model. Compared to template-driven
> forms, they are more robust: they're more scalable, reusable, and testable. If forms are a key
> part of your application, or you're already using reactive patterns for building your application,
> use reactive forms.
>
> <cite>https://angular.io/guide/forms-overview#choosing-an-approach</cite>

## Thin Components

Components should be thin and only contain the logic required to render the view. All other logic
belongs to services. This way components that behave almost identical but looks quite different
visually can avoid code duplication by sharing the same service. Services tends to be much easier to
test than components as well.

### Composition over Inheritance ([ADR-0009](../../adr/0009-angular-composition-over-inheritance.md))

Due to the multi client nature of Bitwarden, we have a lot of shared components with slightly
different behavior client to client. Traditionally this was implemented using inheritance, however
as the application continues to grow this has resulted in large components that are difficult to
work with, as well as a multi level inheritance tree.

To avoid this, components should be broken up into logical standalone pieces. The different clients
should use the the shared components by customizing the page level components.

```kroki type=plantuml
@startuml
skinparam BackgroundColor transparent
skinparam componentStyle rectangle

title Login Component

component "Web Vault" {
    component "Login Page Component" as loginWeb
}

component "Desktop" {
    component "Login Page Component" as loginDesktop
}

component "Angular" {
    together {
        component "Login Component"
        component "Captcha Component"
        component "Auth Service"
    }
}

[loginWeb] --> [Login Component]: Child component
[loginDesktop] --> [Login Component]: Child component
[Login Component] -> [Captcha Component]: Child component
[Login Component] --> [Auth Service]: Dependency
@enduml
```

Understandably this is difficulty to properly implement when the different clients use different css
frameworks, which until everything is properly migrated to Bootstrap means there will be a _Login
Component_ for each client that extends the generic _Login Component_. However it should only expose
a client specific template.

The diagram below showcases how the reports share logic by extracting the list into a shared
component. Instead of the organization component directly extending the base report page component.
For more details, read [the PR for the refactor](https://github.com/bitwarden/clients/pull/3204).

```kroki type=plantuml
@startuml
skinparam BackgroundColor transparent
skinparam componentStyle rectangle

title Reports Home Page

component "Reports Module" {
    component "Reports Page"
}

component "Reports Shared Module" {
    component "Report List Component"
    component "Report Component"
}

component "Organization Reports Module" {
    component "Organization Reports Page"
}

[Reports Page] --> [Report List Component]: @Input reports[]
[Organization Reports Page] --> [Report List Component]: @Input reports[]
[Report List Component] --> [Report Component]: @Input report

@enduml
```

[docs]: https://angular.io/docs
[start]: https://angular.io/start
[styleguide]: https://angular.io/guide/styleguide
[style-02-01]: https://angular.io/guide/styleguide#general-naming-guidelines
[rxjs]: https://angular.io/guide/rx-library
[style-structure]: https://angular.io/guide/styleguide#application-structure-and-ngmodules
[signals]: https://angular.dev/guide/signals
