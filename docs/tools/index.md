# Tools and Libraries

## Operating System

All Bitwarden developers are issued with a Macbook. The tooling recommendations and instructions in this documentation assume that you’re using MacOS. This may require some adaptation if you’re using a different operating system.

## Recommended tools

The following tools are strongly recommended as part of the “standard” developer setup. We recommend that any new Bitwarden developer install all of them as part of setting up their local development environment.
IDEs

- [Visual Studio for Mac](https://visualstudio.microsoft.com/vs/mac/) - used for Server and Mobile
- [Visual Studio Code](https://code.visualstudio.com/) - used for all Typescript projects, with the following suggested extensions:
- [Xcode](https://developer.apple.com/xcode/) - required to support Mobile development

## Local environment

- [Docker](https://docs.docker.com/get-docker/) - required for server development only
- [Homebrew](https://brew.sh/)
- [PowerShell](https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell-core-on-macos) (available via Homebrew: `brew install powershell`)
- [NodeJS](https://nodejs.org/) v16 (preferably using a [node version manager](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm))
- [NPM](https://www.npmjs.com/) v8 (included with Node)
- [Rust](https://www.rust-lang.org/tools/install)

## Commit signing

[Commit signing](./commit-signing.md) is required for all Bitwarden developers and is strongly encouraged for community contributors.


## Other tools

- [Azure Data Studio](https://docs.microsoft.com/en-us/sql/azure-data-studio/download-azure-data-studio) - for working with your local SQL Server
- [Iterm2](https://iterm2.com/) (available via Homebrew) - a better terminal emulator
- [Sourcetree](https://www.sourcetreeapp.com/) - Git GUI.

  Note: For the git hooks to behave correctly on macOS when using nvm, please create the following file.

        # ~/.huskyrc
        # This loads nvm.sh and sets the correct PATH before running hook
        export NVM_DIR="$HOME/.nvm"

        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

## Optional tools

The following tools may be useful depending on your preferences or what you’re developing.

- [JetBrains Rider](https://www.jetbrains.com/rider/) ($) - an alternative to Visual Studio and/or Visual Studio Code for MacOS
- [Microsoft Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/) - for connecting to or working with local Azure table storage and queues
