---
sidebar_custom_props:
  access: bitwarden
---

# Feature Flags

## Background

Support for feature flags was added based on
[ADR 0018](https://contributing.bitwarden.com/architecture/adr/feature-management/). Some
highlights:

- [Context](https://github.com/bitwarden/server/blob/main/src/Core/Context/ICurrentContext.cs) is
  provided when requesting the state of a flag. We currently allow targeting on user, organization,
  and machine account (previously known as service account). Only the IDs are sent to LaunchDarkly
  to avoid PII sharing.
- All available feature flag states are provided to clients calling the
  [configuration API](https://github.com/bitwarden/server/blob/main/src/Api/Models/Response/ConfigResponseModel.cs).
- Environments (production, QA, and development for now) exist to segment flag states further. This
  will be automatic based on where code is running.

## Flag data sources

When consuming feature flags in either the client or server code, it is important to understand
where the flags are sourced.

The source of the flags is dependent upon the Bitwarden server instance that is being used, as for
client development the flags are served from the Bitwarden API.

| Server configuration | Flag source                                                  |
| -------------------- | ------------------------------------------------------------ |
| Local development    | Local application settings, JSON file, or code modification  |
| Self-hosted          | Flags are "off" unless above local configuration is provided |
| QA Cloud             | LaunchDarkly QA                                              |
| Production Cloud     | LaunchDarkly Production                                      |

:::caution Self-hosted support

Feature flags are not officially supported for self-hosted customers. Using application settings or
a JSON file is not a supported method of sourcing feature flag values, outside of Bitwarden internal
testing. See [Self-hosted considerations](#self-hosted-considerations) for how feature flagging
applies to self-hosted.

:::

Local development server instances will not query LaunchDarkly for feature flag values.

If you need to change any feature flag values from their defaults during local development, you will
need to set up either local application settings or a file-based data source. **Without the local
data store, all flag values will resolve as their default ("off") value.**

### Local configuration: user secrets

To set up a data source via application settings, place the following in your
[user secrets](./user-secrets.md):

```json
{
  "globalSettings": {
    "launchDarkly": {
      "flagValues": {
        "example-boolean-key": true,
        "example-string-key": "value"
      }
    }
  }
}
```

Replace `example-boolean-key` and `example-string-key` with your flag names and update the flag
values accordingly.

Remember to run `dev/setup_secrets.ps1` and restart your server for the new secrets to take effect.

Environment variables can also be used like with other application setting overrides.

### Local configuration: JSON file

To set up a data source via a local file, create a `flags.json` file as follows:

```json
{
  "flagValues": {
    "example-boolean-key": true,
    "example-string-key": "value"
  }
}
```

Replace `example-boolean-key` and `example-string-key` with your flag names and update the flag
values accordingly.

By default, the LaunchDarkly startup will look for this file in the root project directory (e.g.
`/src/Api/` for the `Api` project), where it will be deployed to the build output directory.
However, if you prefer to store the file in a different location, the `FlagDataFilePath`
configuration setting can be used to override it. The file must be present before building the
solution, but once there you can change the file contents and see immediate results in running /
debugging code.

### Local configuration: code modification

In some situations there may be a need to change a feature flag value to be something other than its
default state before cleanup activities can fully complete, especially when deployed clients are
still depending on the flag value being returned to ensure certain functionality. In the server
codebase there exists a method `GetLocalOverrideFlagValues()` alongside the feature flag
[constants definition](#server) where overrides can be placed as dictionary key-value pairs:

```csharp
return new Dictionary<string, string>()
{
    { ExampleBooleanKey, "true" }
};
```

This should only be used temporarily and as part of the feature flag cleanup process, as well as to
enable rapid feature availability for installations that are not using or aware of alternative
configuration methods.

:::tip Local data source for flags used in the client

For consuming feature flags in the clients, the above setup should be defined in the `Api` project
-- this is because the `/config` endpoint that clients use to query for feature flags is in `Api`.
Doing this will ensure that the proper flag values get retrieved and sent to the client.

:::

## Creating a new flag

When beginning work on a new feature, discuss with your team whether it should be placed behind a
feature flag. The team should agree on the scope of what is flagged and where the flag should be
applied - both client-side and server-side. While there is no precise rule on what constitutes a
"feature", work together on the best balance of flags and their respective purposes.

Once you have decided that a feature flag is necessary, the first step is to decide on a name.
Recommendations for naming are:

- Name the flag using kebab-case (lowercase and dash-separated, such as `enable-feature`).
- For Boolean flags, it is not necessary to include the `enable` verb, as it is implied by it being
  a feature flag. For example, `new-feature` is recommended instead of `enable-new-feature`.
- Keep key names succinct.

Once a name has been decided, add the feature flag to the
[`FeatureFlagKeys`](https://github.com/bitwarden/server/blob/main/src/Core/Constants.cs) constants
file on the server. This will allow the flag to be retrieved from LaunchDarkly via whichever data
source you configure below.

### Local development

As you begin work on the feature, use one of the local configuration options to surface the flag to
your consuming code to make sure that behavior is correct for all supported flag values. Since
feature flags don’t have to exist in LaunchDarkly for initial development, **don’t create them
online until you’re sure about the final implementation**.

:::tip Local client development

Keep in mind that for client local development, the source for the feature flag is dependent upon
the server instance you're using. For example, if you are developing client-side code and
referencing the QA Cloud Bitwarden API, the flag must be configured there and not in the local data
store.

:::

### Definition in LaunchDarkly

In order to test the feature flag in any deployed environment, it must first be defined in the
LaunchDarkly web app. To do this, request the flag from your Engineering Manager -- they will have
the appropriate access. You should discuss:

- The data type of the flag.
- The default value of the flag.
- The possible values of the flag (for non-boolean types).
- Any context-based rules that should drive flag behavior.

:::tip When should I request the flags in LaunchDarkly?

As a general rule, feature flags should be requested for creation in LaunchDarkly as part of merging
the code using the flag into a mainline branch. Since local development and QA testing with their
self-hosted instances will use local data sources, the first time that a flag in LaunchDarkly would
be referenced is when the code is deployed to a cloud environment.

:::

## Consuming feature flags in code

When coding against a feature flag, default to an "off" state whenever possible – code defensively
so that existing functionality is maintained should a flag be unavailable altogether. When an
interface supports it, also provide default values implying "off" to feature flag accessors.

Offline mode makes default values even more important, and local development as well as self-hosted
installations imply being offline. Set a safe default value not just in the flag definition online
in LaunchDarkly but also in code.

### Clients

All clients retrieve their feature flags by querying the `/config` endpoint on the Bitwarden API.
Clients do not directly reference the LaunchDarkly client-side SDK.

In order to optimize the use of feature flags, they are not retrieved from the server on every
request for the flag value. Rather, the flags are retrieved from the server on the following
interval:

- On application startup.
- Every hour after application startup.
- On sync (both automatic and manual).
- On environment change.

Requesting a flag value from the services defined below will provide the consuming component with
the most recent value from one of these retrieval events.

#### Web

The feature flag values are retrieved through the `fetchServerConfig()` method on the
[`ConfigService`](https://github.com/bitwarden/clients/blob/main/libs/common/src/services/config/config.service.ts).

To use a feature flag, you should first define the new feature flag as an enum value in the
[`FeatureFlags`](https://github.com/bitwarden/clients/blob/main/libs/common/src/enums/feature-flag.enum.ts)
enum.

Once that is defined, the value can be retrieved by injecting the `ConfigService` and using one of
the retrieval methods:

- `getFeatureFlagBool()`
- `getFeatureFlagString()`
- `getFeatureFlagNumber()`

#### Mobile

The feature flag values are retrieved through the `GetAsync()` method on the `ConfigService`.

To use a feature flag, you should first define the new feature flag as a string constant value in
the `Constants` file.

Once that is defined, the value can be retrieved by injecting the `IConfigService` and using one of
the retrieval methods:

- `GetFeatureFlagBoolAsync()`
- `GetFeatureFlagStringAsync()`
- `GetFeatureFlagNumberAsync()`

### Server

1. Inject `IFeatureService` where you need a feature flag. Note that you’ll also need
   `ICurrentContext` when accessing the feature state.
2. Find the constant in the
   [`FeatureFlagKeys`](https://github.com/bitwarden/server/blob/main/src/Core/Constants.cs) list for
   the key you plan on using. It should have been added when
   [creating a new flag](#creating-a-new-flag).
3. Utilize the above key constant with the appropriate method on the feature service:

- `IsEnabled` for Booleans, with `false` an assumed default.
- `GetIntVariation` for integers, with `0` an assumed default.
- `GetStringVariation` for strings, with `null` an assumed default.

## Feature flag lifecycle

:::tip LaunchDarkly access

Let your management know when you need to change something about a feature online inside
LaunchDarkly. Only a small number of users have accounts with LaunchDarkly to save on licensing
costs.

:::

The process and ownership considerations for updating flag values are dependent upon the environment
and change as the flagged code progresses through the development lifecycle.

### Development environments

In the development environments, ownership of the flag values is in the hands of the development
team. The Engineering Manager of the team is responsible for maintaining and updating flag values.

By default, flags should be **enabled** in the development environment as soon as the flag is
created. This allows the feature to be viewed and exercised by product, design, the development
team, and others within the organization. There is an understanding that there may be rough edges
around the product deployed behind a feature flag in the development environment, as parts of the
feature may be introduced incrementally into `main` behind the feature flag. As a general rule,
defects should not be recorded about new features without checking with the development team first,
to avoid reporting unfinished functionality.

### QA environments

In the QA environments, the QA team owns the flag values. The QA Managers are responsible for
maintaining and updating flag values as new features are enabled for QA testing.

Flags should be **disabled** by default in the QA environments. This allows the flagged
functionality to be fully built and tested by the developers and introduced into QA when ready. When
the feature is `Ready for QA` the QA Engineers on the team should work with the QA Managers to
enable the flag.

The QA Managers are also responsible for ensuring that during regression testing the environment
under test has the proper flag values set to match the desired production environment after
deployment.

### Production environments

In the production environments, the ownership of the flag values is shared between product and
engineering.

Flags are **disabled** by default in the production environments. Only when the Product Manager is
ready for the feature to be enabled should the Engineering Manager enable the flag.

### Unwinding a feature flag

Once the flag has been enabled in all environments and the feature is verified to be functioning as
expected, the final steps are to remove the flagged conditional logic from our codebase, then the
flag itself. When defining the tasks for feature-flagged code, be sure to include a cleanup task for
removing this logic. You may want to consider multiple tasks - one for each of the steps in the
removal process.

Due to the complexity of the different client deployments and how we expose feature flags through
our API, it is important that each feature flag be removed in the appropriate sequence.

First, remove all business logic that relies on the flag from both client and server code. This
includes _all_ references in the client codebase, and also any business logic on the server that
checks the flag value. This does _not_ include removing the flag from the `FeatureFlagKeys` on the
server -- we must leave this here so that old clients who have not updated continue to be served the
correct "on" value when querying for the flag.

This code should then be deployed to all clients and to the server.

:::tip Self-hosted customers

Once the code referencing the flag has been removed and clients have updated, self-hosted customers
can update to the latest version to begin using the feature. See
[Self-hosted considerations](#self-hosted-considerations) below for more detail.

:::

Once we have satisfied the requirements of
[backward compatibility](https://bitwarden.com/help/bitwarden-software-release-support/#release-support-at-bitwarden)
for our clients, we can completely remove the feature flag from the server codebase. This can be
done by removing the flag value from the `FeatureFlagKeys`.

Once the server codebase has been deployed to all environments without any references to the flag,
the flag should be archived in LaunchDarkly. Feature flags not accessed for a long period of time
will automatically move to an "inactive" state that can also help with identifying technical debt to
clean up.

## Self-hosted considerations

Self-hosted instances will not have access to LaunchDarkly, so the server configuration retrieved
from the API will assess all feature flags as their default state unless the server is configured
otherwise. What this means in practice is that the feature flag must be removed from the code before
the feature is available for self-hosted instances. This implies a staged feature release cycle, as
follows:

1. Release cloud and self-hosted with feature flag off
2. Turn on feature flag, enabling the feature for cloud instances **only**
3. Release cloud and self-hosted with the feature flag removed, therefore enabling the feature for
   self-hosted instances

A self-hosted installation may choose to configure alternative [data sources](#flag-data-sources) to
more quickly adopt a feature.
