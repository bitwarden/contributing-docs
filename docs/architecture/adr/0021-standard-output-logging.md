---
adr: "0021"
status: In progress
date: 2023-07-13
tags: [server]
---

# 0021 - Logging to Standard Output

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

As the server platform has matured so have the various logging extensions to support additional use
cases and customer requests. [Serilog][serilog] is in place via shared "core" logic for all
services, initiated at startup, and over time additional "sinks" for specific use cases have been
added with their needed configuration and downstream dependencies, increasing the size of the core
library footprint.

Maintenance needs have grown to keep sink dependencies up to date and more are desired to be added.
Some of the presently-available sinks have very little use and / or better alternatives now exist.
There is a growing list of conditions on how and when to use certain types of structured logging.
Service-specific configuration, predicates, and filters are in place making it difficult to know
what will be logged and when.

## Considered Options

:::note

Bitwarden currently uses [Datadog][dd] as its monitoring tool and desires to increase its usage by
engineers across the board to improve what we deliver.

:::

- **Maintain current logging options** - Support what is available today for logging methods and
  expect those running the platform to configure what they need outside of it for log collection.
- **Extend the plaform to specifically support Datadog** - A Serilog sink [exists][ddsink] and the
  platform can send logs directly to Datadog.
- **Consolidate logging providers** - Announce deprecation and migration plans for sinks not aligned
  with core needs and center on standard output for logs.

## Decision Outcome

Chosen option: **Consolidate logging providers**.

Given long-term plans to adopt a more flexible shared (hosting extensions) library that can be used
across services either as a project (server monolith) reference or NuGet package (and as a reference
architecture), using Serilog as a way to extend native logging capabilities is beneficial. Details
around how Serilog is implemented along with its advanced inputs and outputs can be extracted away
into the shared library and driven at consuming applications via configuration.

### Positive Consequences

- Streamlined logging experience across components.
- Standard output logging fits well into container and orchestration tools.
- Elimination of several third-party dependencies and their maintenance, as well as global settings.
- No new dependencies that are merely aligned with the Bitwarden-specific cloud and its service
  providers.

### Negative Consequences

- A small number of users will need to migrate to standard output or similar ingestion of logs.
- The Admin Portal log browsing function will leave (if configured) in favor of using whatever is
  configured for log processing.

### Plan

Using standard support policies, release notes will include a mention that three Serilog sinks will
be removed:

- CosmosDb
- Sentry
- Syslog

The remaining sinks -- core functionality of Serilog -- will continue to be supported:

- Console
- File

While the Serilog [console sink][serilogconsole] is currently an implicit dependency with what's
provided for ASP.NET Core, it will be explicitly referenced.

Solutions exist for users to shift processing of logs for the removed sinks to standard output or
file and retain their integration. Admin Portal users can similarly continue to use CosmosDb for log
retention, but it is suggested that application monitoring that's available be used instead that
should in essentially all cases be able to receive and process standard output logs.

Cloud installations -- including Bitwarden's own -- will shift to configuration via environment
variables or otherwise to utilize structured standard output logs for processing explicitly with
[Serilog configuration][serilogconfig] e.g.:

```json
{
  "Serilog": {
    "Using": ["Serilog.Sinks.Console"],
    "MinimumLevel": "Verbose",
    "WriteTo": [{ "Name": "Console" }],
    "Enrich": ["FromLogContext"],
    "Properties": {
      "Project": "BitwardenProjectName"
    }
  }
}
```

This will allow better usage of `appsettings.json` and a richer developer experience. Existing
built-in [.NET Core logging][netcorelogging] will continue to be available if desired, but the
recommendation will be to move to a Serilog configuration.

Code cleanup will be performed around Serilog usage, such as:

- Removal of overuse of inclusion predicates that complicate (or sometimes block) effective log
  output, for example in the uses of `AddSerilog` in place today at each consuming application.
- Alignment with .NET Core and Serilog best practices on [initialization][seriloginit] and usage of
  Serilog itself.
- Improvements in logging initialization reliability and working with configuration issues, as well
  as more resilient tear-down when a component stops / ends.
- Removal of the above-deprecated sinks, in the final release of the support window.

Logging functionality will be moved to a new shared library -- separate from the core project -- as
mentioned above for host-oriented utilities. This library will be distributed as a NuGet package so
that local `server` projects as well as new, independent repositories for services can receive the
benefits.

[serilog]: https://serilog.net/
[dd]: https://www.datadoghq.com/
[ddsink]: https://www.nuget.org/packages/serilog.sinks.datadog.logs
[serilogconsole]: https://www.nuget.org/packages/serilog.sinks.console
[serilogconfig]: https://www.nuget.org/packages/Serilog.Settings.Configuration/
[netcorelogging]: https://learn.microsoft.com/en-us/dotnet/core/extensions/logging
[seriloginit]: https://github.com/serilog/serilog-aspnetcore#two-stage-initialization
