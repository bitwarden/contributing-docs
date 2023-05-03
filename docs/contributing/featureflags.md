---
sidebar_custom_props:
  access: bitwarden
---

# Feature Flags

## Background

Support for feature flags was added based on
[ADR 0018](https://contributing.bitwarden.com/architecture/adr/feature-management/). Some
highlights:

- [Context](https://github.com/bitwarden/server/blob/master/src/Core/Context/ICurrentContext.cs) is
  provided when requesting the state of a flag. We currently allow targeting on user, organization,
  and service account. Only the IDs are sent to LaunchDarkly to avoid PII sharing.
- All available feature flag states are provided to clients calling the
  [configuration API](https://github.com/bitwarden/server/blob/master/src/Api/Models/Response/ConfigResponseModel.cs).
- Environments (production, QA, and development for now) exist to segment flag states further. This
  will be automatic based on where code is running.

## Flag data sources

When consuming feature flags in either the client or server code, it is important to understand
where the flags are sourced.

The source of the flags is dependent upon the Bitwarden server instance that is being used, as for
client development the flags are served from the Bitwarden API.

| Server configuration | Flag source                                            |
| -------------------- | ------------------------------------------------------ |
| Local development    | Local `flags.json` file                                |
| Self-hosted          | Flags are "off", unless local `flags.json` is provided |
| QA Cloud             | LaunchDarkly QA                                        |
| Production Cloud     | LaunchDarkly Production                                |

:::warning Self-hosted support

Feature flags are not officially supported for self-hosted customers. Using a local `flags.json`
file is not a supported method of sourcing feature flag values, outside of Bitwarden internal
testing. See [Self-hosted considerations](#self-hosted-considerations) for how feature flagging
applies to self-hosted.

:::

### Local `flags.json` file

As shown above, local server development instances will not query LaunchDarkly for feature flag
values.

If you need to change any feature flag values from their defaults during local development, you will
need to set up a local file data source, represented in a `flags.json` file. **Without the
`flags.json` data store, all flag values will resolve as their default ("off") value.** The file
must be present before building the solution, but once there you can change the file contents and
see immediate results in running / debugging code.

To set up the local file data store:

1. Create a file named `flags.json` file in the root project directory (e.g. `/src/Api/` for the
   `Api` project). The name and path can be changed in configuration via `FlagDataFilePath`.

2. Add the flags that you wish to supply to your locally-running code, in the following format,
   replacing `someKey` with your key name and setting the desired value.

```json
{
  "flagValues": {
    "somekey": true
  }
}
```

:::tip

For consuming feature flags in the clients, the `flags.json` file should be placed in the build
output directory of the `Api` project. This is because the `/config` endpoint that clients use to
query for feature flags is in `Api`. Doing this will ensure that the proper flag values get
retrieved and sent to the client.

:::

## Creating a new flag

When beginning work on a new feature, discuss with your team whether it should be placed behind a
feature flag. The team should agree on the scope of what is flagged and where the flag should be
applied - both client-side and server-side. While there is no precise rule on what constitutes a
"feature", work together on the best balance of flags and their respective purposes.

### Local development

As you begin work on the feature, use the `flags.json` data store to surface the flag to your
consuming code to make sure that behavior is correct for all supported flag values. Since feature
flags don’t have to exist in LaunchDarkly for initial development, **don’t create them online until
you’re sure about the final implementation**.

When coding locally in the client codebase against a feature flag, your approach for retrieving
feature flags differs based on the server instance you are querying.

:::tip Local client development

Keep in mind that for client local development, the source for the feature flag is dependent upon
the server instance you're using. For example, if you are developing client-side code and
referencing the QA Cloud Bitwarden API, the flag must be configured there and not in a local
`flags.json` file.

:::

### Definition in LaunchDarkly

In order to test the feature flag in any deployed environment, it must first be defined in the
LaunchDarkly web app. To do this, request the flag from your Engineering Manager -- they will have
the appropriate access. You should discuss:

- The data type of the flag.
- The default value of the flag.
- The possible values of the flag (for non-boolean types).
- Any context-based rules that should drive flag behavior.

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

Requesting a flag value from the services defined below will provide the consuming component with
the most recent value from one of these retrieval events.

#### Web

The feature flag values are retrieved through the `fetchServerConfig()` method on the
[`ConfigService`](https://github.com/bitwarden/clients/blob/master/libs/common/src/services/config/config.service.ts).

To use a feature flag, you should first define the new feature flag as an enum value in the
[`FeatureFlags`](https://github.com/bitwarden/clients/blob/master/libs/common/src/enums/feature-flag.enum.ts)
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
2. Check the
   [`FeatureFlagKeys`](https://github.com/bitwarden/server/blob/master/src/Core/Constants.cs)
   constant list for the key you plan on using, and add it if not found.
3. Utilize the above key constant with the appropriate method on the feature service:

- `IsEnabled` for Booleans, with `false` an assumed default.
- `GetIntVariation` for integers, with `0` an assumed default.
- `GetStringVariation` for strings, with `null` an assumed default.

## Feature flag lifecycle

Let your management know when you need to change something about a feature online inside
LaunchDarkly. Only a small number of users have accounts with LaunchDarkly to save on licensing
costs.

Feature flags don’t necessarily have to ever be deleted from LaunchDarkly, just unused. Linking them
to Jira helps create a history of the feature and there are copious logs and audit records online
that can be kept.

When defining the subtasks of a story be sure to include a technical debt cleanup task for removal
of the feature flag from code – it’s essential that these not be left around for too long and assume
a permanent existence. Address the technical debt at a later phase once the feature launches
successfully.

### Self-hosted considerations

Self-hosted instances will not have access to LaunchDarkly, so the server configuration retrieved
from the API **will always treat all feature flags as in their "off" state**. What this means in
practice is that the feature flag must be fully removed from the code before the feature is
available for self-hosted instances. This implies a staged feature release cycle, as follows:

1. Release cloud and self-hosted with feature flag off
2. Turn on feature flag, which will enable the feature for cloud instances **only**
3. Release cloud and self-hosted with feature flag removed, which enables the feature for
   self-hosted instances
