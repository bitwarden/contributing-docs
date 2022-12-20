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

## Environment Setup

By default, the browser extension will run pointing to the production server endpoints. To override
this for local development and testing, there are several options.

### Using `managedEnvironment`

The browser extension has the concept of a "managed environment", which is JSON configuration stored
in
[`development.json`](https://github.com/bitwarden/clients/blob/master/apps/browser/config/development.json),
within the `devFlags` object.

The `managedEnvironment` setting allows the contributor to override any or all of the URLs for the
server. The `managedEnvironment` is read in the
[`BrowserEnvironmentService`](https://github.com/bitwarden/clients/blob/master/apps/browser/src/services/browser-environment.service.ts)
and overrides the default (production) settings for any supplied URLs.

There are two ways to use `managedEnvironment`, depending upon whether you will also be running the
web vault at the same time.

#### `managedEnvironment` with web vault running

If you are also running the web vault, you only need to set the `base` URL in the
`managedEnvironment`:

```json
{
   "devFlags":{
      "managedEnvironment":{
         "base":"https://localhost:8080"
      }
      ...
   }
   ...
}
```

This is because the web vault includes the `webpack-dev-server` package in its
[`webpack.config.js`](https://github.com/bitwarden/clients/blob/master/apps/web/webpack.config.js).
When it is running, it proxies each of the endpoints based on the settings configured in its _own_
[`development.json`](https://github.com/bitwarden/clients/blob/master/apps/web/config/development.json)
configuration file:

```json
  "dev": {
    "proxyApi": "http://localhost:4000",
    "proxyIdentity": "http://localhost:33656",
    "proxyEvents": "http://localhost:46273",
    "proxyNotifications": "http://localhost:61840"
  },
```

This means that when the web vault is running, the browser `managedEnvironment` does **not** need to
override each of the URLs individually. The browser will format each URL as `{base}/{endpoint}`,
such as http://localhost:8080/api, but the webpack DevServer will proxy that URL to the correct
port, like http://localhost:4000.

#### `managedEnvironment` without web vault running

If you are testing the browser extension _without_ the web vault running, you will not be able to
take advantage of the webpack DevServer to proxy the URLs. This means that your `managedEnvironment`
setting must explicitly override all of the URLs with which you are going to be communicating
locally.

```json
{
    "devFlags": {
        "managedEnvironment": {
            "webVault": "http://localhost:8080",
            "api": "http://localhost:4000",
            "identity": "http://localhost:33656",
            "notifications": "http://localhost:61840",
            "icons": "http://localhost:50024"
        }
        ...
    }
    ...
}
```

### Manually setting the Custom Environment URLs

You may want to adjust the server URLs to point to your local server once you have loaded the
extension instead of overriding them in `managedEnvironment`. You can change this through the
browser settings. You can see instructions on how to configure the URLs
[here](https://bitwarden.com/help/change-client-environment/).

Once configured, your local Custom Environment should look like this:

![Screenshot of Custom Environments](custom-local-environment.png)

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

#### Resetting the extension reference paths

On MacOS, the Browser extension is packaged with the Desktop client. If you’ve built, installed or
ran the Desktop client before (including the official release), there’s a risk that Safari will
continue to load the official Browser extension and not the version you’ve built from source.

To avoid this, follow the instructions below to “reset” Safari’s extension reference paths:

1.  Open Safari
2.  Click “Preferences” and then click the “Extensions” tab
3.  Uninstall the Bitwarden extension
4.  Quit and completely close Safari
5.  If you have the official Desktop client installed, uninstall it
6.  If you have previously built the Desktop client from source, delete the `PlugIns` directory (if
    it exists) and the `.dmg` (if you ran the Mac Apple Store build)
7.  Reopen Safari and check Preferences to confirm that there is no Bitwarden Browser extension
    installed
8.  Quit and completely close Safari

You may need to do this periodically if you are loading the Browser extension from different sources
(for example, switching between a local build and the official release).

#### Testing

To build and load the Browser extension:

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

#### Developing in Xcode

You can also build and debug using Xcode, which allows for a more iterative approach without having
to wait a long time for the build to compile.

1.  Build the extension:

    ```bash
    npm run build
    ```

2.  Edit `build/manifest.json`. Move the `nativeMessaging` permission from the
    `optional_permissions` section into the `permissions` section
3.  Open `src/safari/desktop.xcodeproj` in Xcode
