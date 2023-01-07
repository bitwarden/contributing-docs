---
sidebar_position: 1
---

# Collecting Page Details

The first step in the Autofill process is to collect what are referred to as the "Page Details" in
the codebase. The Page Details are an array of metadata about the page source of the current browser
tab.

Because it needs access to the DOM of the tab, the collection of the Page Details must be performed
by a content script. The Bitwarden browser extension performs this in the `collect()` method in the
`autofill.js` content script. This method is responsible for parsing the page DOM.

## Requesting page detail collection

Page detail collection can be requested from other content scripts or from the extension itself.

### Requesting page details in the background

Page detail collection is requested from content script in two cases:

- The `notificationBar.js` content script detects that the page DOM has changed, or
- The user has Autofill on Page Load turned on, so `autofiller.js` requests autofill on page load

In both of these cases, page detail collection is requested from another content script in the
background, we use the `bgCollectPageDetails` command to communicate the request to the
`main.background.ts` background page, which then requests that `runtime.background.ts` transmit the
`collectPageDetails` messaage to the `autofill.js` content script.

The `autofill.js` content script generates the page details and broadcasts a
`collectPageDetailsResponse` message with a sender of either `autofiller` or `notificationBar`. The
`runtime.background.js` and `notification.background.js` are listening for these two messages,
respectively.

```kroki type=plantuml
@startuml
box "Content Scripts" #LightBlue
participant autofill.js as autofill
participant autofiller.ts as autofiller
participant notificationBar.ts as notificationBar
end box

box "Background Pages" #LightYellow
participant notification.background.ts as notification
participant runtime.background.ts as runtime
participant main.background.ts as main
end box

group Autofill on Page Load
  autofiller -> runtime : bgCollectPageDetails [sender: autofiller]
  runtime --> main : collectPageDetailsForContentScript()
  main -> autofill : collectPageDetails [sender: autofiller]
  autofill -> runtime : collectPageDetailsResponse [sender: autofiller]
end group

break

group Notification Bar
  notificationBar -> runtime : bgCollectPageDetails [sender: notificationBar]
  runtime --> main : collectPageDetailsForContentScript()
  main -> autofill : collectPageDetails [sender: notificationBar]
  autofill -> notificationBar: collectPageDetailsResponse [sender: notificationBar]
end group

@enduml
```

### Requesting page details from context menu

Bitwarden extension users have the ability to trigger Autofill from the context menu by
right-clicking on the page and selecting "Bitwarden / Autofill", then picking a vault item from the
items matching the current page URI.

When the user selects an item on the context menu, the browser `contextMenu.OnClicked()` event is
fired. This event is handled by the `contextMenus.background.js` background page. The page issues a
`collectPageDetails` command with a `contextMenus` sender. The `autofill.js` content script catches
this request and issues a `collectPageDetailsResponse` with a sender of `contextMenus` when
complete, which is handled by the `runtime.background.js` background page.

```kroki type=plantuml
@startuml

actor User
participant "Autofill Context Menu" as autofillContext

box "Content Scripts" #LightBlue
participant autofill.js as autofill
end box

box "Background Pages" #LightYellow
participant contextMenus.background.ts as context
participant runtime.background.ts as runtime
end box

User --> autofillContext
autofillContext -> context : contextMenus.onClicked()
context -> autofill : collectPageDetails [sender: contextMenu]
autofill -> runtime : collectPageDetailsResponse [sender: contextMenu]

@enduml
```

### Requesting page details on keyboard shortcut

The keyboard shortcut for the Bitwarden Autofill is configured in the `manifest.json` and
`manifest.v3.json` files, for Manifest v2 and v3, respectively. The command is defined in the
manifest files as `autofill_login`. When the user initiates that key combination, the browser
command is broadcast to all listeners. This behavior is detailed
[here](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands).

#### Manifest v2

In a browser extension running Manifest v2, the `commands.background.ts` background page is
listening for the `autofill_login` command. This background page executes the
`collectPageDetailsForContentScript()` method on `main.background.js`, which broadcasts the
`collectPageDetails` message to the `autofill.js` content script.

After generating the page details, the `autofill.js` content script broadcasts a
`collectPageDetailsResponse` message with an `autofill_cmd` sender. The `runtime.background.js`
background page is listening for this message and receives it.

```kroki type=plantuml
@startuml

actor User

box "Content Scripts" #LightBlue
participant autofill.js as autofill
end box

box "Background Pages" #LightYellow
participant commands.background.ts as commands
participant runtime.background.ts as runtime
participant main.background.ts as main
end box

User -> commands : autofill_login
commands --> main : collectPageDetailsForContentScript()
main -> autofill : collectPageDetails [sender: autofill_cmd]
autofill -> runtime : collectPageDetailsResponse [sender: autofill_cmd]

@enduml
```

#### Manifest v3

For browser extensions running Manifest v3, the background pages are replaced with the
`commandListener`. The `commandListener` is listening for the `autofill_login` command, and it
responds by broadcasting the `collectPageDetailsImmediately` command.

The `collectPageDetailsImmediately` is different from the `collectPageDetails` command, in that the
response is **not** another message broadcast through the browser command API. Instead, the
`autofill.js` content script performs the page details generation and returns the response
asynchronously through a Promise.

```kroki type=plantuml
@startuml

actor User

box "Content Scripts" #LightBlue
participant autofill.js as autofill
end box


box "Listeners" #LightGray
participant commandListener as listener
end box

User -> listener : autofill_login
listener -> autofill : collectPageDetailsImmediately
autofill --> listener
@enduml
```

### Requesting page details from the extension UI

There are two ways that a user can request an autofill from the Bitwarden browser extension UI:

- Clicking the "Autofill" button when viewing an item in their vault (`view.component.ts`), or
- Clicking on a vault item on the Current Tab view (`current-tab.component.ts`)

In both of these cases, the component issues a `collectPageDetails` command with the extension
instance's unique `BroadcasterSubscriptionId` as the `sender`. The `autofill.js` content script
generates the page details and responds with a `collectPageDetailsResponse` message with the same
`sender`, ensuring that the message is received properly by the correct sender.

```kroki type=plantuml
@startuml
actor User

box "Content Scripts" #LightBlue
participant autofill.js as autofill
end box

box "Extension UI" #RoyalBlue
participant view.component.ts as viewComponent
participant "current-tab.component.ts" as currentTab
end box

group Autofill from Item View
  User --> viewComponent : Clicks Autofill Button
  viewComponent -> autofill : collectPageDetails [sender: BroadcasterSubscriptionId]
  autofill --> viewComponent : collectPageDetailsResponse [sender: BroadcasterSubscriptionId]
end group

break

group Autofill from Current Tab View
  User --> currentTab : Clicks Autofill on Cipher
  currentTab -> autofill : collectPageDetails [sender: BroadcasterSubscriptionId]
  autofill --> currentTab : collectPageDetailsResponse [sender: BroadcasterSubscriptionId]
end group

@enduml
```

## Gathering the page details

### Input

The page DOM.

### Output

An JavaScript object, formed as follows:

```javascript
var pageDetails = {
  documentUUID: oneShotId,
  title: theDoc.title,
  url: theView.location.href,
  documentUrl: theDoc.location.href,
  tabUrl: theView.location.href,
  forms: (function (forms) {
    var formObj = {};
    forms.forEach(function (f) {
      formObj[f.opid] = f;
    });
    return formObj;
  })(theForms),
  fields: theFields,
  collectedTimestamp: new Date().getTime(),
};
```

We will focus on the `fields` and `forms` elements in more detail.

#### Autofill fields

Each element in the `fields` array represents an individual element in the page DOM that the
`collect()` routine has deemed to contain a potentially fillable field. Each object has properties
on it that will contain all of the actionable HTML attributes for that element; the collection
routine must gather enough information for the later Autofill process to determine which (if any)
fields to fill, and what values to put there.

For example, if we encountered a simple HTML `<input>` element

```html
<input type="text" id="userName" name="userName" />
```

The corresponding object would be created as:

```typescript
{
    "opid": "1",
    "htmlID": "userName",
    "name": "userName",
    "type": "text"
    ...
}
```

Note the presence of an `opid` element. Each record will have a unique `opid` for each collection
instance. This identifier is used to reference the field for later filling if necessary.

#### Autofill form

In addition to the array of fields, the `collect()` routine also returns an array of `forms`. Each
element in the `forms` array represents an element within a form in the page DOM. Much like the
`fields` array, each element contains an object that has properties for each relevant HTML
attribute.

One distinction is that each element in the `forms` array also has a `form` property, which stores
the `opid` of the parent form, with a format of `__form__{id}`. This allows the form fields for each
form to be correlated during future processing.
