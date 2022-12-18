---
sidebar_position: 4
---

# Autofill

## Core Concepts

### Content Scripts

A
[content script](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts)
is a script that the browser inserts into the Page Source for each page that the browser loads.
content scripts can read and modify the contents of the page onto which they are loaded, but they do
not have access to the full set of browser APIs.

The Bitwarden extension uses content scripts in order to perform the Autofill functionality, as
Autofill must both parse the Page Source to find the relevant fields and also alter the Page Source
to fill in the fields with the relevant Cipher data.

The extension uses the following scripts for Autofill:

| Content Script               | Responsibility                                                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content/autofill.js`        | Responsible for collecting the page details and performing the autofill action on the fields that are matched with vault items                                                           |
| `content/autofiller.ts`      | Responsible for automatically filling the form for users who have the "Enable Autofill on Page Load" setting enabled                                                                     |
| `content/notificationBar.js` | Responsible for detecting DOM changes that indicate that a user has changed their credentials on a site or submitted a new form with new credentials, triggering the Notification Bar UI |

::: note

There are other content scripts that Bitwarden uses, but these are the scripts related to the
Autofill functionality and relevant here.

:::

### Background Pages and Listeners

The Bitwarden browser extension uses
[background pages](https://developer.chrome.com/docs/extensions/mv2/background_pages/) in order to
listen and respond to actions triggered by the content scripts running on the browser tab. They do
this by using `BrowserApi.messageListener()` to attach to `chrome.runtime.onMessage.addListener()`.

The background scripts used in the Bitwarden extension are:

| Background Page              | Responsibility                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `runtime.background.ts`      | Responsible for attaching to the `chrome.runtime.onMessage` event and handling incoming requests related to the extension itself                                   |
| `notification.background.ts` | Responsible for attaching to the `chrome.runtime.onMessage` event and handling incoming requests related to the notification bar                                   |
| `commands.background.ts`     | Responsible for attaching to the `chrome.commands.onCommand` event and handling incoming requests related to keyboard commands                                     |
| `contextMenu.background.ts`  | Responsible for attaching to the `chrome.contextMenus.onClicked` event and requesting autofill (or other actions) when clicked                                     |
| `main.background.js`         | Responsible for bootstrapping the extension. It exists in this process solely because it (arbitrarily) contains the `collectPageDetailsForContentScript()` method. |

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
[extension messaging API](9https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage)
in order to communicate between the extension UI, the background pages, and the content scripts that
are running on each browser tab.

```kroki type=plantuml
@startuml

 package "Browser Tab" as T {
    [Page Source]
    [Content Scripts]
 }

 component "Context Menu"
 component "Keyboard Shortcut"
 component "Notification Bar"

 node "Bitwarden Browser Extension" as E {
    [Browser Extension UI]
    [Background Processes]
 }

 [Context Menu] --> [Content Scripts] : Handle user context menu click
 [Keyboard Shortcut] --> [Content Scripts] : Handle user keyboard shortcut click
 [Notification Bar] --> [Content Scripts] : Handle user Notification Bar interaction

 [Content Scripts] --> [Background Processes] : sendMessage
 [Background Processes] --> [Content Scripts] : tabSendMessage
 [Content Scripts] --> [Background Processes] : sendMessage

@enduml
```

#### Sending a request from the content script to the extension

The content scripts use one of the following to send messages to the extension:

- `BrowserApi.sendMessage`
- `chrome.runtime.sendMessage`

On the extension, we attach with `chrome.runtime.onMessage.addListener` to receive the messages
destined for the extension.

:::note

We have encapsulated the `chrome.runtime` messaging API in the `BrowserApi` static class, so you
will see references to both; ideally all would use the `BrowswerApi` class but they have not all
been refactored.

:::

#### Sending a request from the extension to the content script

We use `BrowserApi.tabSendMessage` to send messages from the extension to the content script running
on the browser tab.

On the content script on the tab, we attach with `chrome.runtime.onMessage.addListener` to receive
the messages destined for that tab.
