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

You can debug the background page of the browser extension by clicking “background.html” underneath the Bitwarden heading in `chrome://extensions`. You can debug the popup by right-clicking it while it is open and clicking “Inspect”.

### Firefox

To load the browser extension build:

1.  Navigate to `about:debugging` in your address bar. This will open the add-on debugging page
2.  Click “This Firefox”
3.  Click “Load Temporary Add-on”
4.  Open the `build` folder of your local repository and open the `manifest.json` file

You will now have your local build of the browser extension installed.

The temporary add-on will only be installed for the current session. If you close and re-open Firefox, you will have to load the temporary add-on again.

You can debug the background page of the browser extension by clicking the “Inspect” button next to the Bitwarden heading in the Temporary Extensions page. To debug the popup:

1.  Inspect the background page using the instructions above
2.  Click the “three dots” in the top right-hand corner of the debugger and click “Disable Pop-up Auto-hide”

    ![Screenshot of the context menu](disable-popup-auto-hide.png)

3.  Open the extension popup
4.  Click the “iframe” button (next to the “three dots”) and select “/popup/index.html”

### Safari

#### Resetting the extension reference paths

On MacOS, the Browser extension is packaged with the Desktop client. If you’ve built, installed or ran the Desktop client before (including the official release), there’s a risk that Safari will continue to load the official Browser extension and not the version you’ve built from source.

To avoid this, follow the instructions below to “reset” Safari’s extension reference paths:

1.  Open Safari
2.  Click “Preferences” and then click the “Extensions” tab
3.  Uninstall the Bitwarden extension
4.  Quit and completely close Safari
5.  If you have the official Desktop client installed, uninstall it
6.  If you have previously built the Desktop client from source, delete the `PlugIns` directory (if it exists) and the `.dmg` (if you ran the Mac Apple Store build)
7.  Reopen Safari and check Preferences to confirm that there is no Bitwarden Browser extension installed
8.  Quit and completely close Safari

You may need to do this periodically if you are loading the Browser extension from different sources (for example, switching between a local build and the official release).

#### Testing

To build and load the Browser extension:

1.  Build the extension for Safari

    ```csharp
    npm run dist:safari:dmg
    ```

2.  Open Safari and check Preferences to confirm that the extension is installed and enabled

!!! warning

    You may need to [Configure Safari in macOS to Run Unsigned Extensions](https://developer.apple.com/documentation/safariservices/safari_web_extensions/running_your_safari_web_extension#3744467).

To enable debugging:

1.  Click “Preferences” and then click the “Advanced” tab
2.  Enable “Show Develop menu in menu bar”

You can debug the background page of the browser extension by clicking `Develop -> Web Extension Background Pages` and then selecting Bitwarden. You can debug the popup by right-clicking it while it is open and clicking "Inspect Element".

This should be enough for most debugging and testing, unless you're working in native code.

#### Developing in Xcode

You can also build and debug using Xcode, which allows for a more iterative approach without having to wait a long time for the build to compile.

1.  Build the extension:

    ```csharp
    npm run build
    ```

2.  Edit `build/manifest.json`. Move the `nativeMessaging` permission from the `optional_permissions` section into the `permissions` section
3.  Open `src/safari/desktop.xcodeproj` in Xcode
