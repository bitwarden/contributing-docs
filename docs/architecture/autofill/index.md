---
sidebar_position: 4
---

# Autofill

## Core Concepts

### Content Scripts

A
[content script](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts)
is a script that the browser inserts into the page source for each page that the browser loads.
Content scripts can read and modify the contents of the page in which they are loaded, but they do
not have access to the full set of browser APIs.

The Bitwarden extension uses content scripts in order to perform the Autofill functionality, as
Autofill must both parse the page source to find the relevant fields and also alter the page source
to fill in the fields with the relevant Cipher data.

The extension uses the following scripts for Autofill:

<!-- prettier-ignore -->
| Content Script | Responsibility |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `content/autofill.js`        | Collects form elements from the page and performs the autofill action on relevant fields. |
| `content/autofiller.ts`      | Triggers autofill for users who have the "Enable Autofill on Page Load" setting enabled.  |
| `content/notificationBar.js` | Detects when the user submits new or updated credentials on a website and triggers the Notification Bar UI. |

:::note

There are other content scripts that Bitwarden uses, but these are the scripts related to the
Autofill functionality.

:::

### Background Pages and Listeners

The Bitwarden browser extension uses
[background pages](https://developer.chrome.com/docs/extensions/mv2/background_pages/) in order to
listen and respond to actions triggered by the content scripts running on the browser tab. They do
this by using `BrowserApi.messageListener()` to attach to `chrome.runtime.onMessage.addListener()`.

The background scripts used in the Bitwarden extension are:

<!-- prettier-ignore -->
| Background Page              | Responsibility                                                                                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `runtime.background.ts`      | Handles incoming requests related to core extension functionality.                                   |
| `notification.background.ts` | Handles incoming requests related to the notification bar.                                  |
| `commands.background.ts`     | Handles incoming requests related to keyboard commands (including autofill).                                    |
| `contextMenu.background.ts`  | Handles context menu actions (including autofill).                                    |
| `main.background.js`         | Bootstraps the extension. It is relevant here only because it (arbitrarily) contains the `collectPageDetailsForContentScript()` method. |

In order to support browsers that will require the
[Chrome Extension Manifest v3](https://developer.chrome.com/docs/extensions/mv3/intro/)
specifications, the Bitwarden extension also handles the keyboard shortcut command through an
`onCommandListener`. This listener is registered with `chrome.commands.onCommand.addListener`. The
`onCommandListener` is responsible for initiating the `AutoFillActiveTabCommand` to trigger the
Autofill functionality, similar to how the `commands.background.ts` background page handles incoming
keyboard command messages.

### Messaging

We have established that the Bitwarden extension uses content scripts and background pages or
listeners in order to perform Autofill. The last piece of the puzzle is the communication between
them. The Autofill architecture leverages the
[extension messaging API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage)
in order to communicate between the extension UI, the background pages, and the content scripts that
are running on each browser tab.

```kroki type=plantuml
@startuml

 package "Browser Tab" as T {
    [Page Source]
    [Content Scripts]
 }

 node "Bitwarden Browser Extension" as E {
    [Browser Extension UI]
    [Background Pages]
 }

 [Background Pages] --> [Content Scripts] : tabSendMessage
 [Content Scripts] --> [Background Pages] : sendMessage

@enduml
```

#### Sending a request from the content script to the extension

To send a request from a content script to the extension, we have two services provided:

- When Dependency Injection is available, the `BrowserMessagingService` should be used, with its
  provided `send()` method.
- When no Dependency Injection is available, the static `BrowserApi` should be used, with its
  `sendMessage()` method.

On the extension, we attach with `chrome.runtime.onMessage.addListener` to receive the messages
destined for the extension.

:::note

The `BrowserMessagingService` and `BrowserApi` abstract the `chrome.runtime.sendMessage` API. If any
direct references to this API are found, they should be refactored to use one of our abstractions.

:::

#### Sending a request from the extension to the content script

We use `BrowserApi.tabSendMessage` to send messages from the extension to the content script running
on the browser tab.

In the content script on the tab, we attach with `chrome.runtime.onMessage.addListener` to receive
the messages destined for that tab.

:::note

The `BrowserApi` abstracts the `chrome.tabs.sendMessage` API. If any direct references to this API
are found, they should be refactored to use our abstraction.

:::
