---
sidebar_position: 1
---

# iOS

import config from "@generated/docusaurus.config"

export const remoteValues = config.customFields.remoteValues;

From build time variable: {remoteValues.xcodeVersion}

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

From Docusaurus Context: {useDocusaurusContext().siteConfig.customFields.remoteValues.xcodeVersion}

From Component: <Remote name="xcodeVersion" />

From Remark Plugin: `remote:https://raw.githubusercontent.com/bitwarden/ios/HEAD/.xcode-version`

<!-- {siteConfig.customFields.xcodeVersion} -->

## Requirements

1. [Xcode](https://developer.apple.com/xcode/) (version 16.3)

2. An iPhone 16 Pro simulator (iOS 18.1) set up

## Setup

1. Clone the repository:

   ```sh
   $ git clone https://github.com/bitwarden/ios
   ```

2. Install [Mint](https://github.com/yonaskolb/mint):

   ```sh
   $ brew install mint
   ```

   Alternatively, if you prefer to install Mint without `brew`, clone the Mint repo into a temporary
   directory and run `make`.

   ```sh
   $ git clone https://github.com/yonaskolb/Mint.git
   $ cd Mint
   $ make
   ```

3. Bootstrap the project:

   ```sh
   $ Scripts/bootstrap.sh
   ```

   > **Note** Because `Scripts/bootstrap.sh` is how the project is generated, `bootstrap.sh` will
   > need to be run every time the project configuration or file structure has changed (for example,
   > when files have been added, removed or moved). It is typically best practice to run
   > `bootstrap.sh` any time you switch branches or pull down changes.

   Alternatively, you can create git hooks to automatically execute the `bootstrap.sh` script every
   time a git hook occurs. To use the git hook scripts already defined in the `Scripts` directory,
   copy the scripts to the `.git/hooks` directory.

   ```sh
   $ cp Scripts/post-merge .git/hooks/
   $ cp Scripts/post-checkout .git/hooks/
   ```

### Run the app

1. Open the project in Xcode 16.3+.
2. Run the app in the Simulator with the `Bitwarden` target for the Password Manager app or
   `Authenticator` for the Authenticator app.

> [!TIP] To open the workspace in Xcode, just go to the root folder with the CLI and run:
>
> ```sh
> open Bitwarden.xcworkspace
> ```

### Running tests

Due to slight snapshot test variations between iOS versions, the test target requires running in an
iPhone 16 Pro simulator (iOS 18.1).

1. In Xcode's toolbar, select the project and a connected device or simulator.
   - The `Generic iOS Device` used for builds will not work for testing.

2. In Xcode's menu bar, select `Product > Test`.
   - Test results appear in the Debug Area, which can be accessed from
     `View > Debug Area > Show Debug Area` if not already visible.

### Linting

This project is linted using both [SwiftLint](https://github.com/realm/SwiftLint) and
[SwiftFormat](https://github.com/nicklockwood/SwiftFormat). Both tools run in linting mode with
every build of the `Bitwarden` target. However, if you would like to have SwiftFormat autocorrect
any issues that are discovered while linting, you can manually run the fix command
`mint run swiftformat .`.

Additionally, if you would like SwiftFormat to autocorrect any issues before every commit, you can
use a git hook script. To use the git hook script already defined in the `Scripts` directory, copy
the script to the `.git/hooks` directory.

```sh
$ cp Scripts/pre-commit .git/hooks/
```
