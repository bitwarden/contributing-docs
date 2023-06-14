# Angular

At Bitwarden we use Angular as our client side framework. It's recommended to have a basic
understanding of Angular before continuing reading, and when uncertain please refer to the official
[Angular Docs][docs] or the [Getting started with Angular][start]. We also make an effort at
following the [Angular Style Guide][styleguide].

This document aims to cover the best practices we follow. Many of them are originally based on
different ADRs, however while ADRs are good at describing the why, they provide a suboptimal reading
experience.

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
- `.service.abstraction` - Abstract class for a service, used for DI, not all services needs an
  abstract class

The class names are expected to use the suffix as part of their class name as well. I.e. a service
implementation will be named `FolderService`, a request model will be named `FolderRequest`.

In the event a service can't be fully implemented, an abstract class is created with the
`Abstraction` suffix. This typically happens if the Angular and Node implementations have to differ
for one reason or another. Traditionally interfaces would be used, but a TypeScript interface cannot
be used to wire up dependency injection in JavaScript.

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

## Observables ([ADR-0003](../../adr/0003-observable-data-services.md))

We are currently in the middle of a migration towards reactive data layer using [RxJS][rxjs]. What
this essentially means is that a component subscribes to a state service, e.g. `FolderService` and
will continually get updates should the data ever change. This ensures that the components always
stay up to date.

Previously we manually implemented an event system for sending basic messages which told other
components to reload their state. This was error prone, and hard to maintain.

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
  folders$: Observable<FolderView[]>;

  constructor(private folderService: FolderService) {}

  ngOnInit() {
    this.folders$ = this.folderService.folderViews$;
  }
}
```

## Reactive Forms ([ADR-0001](../../adr/0001-reactive-forms.md))

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
