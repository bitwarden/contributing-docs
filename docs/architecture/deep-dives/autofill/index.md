# Browser Autofill

## Core concepts

### Content scripts

A
[content script](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts)
is a script that the browser inserts into the page source for each page that the browser loads.
Content scripts can read and modify the contents of the page in which they are loaded, but they do
not have access to the full set of browser APIs.

The Bitwarden extension uses content scripts in order to perform the Autofill functionality, as
Autofill must both parse the page source to find the relevant fields and also alter the page source
to fill in the fields with the relevant Cipher data.

The extension uses the following scripts for Autofill:

| Content Script                                 | Responsibility                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content/trigger-autofill-script-injection.ts` | Facilitates injection of the autofill feature through the extension background. Allows autofill-specific features to be conditionally presented based on user settings.                                                                                                                                                                                 |
| `content/bootstrap-autofill.ts`                | Initializes the core autofill feature script without the autofill overlay menu logic in place.                                                                                                                                                                                                                                                          |
| `content/bootstrap-autofill-overlay.ts`        | Initializes the core autofill feature script with the autofill overlay menu logic in place.                                                                                                                                                                                                                                                             |
| `content/autofill-init.ts`                     | The core autofill feature script, handles collection of form elements from the page through the `CollectAutofillContentService` class and filling of form fields through the `InsertAutofillContentService` class. Also conditionally handles presentation and behavior of the autofill overlay menu through the `AutofillOverlayContentService` class. |
| `content/autofiller.ts`                        | Triggers autofill for users who have the "Enable Autofill on Page Load" setting enabled.                                                                                                                                                                                                                                                                |
| `content/notificationBar.js`                   | Detects when the user submits new or updated credentials on a website and triggers the Notification Bar UI.                                                                                                                                                                                                                                             |

:::note

There are other content scripts that Bitwarden uses, but these are the scripts related to the
Autofill functionality.

:::

### Background pages and listeners

The Bitwarden browser extension uses
[background pages](https://developer.chrome.com/docs/extensions/mv2/background_pages/) in order to
listen and respond to actions triggered by the content scripts running on the browser tab. They do
this by using `BrowserApi.messageListener()` to attach to `chrome.runtime.onMessage.addListener()`.

The background scripts and listeners used in the Bitwarden extension are:

| Background Page / Listener   | Responsibility                                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runtime.background.ts`      | Handles incoming requests related to core extension functionality.                                                                                                      |
| `notification.background.ts` | Handles incoming requests related to the notification bar.                                                                                                              |
| `overlay.background.ts`      | Handles communication between the content scripts present on the current page and the overlay button and list pages that present the autofill overlay menu to the user. |
| `commands.background.ts`     | Handles incoming requests related to keyboard commands (including autofill) for Mv2 extensions.                                                                         |
| `onCommandListener.ts`       | Handles incoming requests related to keyboard commands (including autofill) for Mv3 extensions.                                                                         |
| `contextMenu.background.ts`  | Handles context menu actions (including autofill).                                                                                                                      |
| `main.background.js`         | Bootstraps the extension. It is relevant here only because it (arbitrarily) contains the `collectPageDetailsForContentScript()` method.                                 |

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

On the extension background pages, we attach with `BrowserApi.messageListener` to receive the
messages destined for the extension.

:::note

The `BrowserMessagingService` and `BrowserApi` abstract the `chrome.runtime.sendMessage` and
`chrome.runtime.onMessage.addListener` exposed by the browser. If any direct references to this API
are found, they should be refactored to use one of our abstractions.

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
