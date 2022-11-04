# Firefox Private Mode

You cannot run add-ons in Firefox Private Mode using the normal side-loading technique. This is because only they appear in the `about:debugging` page, which doesn’t give you the option to enable the extension in Private Mode.

As an alternative, you can install the development build as an unsigned add-on using the steps below.

## Prerequisites

1.  Install Firefox Developer Edition
2.  Configure Firefox Developer Edition:

    1.  Open Firefox Developer Edition
    2.  Navigate to `about:config`
    3.  Set the `xpinstall.signatures.required` setting to `false` (add the setting if it’s not in the list already)

## Steps

1.  Open your local browser repository on the command line
2.  Build and package the browser extension with `npm run dist:firefox`
3.  Open Firefox Developer Edition and navigate to `about:addons`
4.  Click the cog in the top-right next to “Manage Your Extensions”
5.  Click “Install Add-on From File”
6.  Open `dist/dist-firefox.zip` in your local repository
7.  The extension will now be the `about:addons` page. Click on the name of the extension to expand it, and then toggle “Run in Private Windows”.
