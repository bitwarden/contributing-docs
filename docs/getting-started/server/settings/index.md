# Settings

There are a large number of settings available to customize the behavior of the various server
projects. These settings are applied through
[Microsoft's configuration providers](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/?view=aspnetcore-8.0).
Most common are the various `appSettings.json` files, [user secrets](../secrets/index.md), and
environment variables.

Each heading level is a settings namespace or setting itself. For example
`iconSettings__cacheEnabled` corresponds to [Icon Settings -> CacheEnabled](#cacheenabled)

import TOCInline from '@theme/TOCInline';

<TOCInline toc={toc} />

## root

These are settings without a parent namespace

### DevelopSelfHosted

Relevant for all projects that use [global settings](#global-settings).

- **type**: `Boolean`
- **default**: `False`
- **full name**: `developSelfHosted`

Turns on [self host override settings](#selfhostoverride).

## Global Settings

Settings for the Core Bitwarden Project. Not all settings are relevant for all projects.

### SelfHosted

:::info[Relevant For]

All projects

:::

- **type**: `Boolean`
- **default**: `False`
- **full name**: `globalSettings__selfHosted`

Indicates that a server instance is self hosted. This is used all over the place to swap out
services and set expectations.

### UnifiedDeployment

:::info[Relevant For]

- Shared web

:::

- **type**: `Boolean`
- **default**: `False`
- **full name**: `globalSettings__unifiedDeployment`

Indicates that a server instance is hosted through the unified docker deployment method. Currently,
this is used only while setting up nginx trusted reverse proxies. See
[KnownProxies](https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.builder.forwardedheadersoptions.knownproxies?view=aspnetcore-8.0#microsoft-aspnetcore-builder-forwardedheadersoptions-knownproxies)

### KnownProxies

:::info[Relevant For]

- Shared Web

:::

- **type**: `String`
- **default**: `""`
- **full name**: `globalSettings__knownProxies`

A `,` delineated list of reverse proxies to trust. See
[KnownProxies](https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.builder.forwardedheadersoptions.knownproxies?view=aspnetcore-8.0#microsoft-aspnetcore-builder-forwardedheadersoptions-knownproxies)

### SiteName

:::info[Relevant For]

All projects (Mail and Logging)

:::

- **type**: `String`
- **default**: `""`
- **full name**: `globalSettings__siteName`

Specifies the name of the hosted website in emails and logging.

### ProjectName

:::info[Relevant For]

All projects (Mail, Logging, Feature Flags, Service Bus)

:::

- **type**: `String`
- **default**: `""`
- **full name**: `globalSettings__projectName`

This value is used all over the place to specify the exact project being run. Useful for things like
providing context in feature flags, or getting default values for service bus subscriptions in our

### LogDirectory

:::info[Relevant For]

All projects

:::

- **type**: `String`
- **default**:
  - **cloud**: `null`
  - **selfhost**: `etc/bitwarden/logs`
- **full name**: `globalSettings__logDirectory`

Sets local filesystem logging directory. This value is only used if [Sentry.Dsn](#sentry) and
[Syslog.Destination](#destination) are null.

### LogDirectoryByProject

:::info[Relevant For]

All projects

:::

- **type**: `Boolean`
- **default**: `True`
- **full name**: `globalSettings__logDirectoryByProject`

Splits logs into multiple files per project. The name of the project's log file is given by
[project name](#projectname). This value is only relevant if [LogDirectory](#logdirectory) is being
used.

## Dev

- **type**: `Namespace`
- **default**: N/A
- **full name**: N/A

Settings for development environments.

### selfHostOverride

:::info[Relevant For]

All Projects

:::

- **type**: `Namespace`
- **default**: N/A
- **full name**: N/A

The [Global Settings](#global-settings) namespace is repeated here. Any value that is set there is
overridden by the corresponding value in `selfHostOverride` _iif_ in a dev environment _AND_
[develop self hosted](#developselfhosted) is `True` _AND_ the setting in question exists in the
`selfHostOverride` namespace.

This namespace is useful to allow for a single user secrets file to be used for developing both
cloud and selfhosted servers at the same time, while allowing for different configurations between
the two server instances.

## Billing Settings

:::note

TODO

:::

## Ip Rate Limiting

:::info[Relevant For]

- Identity
- Api

:::

:::note

TODO

:::

## Icons Settings

:::info[Relevant For]

- Icons

:::

Settings for the Icons service, which provides a proxy for downloading website favicons. These
settings are all related to caching icons.

:::info

Only favicons 50 kilobytes or less in size are cached. Failures to pull a favicon are also cached.

:::

### CacheEnabled

- **type**: `Boolean`
- **default**: `False`
- **full name**: `iconSettings__cacheEnabled`

Controls whether a cache will be used.

### CacheHours

- **type**: `int`
- **default**: `0`
- **full name**: `iconSettings__cacheHours`

Controls how long icons are cached for.

### CacheSizeLimit

- **type**: `nullable long`
- **default**: `null`
- **full name**: `iconSettings__cacheSizeLimit`

Limits the total size of the
[`MemCache`](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.caching.memorycache?view=net-8.0)
backing the icon cache. Size is specified in bytes.
