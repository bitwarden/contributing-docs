---
sidebar_custom_props:
  access: bitwarden
---

# Feature Flags

## Background

Support for feature flags was added based on
[ADR 0019](https://contributing.bitwarden.com/architecture/adr/feature-management/). Some
highlights:

- [Context](https://github.com/bitwarden/server/blob/master/src/Core/Context/ICurrentContext.cs) is
  provided when requesting the state of a flag. We currently allow targeting on user and
  organization. Only the IDs are sent to LaunchDarkly to avoid PII sharing.
- All available feature flag states are provided to clients calling the
  [configuration API](https://github.com/bitwarden/server/blob/master/src/Api/Models/Response/ConfigResponseModel.cs).
- Environments (production, QA, and development for now) exist to segment flag states further. This
  will be automatic based on where code is running.

## Using feature flags in code

Default to an "off" state whenever possible – code defensively so that existing functionality is
maintained should a flag be unavailable altogether. When an interface supports it, also provide
default values implying "off" to feature flag accessors.

Offline mode makes default values even more important, and local development as well as self-hosted
installations imply being offline. Set a safe default value not just in the flag definition online
at LaunchDarkly but in code.

### Server

1. Inject `IFeatureService` where you need a feature flag. Note that you’ll also need
   `ICurrentContext` when accessing the feature state.
2. Check the
   [FeatureFlagKeys](https://github.com/bitwarden/server/blob/master/src/Core/Constants.cs) constant
   list for the key you plan on using, and add it if not found.
3. Utilize the above key constant with the appropriate method on the feature service:

- `IsEnabled` for Booleans, with `false` an assumed default.
- `GetIntVariation` for integers, with `0` an assumed default.
- `GetStringVariation` for strings, with `null` an assumed default.

#### File Fallback

For engineers as well as other local users – and this does apply to self-hosted installations if
they choose to do so, although it is not officially supported at this time – you can use a local
JSON file to set feature states. Create a `flags.json` file (the name and path can be changed in
configuration too via `FlagDataFilePath`) with:

```json
{
  "flagValues": {
    "somekey": true
  }
}
```

and set your keys and values. Place the file in the build output directory of what you’re planning
on running and the system will pick it up; ensure the file is there before starting. It also
supports live reloading so you can change the file contents and see immediate results in running /
debugging code.

### Clients / Mobile

:::warning

Clients should now refresh configuration upon startup, login, when their local configuration is
updated, and when sync events come in.

:::

Given the variety of clients and unique implementations, a few general rules:

- Utilize the collection of feature states returned from the configuration API.
- When in need of a feature state depend on what’s cached locally and available – this should
  refresh frequently enough.
- Maintain constants for feature flag keys.

## Creating a new flag

:::warning

Compile-time configuration should be converted to use feature flags where appropriate. That said,
feature flags are not to be used for permanent configuration – logic and storage should be developed
to maintain this long-term.

:::

Talk with your team, manager / lead, and product about how and when to create new feature flags.
Depending on how a project / solution is being delivered it may be best to use the online
LaunchDarkly experience for setup. That said, LaunchDarkly is integrated into our Jira instance to
make flag creation
[easy](https://docs.launchdarkly.com/integrations/jira#creating-a-new-feature-flag-from-a-jira-issue).

General guidance:

- Title Your Feature Name.
- Keep keys succinct.
- Descriptions and tags aren’t needed as we’re tying flags to Jira.
- The most likely Jira issue type for a feature link is Story.
- Leave client-side availability unchecked altogether. We do not utilize LaunchDarkly client-side
  and provide features states ourselves via APIs.

Consider using flags frequently with feature development. Per the above usage of a local file,
feature flags don’t have to exist in LaunchDarkly for initial development – **don’t create them
online until you’re sure about the final implementation**. While there is no precise rule on what
constitutes a "feature", work together on the best balance of flags and their respective purposes.

Configure default states to be "off". While rather advanced,
[variations](https://docs.launchdarkly.com/home/flags/variations) are available if you’d like to use
them. Boolean values are by their nature not really able to use this but other data types like
strings certainly can.

## Maintaining flags

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
