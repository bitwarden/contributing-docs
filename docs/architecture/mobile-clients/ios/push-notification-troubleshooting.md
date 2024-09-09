---
sidebar_custom_props:
  access: bitwarden
sidebar_position: 2
---

# iOS Push Notification Troubleshooting Tips

## Overview

There are several ways push notifications are used in the Password Manager app. While there is
[a complete list in the code](https://github.com/bitwarden/server/blob/main/src/Core/Enums/PushType.cs),
two major purposes are:

1. To sync the vault when a cipher is created, edited, or deleted on another device
2. To allow users to log in with device

However, there are a lot of things that can go wrong with push notifications, and the process is
relatively opaque. This document will provide some places where you can dig in to things under the
hood and hopefully figure out what’s going on.

## Triggering a Push Notification

The easiest way to trigger a push notification is to be logged in on both the app and a web vault,
and to create, edit, or delete a cipher in the web vault. The server should send a push notification
to the device, and the app should update to reflect the changes—adding or deleting an item is the
most obvious.

## Console

A useful debugging tool for iOS work in general is
[Console.app](https://support.apple.com/guide/console/welcome/mac), which will allow you to
potentially see logs produced by a TestFlight or release app.

Note that you can introduce your own logs with `Logger.application.log(_:)` and related `OSLog`
methods. It may be necessary to introduce logs, produce a TestFlight build, and then use that build
to diagnose issues.

The console for a device is very noisy; use filters liberally to find what you want. Some useful
filters are:

- `process:Bitwarden`
- `process:Bitwarden subsystem:com.8bit`
- `message:com.apple.pushLaunch any:bitwarden`

## Checking Device Registration

The first step in the push notification flow is the device registering its device token for push
notifications. In particular, when it tries to register, the system will call either
`application(_:didRegisterForRemoteNotificationsWithDeviceToken:)` or
`application(_:didFailToRegisterForRemoteNotificationsWithError:)` in `AppDelegate` depending on
whether or not it succeeded. In particular, you can log the device token in the `didRegister` call:

```swift
func application(_: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    Logger.application.log("Did Register with device token \(token, privacy: .public)")
    appProcessor?.didRegister(withToken: deviceToken)
}
```

This will allow you to see the device token that successfully registered.

You can check the device registration in the
[QA database](https://bitwarden.atlassian.net/wiki/spaces/CLOUDOPS/pages/326369407). In particular,
once you find your `UserId` from the `User` table, you can filter the `Device` table to confirm the
push token and its revision date to make sure the registration is correct server-side.

## Azure Notification Hub

You can check the configuration of the Push Notification Hub in the
[Azure Portal](https://portal.azure.com/#home).

## Azure Push Logs

Looking into the push notification hub for device registrations or a log of pushes made requires a
Windows machine.

## To Device

If a push notification gets to the device, the `com.apple.pushLaunch` process logs the notification.
You can filter the console to see these come through:

- `message:com.apple.pushLaunch any:bitwarden`

This will let you know that the device is receiving push notifications.

## In App

There are three methods that logging can be added to:

- `application(_:didReceiveRemoteNotification:)`
- `userNotificationCenter(_:didReceive:)`
- `userNotificationCenter(_:willPresent:)`

The logs around these can help ascertain how push notifications are getting into the application,
and therefore the flow from there in the application.

## See Also

[Technical Note TN2265: Troubleshooting Push Notifications](https://developer.apple.com/library/archive/technotes/tn2265/_index.html)
