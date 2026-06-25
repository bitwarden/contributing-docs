---
adr: "0032"
status: "Proposed"
date: 2026-06-25
tags: [server]
---

# 0032 - Break up the Core project

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

The `Core` project in the `server` repository has grown into a catch-all library that almost every
service depends on. This creates two significant problems:

- **Unowned code and unbounded dependencies** — while much of `Core` is owned by specific teams, a
  significant portion has accumulated without clear ownership, making it a dumping ground for shared
  utilities and dependencies that don't have a better home.
- **Limited independent deployability** — because every service depends on `Core`, any change to
  `Core` technically constitutes a change to every service. This makes it hard to reason about the
  blast radius of a change and undermines the ability to deploy services independently with
  confidence.

`GlobalSettings` compounds these problems. It is a single configuration class that houses settings
for every feature and service, meaning all of `Core`'s consumers must load and be aware of the
entire settings surface even when they only need a small slice of it. As features are extracted from
`Core`, they should define their own strongly-typed options classes rather than growing
`GlobalSettings` further.

Not all of what currently lives in `Core` needs to move into feature-scoped libraries. A number of
cross-cutting concerns — feature flag evaluation, version info endpoints, security middleware, and
caching — are being built into the server SDK. As those SDK packages mature, the corresponding code
in `Core` can be removed and replaced with an SDK dependency, further shrinking `Core`'s footprint.

Other Bitwarden repositories have already moved toward a feature-scoped library model. The
`sdk-internal` repository was built on this pattern from the start and follows it fully. The
`clients` repository has historically had a large `libs/common` package, which is still being
gradually decomposed into feature-scoped libraries. These precedents validate the approach for
`server` as well.

## Considered options

- **Keep `Core` as-is** — No structural changes. `Core` continues to grow as a shared monolith.
  Ownership and deployment problems persist.
- **Break `Core` into feature-scoped libraries** — New code is placed in dedicated, feature-scoped
  projects. Platform-level utilities (push notifications, mailing, database foundations) are
  extracted first as shared dependencies. Existing code is migrated gradually and opportunistically.

## Decision outcome

Chosen option: **Break `Core` into feature-scoped libraries**.

New code belonging to a specific feature or domain should live in its own dedicated project rather
than in `Core`. Platform-level utilities that many features depend on — such as push notifications,
mailing, and database foundations — should also be extracted into their own projects, as these
represent cross-cutting infrastructure rather than feature logic.

In conjunction with [ADR 0031](./0031-adopt-minimal-apis.md), a single library can cover a feature
end-to-end: repositories, settings, services, and endpoints all in one `.csproj`. There is no
requirement to separate endpoints into their own project. The goal is feature cohesion, not a
mandated split between endpoint code and business logic.

Feature libraries live under `src/Libraries/[Feature]`. If a library later graduates into its own
deployable container, it moves to `src/Services/[Name]`. This extends the `src/Libraries` directory
structure introduced in [ADR 0031](./0031-adopt-minimal-apis.md).

```
src/
  Libraries/
    Mailer/       # settings, services, repositories, endpoints for the Mailer feature
    Push/
    Vault/
    ...
  Services/
    Api/          # composes libraries into a deployable service
    Identity/
    Notifications/
    ...
```

Libraries and services under `bitwarden_license/` follow the exact same layout, rooted there instead
of `src/`:

```
bitwarden_license/
  Libraries/
    SecretsManager/   # settings, services, repositories, endpoints for Secrets Manager
    ...
  Services/
    Scim/             # composes libraries into a deployable service
    ...
```

Libraries use the root namespace `Bit.[Feature]` and an assembly name of `[Feature]`. Services use
the root namespace `Bit.Services.[Name]` and an assembly name of `[Name]`. This applies primarily to
net new code; when migrating existing code out of `Core`, retaining the existing namespace is
acceptable if it keeps breaking changes to a minimum.

The `Core` project will remain during the migration period and code should be moved out
opportunistically, when a team is already working in that area, rather than in a dedicated
large-scale migration effort. The long-term goal is to eliminate `Core` entirely. As the migration
progresses, teams will negotiate the boundaries that should exist between them and create the
libraries needed to share code across those boundaries.

### Positive consequences

- Clear ownership — teams own their feature project's `.csproj` and control their own dependencies
- A change to a feature library only affects services that actually depend on it, restoring the
  ability to reason about and deploy services independently
- Aligns `server` with the patterns already established in `clients` and `sdk-internal`
- Complements [ADR 0031](./0031-adopt-minimal-apis.md), which establishes feature-scoped endpoint
  libraries for minimal API endpoints

### Negative consequences

- `Core` and feature-scoped libraries will coexist for a long time, requiring developers to know
  where to place new code and where to look for existing code
- Extracting code from `Core` carries a risk of introducing circular dependencies if the dependency
  graph is not carefully considered during a migration
- Without an aggressive timeline, the migration may stall and the benefits will be slow to
  materialize

### Plan

- New features should not add code to `Core`; they should create or extend a feature-scoped project
- New libraries should generally sit at a lower level than `Core` and should not depend on it; if a
  new library needs something that currently lives in `Core`, that is a signal that the dependency
  itself should be extracted into its own library first
- Platform-level utilities (push notifications, mailing, database foundations) should be prioritized
  for extraction as independent projects, since many features will depend on them
- Cross-cutting concerns already being built into the server SDK — feature flag evaluation, version
  info endpoints, security middleware, and caching — should be adopted from the SDK as those
  packages become available, allowing the corresponding `Core` code to be deleted rather than
  migrated
- Feature libraries should define their own strongly-typed options classes rather than adding
  properties to `GlobalSettings`; as features are extracted, their `GlobalSettings` entries should
  migrate alongside them

  **Before:**

  ```csharp
  // Core/Settings/GlobalSettings.cs
  public class GlobalSettings : IGlobalSettings
  {
      public virtual MailerSettings Mailer { get; set; } = new MailerSettings();

      public class MailerSettings
      {
          public string ReplyToEmail { get; set; }
          public string SmtpHost { get; set; }
          // ...
      }
  }

  // Consuming service
  public class Mailer(GlobalSettings globalSettings) : IMailer
  {
      public void Send()
      {
          var host = globalSettings.Mailer.SmtpHost;
      }
  }
  ```

  **After:**

  The feature library declares its options type and consumes it via `IOptions<T>`. It does not bind
  configuration itself — that is the host service's responsibility, since the host owns its service
  settings and knows which configuration sections map to which feature options.

  ```csharp
  // Libraries/Mailer/MailerSettings.cs
  public class MailerSettings
  {
      public string ReplyToEmail { get; set; }
      public string SmtpHost { get; set; }
      // ...
  }

  // Libraries/Mailer/ServiceCollectionExtensions.cs
  public static IServiceCollection AddMailers(this IServiceCollection services)
  {
      services.TryAddSingleton<IMailer, Mailer>();
      return services;
  }

  // Libraries/Mailer/Mailer.cs
  internal class Mailer(IOptions<MailerSettings> settings) : IMailer
  {
      public void Send()
      {
          var host = settings.Value.SmtpHost;
      }
  }

  // Services/Api/Program.cs
  builder.Services.Configure<MailerSettings>(builder.Configuration.GetSection("Mailer"));
  builder.Services.AddMailers();
  ```

- Existing code in `Core` should be moved out opportunistically when a team is already working in
  that area — not as a standalone task
- A guide will be written documenting the conventions for creating a new feature library and the
  expected project structure, similar to the `ENDPOINT_LIBRARY.md` described in
  [ADR 0031](./0031-adopt-minimal-apis.md)
