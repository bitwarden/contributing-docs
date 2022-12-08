---
sidebar_position: 3
---

# Browser

## Requirements

Before you start, you must complete the [Clients repository setup instructions](../index.md).

## Build Instructions

1.  Build and run the extension:

    ```bash
    cd apps/browser
    npm run build:watch
    ```

2.  Load the unpacked browser extension in your browser using the instructions in the next section.

## Testing and Debugging

### Chrome and Chromium-based browsers

To load the browser extension build:

1.  Navigate to `chrome://extensions` in your address bar. This will open the extensions page
2.  Enable “developer mode” (toggle switch)
3.  Click the “Load unpacked” button
4.  Open the `build` folder of your local repository and confirm your choice

You will now have your local build of the browser extension installed.

You can debug the background page of the browser extension by clicking “background.html” underneath
the Bitwarden heading in `chrome://extensions`. You can debug the popup by right-clicking it while
it is open and clicking “Inspect”.

### Firefox

To load the browser extension build:

1.  Navigate to `about:debugging` in your address bar. This will open the add-on debugging page
2.  Click “This Firefox”
3.  Click “Load Temporary Add-on”
4.  Open the `build` folder of your local repository and open the `manifest.json` file

You will now have your local build of the browser extension installed.

The temporary add-on will only be installed for the current session. If you close and re-open
Firefox, you will have to load the temporary add-on again.

You can debug the background page of the browser extension by clicking the “Inspect” button next to
the Bitwarden heading in the Temporary Extensions page. To debug the popup:

1.  Inspect the background page using the instructions above
2.  Click the “three dots” in the top right-hand corner of the debugger and click “Disable Pop-up
    Auto-hide”

    ![Screenshot of the context menu](disable-popup-auto-hide.png)

3.  Open the extension popup
4.  Click the “iframe” button (next to the “three dots”) and select “/popup/index.html”

### Safari

Safari WebExtensions must be distributed through the Mac App Store, bundled with a regular Mac App
Store application. Due to this the build and debug process is slightly different compared to the
other browsers.

#### Uninstall previous versions

If you’ve built, installed or ran the Desktop client before (including the official release), Safari
will most likely continue to load the official Browser extension and not the version you’ve built
from source.

To avoid this, follow the instructions below to uninstall the Safari extension:

1.  Open Safari
2.  Click “Preferences” and then click the “Extensions” tab
3.  Click uninstall next to the Bitwarden extension
4.  Delete the Application with the extension.
5.  Reopen Safari and check Preferences to confirm that there is no Bitwarden Browser extension
    installed. In case there still is a Bitwarden Extension please repeat step 3-4.
6.  Quit and completely close Safari

You may need to do this periodically if you are loading the Browser extension from different sources
(for example, switching between a local build and the official release).

#### Developing in Xcode

The easiest way to develop the extension is to build and debug it using Xcode.

1. Build the extension:

   ```bash
   npm run build:watch
   ```

2. Edit `build/manifest.json`. Move the `nativeMessaging` permission from the `optional_permissions`
   section into the `permissions` section
3. Edit `build/index.html`, replace `<html class="__BROWSER__">` to `<html class="browser_safari">`.
4. Open `src/safari/desktop.xcodeproj` in Xcode
5. Run the "desktop" target.

:::note

Please remember to re-run through Xcode whenever any changes are made to the source files. It will
not automatically reload.

:::

#### Production build

The other alternative is to use the "proper" build process through gulp. This method doesn't require
any manual processing of the output since gulp does it for us. However we have to completely rebuild
the extension which is slower.

1.  Build the extension for Safari

    ```bash
    npm run dist:safari:dmg
    ```

2.  Open Safari and check Preferences to confirm that the extension is installed and enabled

:::caution

You may need to
[Configure Safari in macOS to Run Unsigned Extensions](https://developer.apple.com/documentation/safariservices/safari_web_extensions/running_your_safari_web_extension#3744467).

:::

To enable debugging:

1.  Click “Preferences” and then click the “Advanced” tab
2.  Enable “Show Develop menu in menu bar”

You can debug the background page of the browser extension by clicking
`Develop -> Web Extension Background Pages` and then selecting Bitwarden. You can debug the popup by
right-clicking it while it is open and clicking "Inspect Element".

This should be enough for most debugging and testing, unless you're working in native code.

<bitwarden>

:::info

[Deploying](https://bitwarden.atlassian.net/wiki/spaces/EN/pages/166396366/Deploying) has more
information about building, packing and signing the MacOS Desktop client, including the Browser
extension. It may be useful for debugging if you’re having difficulty.

:::

</bitwarden>
