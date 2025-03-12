---
sidebar_custom_props:
  access: bitwarden
---

# Mac App Store Dev

:::warning

The Mac App Store (MAS) Dev build is only required to test certain features that are exclusive to
the MAS. In general, you should use the main build instructions (using `npm run electron`) unless
you have a specific reason for needing the MAS build.

:::

## Setup

These steps can be quite tricky. If you encounter any difficulties, post in the `#team-eng` Slack
channel for assistance.

### Xcode

1. Install [Xcode from the App Store](https://apps.apple.com/us/app/xcode/id497799835?mt=12).

1. Login with your AppleID that is a member of the 8bit solutions LLC organization. This can be done
   from `Xcode > Preferences ... > Accounts`

1. Ensure you have a personal code signing certificate assigned to Bitwarden Inc by clicking the
   `Bitwarden Inc` team and clicking `Manage Certificates...`.

1. If no certificate is listed, click the plus sign (`+`) to create one.

### Keychain

Verify that your Apple Keychain contains a value for `AC_PASSWORD`, if not we’ll need to generate
one.

1. Login using your Apple Account on the [Apple-ID website](https://appleid.apple.com/).

2. Click on “App-Specific Passwords”

   ![App-Specific Passwords](./app-specific-passwords.png)

3. And then click on the `+` icon next to `Passwords` to add a new App-Specific Password.
   ![image](./app-specific-passwords2.png)

4. Save the new App-specific password using

```bash
security add-generic-password -a "<apple_id>" -w "<app_specific_password>" -s "AC_PASSWORD"
```

### Provisioning Profile

1. Ask DevOps (@BRE in slack) to have your `Apple Development` signing certificate added to the
   provisioning profile, and your Mac `Provisioning UDID` added to the whitelist. The
   `Provisioning UDID` can be found by going to `About This Mac > System Report...` and copying the
   `Provisioning UDID:` row.

2. Once everything is added, download the `Bitwarden Desktop Development (2021)` provisioning
   profile from https://developer.apple.com/account/resources/profiles/list

3. Install the provisioning profile to your device, and place it the `clients/apps/desktop`
   repository root.

## Testing

1. Identify the name of your personal development certificate by running:
   ```zsh
   security find-identity -v | grep 'Apple Development'
   ```
2. Ensure the CSC_NAME environment variable is set by running export CSC_NAME="", the value should
   be the output from find-identity without the Apple Development: portion.

3. Run `npm run dist:mac:masdev`.

:::info

If this is your first time running desktop locally, be sure to run `npm ci` before
`npm run dist:mac:masdev`.

:::

### Troubleshoot

If you receive an error stating `You do not have permission to open the application "Bitwarden".`
ensure the correct provisioning profile is placed in the desktop repository root.
