# Android Mobile app

## Requirements

Before you start, you should have the recommended [Tools and Libraries](../../../tools/index.md)
installed. You will also need to install:

1.  Visual Studio 2019 (required for a dependency not included yet in VS 2022; development can be
    done in VS 2022)
2.  [dotnet Core 3.1 (latest)](https://dotnet.microsoft.com/en-us/download/dotnet/3.1)
    - Note: Even if you have an M1 Mac with ARM 64 architecture, you can install all x64 SDKs to run
      android
3.  [Xamarin (Android)](https://learn.microsoft.com/en-us/xamarin/get-started/installation/?pivots=macos-vs2022)
4.  Android SDK 29
    - You can use the SDK manager in [Xamarin, Visual Studio][xamarin-vs], or [Android
      Studio][android-studio] to install this

To make sure you have the Android SDK and Emulator installed:

1.  Open Visual Studio
2.  Click Tools > SDK Manager (under the Android subheading)
3.  Click the Tools tab
4.  Make sure the following items are installed:

    - Android SDK tools (at least one version of the command-line tools)
    - Android SDK Platform-Tools
    - Android SDK Build Tools (at least one version)
    - Android Emulator

5.  Click Apply Changes if you've marked anything for installation

If you've missed anything, Visual Studio should prompt you anyway.

## Android Development Setup

To set up a new virtual Android device for debugging:

1.  Click Tools > Device Manager (under the Android subheading)
2.  Click New Device
3.  Set up the device you want to emulate - you can just choose the Base Device and leave the
    default settings if you're unsure
4.  Visual Studio will then download the image for that device. The download progress is shown in
    the progress in the Android Device Manager dialog.
5.  Once this has completed, the emulated Android device will be available as a build target under
    Android > Debug > (name of device)

### M1 Macs

1.  Install and open Android Studio
2.  In the top navbar, click on Android Studio > Preferences > Appearance & Behavior (tab) > System
    Settings > Android SDK
3.  In the SDK Platforms tab, ensure the "Show Package Details" checkbox is checked (located in the
    bottom-right)
4.  Bellow each Android API you'll see several System Images, pick one of the `ARM 64 v8a` and wait
    for it to download
5.  Go to View > Tool Windows > Device Manager
6.  Inside Device Manager, create a device using the previously downloaded system image

![Android SDK configuration](android-sdk.png)

## Testing and Debugging

### Using the Android Emulator

In order to access `localhost:<port>` resources in the Android Emulator when debugging using Xamarin
studio on your mac natively, you'll need to configure the endpoint addresses using
`<http://10.0.2.2:<port>`\> in order to access `localhost`, which maps the Android proxy by design.

[xamarin-vs]: https://learn.microsoft.com/en-us/xamarin/android/get-started/installation/android-sdk
[android-studio]: https://developer.android.com/studio/releases/platforms

### Using Server Tunneling

Instead of having to deal with configuration on your device or emulator, you can create a proxy
tunnel to you local server using `ngrok` and have your app connect to it directly.
([More info in this server section](../../../server/tunnel.md#ngrok-requires-a-free-account))

### Push Notifications

The default configuration for the android app is to register itself to the same environment as
Bitwarden's QA Cloud. This means that if you try to debug the app using the production endpoints you
won't be able to receive live sync updates nor passwordless login requests.

<bitwarden> 
 So, in order to receive notifications while debugging your app will have to use QA Cloud endpoints for the api and identity or a local server setup where the api is connected to QA Azure Notification Hub.
</bitwarden>

### Testing Passwordless Locally

Before you can start testing and debugging passwordless logins make sure your local server setup is
running correctly ([server setup](../../../server/guide.mdx)). You should also be able to deploy
your Android app to your device or emulator.

:::note Debug and testing passwordless is limited by [push notifications](#push-notifications). :::

Testing passwordless notifications:

1. Start your local server (`api`, `identity`, `notification`)
2. Make sure your mobile device can [connect to your local server](#using-server-tunneling)
3. [Start web client](../../web-vault/index.mdx), you will need it to make login requests
4. Deploy the Android app to your device or emulator
5. After deployment, open the app, login to your QA account and activate passwordless login requests
   in settings
6. Open the web vault using your prefered browser (ex: http://localhost:8080)
7. Enter an email of a know device account and click login with device (you have to login first to
   make the device known)
8. Check mobile device for the notification
