---
adr: "0021"
status: Accepted
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
- **Extend the platform to specifically support Datadog** - A Serilog sink [exists][ddsink] and the
  platform can send logs directly to Datadog.
- **Consolidate logging providers** - Announce deprecation and migration plans for sinks not aligned
  with core needs and center on standard output for logs.

## Decision Outcome

Chosen option: **Consolidate logging providers**.

Given long-term plans to adopt a more flexible shared (hosting extensions) library that can be used
across services either as a project (server monolith) reference or NuGet package (and as a reference
architecture), using Microsoft.Extensions.Logging as the core way to do logging is beneficial. The
out-of-the-box defaults are generally good enough for local and self-hosted usage. Our shared
library will be able to have automatic defaults for our cloud usage though, namely using JSON
logging along with including scopes. It also gives us a built in way to be able to override any of
these details through any of our configuration providers.

We will continue to offer file based logging through Serilog but will be able to reduce our NuGet
packages to only `Serilog.Extensions.Logging.File`. In an effort to reduce our own upkeep and allow
maximal customization we will be deprecating the log settings in `GlobalSettings`. Instead we will
use refer to [`Serilog` documentation][serilogconfig] to offer both more options and more standard
naming.

### Positive Consequences

- Streamlined logging experience across components.
- Standard output logging fits well into container and orchestration tools.
- Elimination of several third-party dependencies and their maintenance, as well as global settings.
- No new dependencies that are merely aligned with the Bitwarden-specific cloud and its service
  providers.
- Allow self-host customers to configure the console log format.
- Not require any new configuration for our cloud that is currently using
  Microsoft.Extensions.Logging.

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

The `File` sink will continue to be supported with the following configuration layout:

```json
{
  "Logging": {
    "PathFormat": "logs/{Date}.txt",
    "FileSizeLimitBytes": 4096
  }
}
```

Solutions exist for users to shift processing of logs for the removed sinks to standard output or
file and retain their integration. Admin Portal users can similarly continue to use CosmosDb for log
retention, but it is suggested that application monitoring that's available be used instead that
should in essentially all cases be able to receive and process standard output logs.

Cloud installations -- including Bitwarden's own -- will shift to configuration via environment
variables or otherwise to utilize structured standard output logs for processing explicitly with
[Microsoft.Extensions.Logging configuration][melconfig] this will also allow online updates if the
configuration is done through a provider that supports change detection e.g.:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    },
    "Console": {
      "FormatterName": "json",
      "FormatterOptions": {
        "SingleLine": true,
        "IncludeScopes": true,
        "TimestampFormat": "HH:mm:ss ",
        "UseUtcTimestamp": true,
        "JsonWriterOptions": {
          "Indented": true
        }
      }
    }
  }
}
```

Code cleanup will be performed around Serilog usage, such as:

- Removal of overuse of inclusion predicates that complicate (or sometimes block) effective log
  output, for example in the uses of `AddSerilog` in place today at each consuming application.
- Reading file sink config from the `Logging` configuration section.
- Removal of the above-deprecated sinks, in the final release of the support window.

Logging functionality will be moved to a new shared library -- separate from the core project -- as
mentioned above for host-oriented utilities. This library will be distributed as a NuGet package so
that local `server` projects as well as new, independent repositories for services can receive the
benefits.

[serilog]: https://serilog.net/
[dd]: https://www.datadoghq.com/
[ddsink]: https://www.nuget.org/packages/serilog.sinks.datadog.logs
[serilogconfig]:
  https://github.com/serilog/serilog-extensions-logging-file?tab=readme-ov-file#appsettingsjson-configuration
[melconfig]:
  https://learn.microsoft.com/en-us/dotnet/core/extensions/logging?tabs=command-line#configure-logging
