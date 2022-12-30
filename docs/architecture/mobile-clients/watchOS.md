---
sidebar_position: 1
---

# Watch app

## Overall Architecture

The watchOS application is organized as follows:

- `src/watchOS`: All the code specific to the watchOS platform
  - `bitwarden`: Stub iOS app so that the watchOS app has a companion app on XCode
  - `bitwarden WatchKit App`: Main Watch app where we set assets.
  - `bitwarden WatchKit Extension`: All the logic and presentation logic for the Watch app is here

So almost all the things related to the watch app will be in the **WatchKit Extension**, the
WatchKit App one will be only for assets and some configs.

Then in the Extension we have a layered architecure:

- State (it's a really simplified version of the iOS state)
- Persistence (here we use `CoreData` to interact with the Database)
- Services (totp generation, crypto services and business logic)
- Presentation (use `SwiftUI` for the UI with an MVVM pattern)

## Integration with iOS

The watchOS app is developed using `XCode` and `Swift` and we need to integrate it to the `Xamarin`
iOS application.

For this, the `iOS.csproj` has been adapted taking a
[solution](https://github.com/xamarin/xamarin-macios/issues/10070#issuecomment-1033428823) provided
in the `Xamarin.Forms` GitHub repository and modified to our needs:

```xml
<PropertyGroup>
    <WatchAppBuildPath Condition=" '$(Configuration)' == 'Debug' ">$(Home)/Library/Developer/Xcode/DerivedData/bitwarden-cbtqsueryycvflfzbsoteofskiyr/Build/Products</WatchAppBuildPath>
    <WatchAppBuildPath Condition=" '$(Configuration)' != 'Debug' ">$([System.IO.Path]::GetFullPath('$(MSBuildProjectDirectory)\..'))/watchOS/bitwarden.xcarchive/Products/Applications/bitwarden.app/Watch</WatchAppBuildPath>
    <WatchAppBundle>Bitwarden.app</WatchAppBundle>
    <WatchAppConfiguration Condition=" '$(Platform)' == 'iPhoneSimulator' ">watchsimulator</WatchAppConfiguration>
    <WatchAppConfiguration Condition=" '$(Platform)' == 'iPhone' ">watchos</WatchAppConfiguration>
    <WatchAppBundleFullPath Condition=" '$(Configuration)' == 'Debug' ">$(WatchAppBuildPath)/$(Configuration)-$(WatchAppConfiguration)/$(WatchAppBundle)</WatchAppBundleFullPath>
    <WatchAppBundleFullPath Condition=" '$(Configuration)' != 'Debug' ">$(WatchAppBuildPath)/$(WatchAppBundle)</WatchAppBundleFullPath>
</PropertyGroup>

...

<ItemGroup Condition=" '$(Configuration)' == 'Debug' AND Exists('$(WatchAppBundleFullPath)') ">
    <_ResolvedWatchAppReferences Include="$(WatchAppBundleFullPath)" />
</ItemGroup>
<ItemGroup Condition=" '$(Configuration)' != 'Debug' ">
    <_ResolvedWatchAppReferences Include="$(WatchAppBundleFullPath)" />
</ItemGroup>
<PropertyGroup Condition=" '$(_ResolvedWatchAppReferences)' != '' ">
    <CodesignExtraArgs>--deep</CodesignExtraArgs>
</PropertyGroup>
<Target Name="PrintWatchAppBundleStatus" BeforeTargets="Build">
    <Message Text="WatchAppBundleFullPath: '$(WatchAppBundleFullPath)' exists" Condition=" Exists('$(WatchAppBundleFullPath)') " />
    <Message Text="WatchAppBundleFullPath: '$(WatchAppBundleFullPath)' does NOT exist" Condition=" !Exists('$(WatchAppBundleFullPath)') " />
</Target>
```

So on the `PropertyGroup` the `WatchAppBundleFullPath` is assembled together depending on the
Configuration and the Platform taking the output of the XCode watchOS app build. Then there are some
`ItemGroup` to include the watch app depending on if it exists and the Configuration. The task
`_ResolvedWatchAppReferences` is the one responsible to peek into the `Bitwarden.app` built by XCode
and if it finds a Watch app, it will just bundle it to the Xamarin iOS application. Finally, if the
Watch app is bundled deep signing is enabled and on building the build path is printed if exists.

## Synchronization with the iOS app

In order to sync data between the iPhone and the Watch apps the
[Watch Connectivity Framework](https://developer.apple.com/documentation/watchconnectivity) is used.

So there is a Watch Connectivity Manager on each side that is the interface used for the services on
each platform to communicate.

For the sync communication, mainly
[updateApplicationContext](https://developer.apple.com/documentation/watchconnectivity/wcsession/1615621-updateapplicationcontext)
is used given that it always have the latest data sent available, it's sent in the background and
the counterpart device doesn't necessarily needs to be in range (so it's cached until it can be
delivered). However,
[sendMessage](https://developer.apple.com/documentation/watchconnectivity/wcsession/1615687-sendmessage)
is also used to signal the counterpart of some action to take fast.

<!---
add diagram of services and watch connectivity interaction.
-->

## Crash reporting

On all the other mobile applications, [AppCenter](https://appcenter.ms/) is being used as Crash
reporting tool. However, it doesn't have support for watchOS (nor its internal library to handle
crashes).

So, on the watchOS app [Firebase Crashlytics](https://firebase.google.com/docs/crashlytics) is used
with basic crash reporting enabled (there is no handled error logging here yet). For this to work a
`GoogleService-Info.plist` file is needed which is injected on the CI.

At the moment of writing this document, no plist is configured for dev environment so `Crashlytics`
is enabled on **non-DEBUG** configurations.

There is a `Log` class to log errors happened in the app, but it's only enabled in **DEBUG**
configuration.
