---
sidebar_position: 1
---

# Tools

## Operating System

All Bitwarden developers are issued with a MacBook. The tooling recommendations and instructions in
this documentation assume that you’re using MacOS. This may require some adaptation if you’re using
a different operating system.

## Recommended tools

The following tools are strongly recommended as part of the “standard” developer setup. We recommend
that any new Bitwarden developer install all of them as part of setting up their local development
environment.

### IDEs

- [Visual Studio Code](https://code.visualstudio.com/) - used for all Typescript projects.
  Suboptimal for C#. Be sure to install [extensions](#visual-studio-code-extensions)
- [Visual Studio for Mac](https://visualstudio.microsoft.com/vs/mac/) - Pretty good at C# (Server
  and Mobile)
- [Xcode](https://developer.apple.com/xcode/) - required for iOS Mobile development and Safari web
  extension

### Local environment

- [Homebrew](https://brew.sh/) - package manager for macOS
- [Iterm2](https://iterm2.com/) (available via Homebrew) - a better terminal emulator
- Various browsers - It’s nice to have a slew of browsers ready to test the extension in a host of
  scenarios. You can also use multiple browsers to have different browser extension version
  installed to compare them.
- [Docker](https://docs.docker.com/get-docker/) - required for server development only
- [PowerShell](https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell-core-on-macos)
  (available via Homebrew: `brew install powershell`)
- [NodeJS](https://nodejs.org/) v16 (preferably using a [node version manager][nvm])
- [NPM](https://www.npmjs.com/) v8 (included with Node)
- [Rust](https://www.rust-lang.org/tools/install) - Used for native desktop components
- [Git](https://git-scm.com)
  - [Commit signing](../../contributing/commit-signing.mdx) is required for all _Bitwarden
    contributors_ and is strongly encouraged for _community contributors_.

### Mobile

- [Android Studio](https://developer.android.com/studio/) - Nice for setting up and running Android
  Simulators
- [adb](https://developer.android.com/studio/command-line/adb) - for interacting with Android sims

### Databases

- [Azure Data Studio](https://docs.microsoft.com/en-us/sql/azure-data-studio/download-azure-data-studio)
  for working with your local SQL Server
- [PgAdmin4](https://www.pgadmin.org/) - Useful for fiddling with PostgreSQL db
- [MySQLWorkbench](https://www.mysql.com/products/workbench/) - Useful for fiddling with MySQL db

### Visual Studio Code Extensions

Visual Studio Code Extensions

There are some vs code extensions that are life-savers in our line of work. A list of highly
recommended ones include the following:

- General
  - [Back & Forth](https://marketplace.visualstudio.com/items?itemName=nick-rudenko.back-n-forth) -
    Adds forward and back buttons to top right of your editor. Simple, but I love it.
  - [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) -
    can be annoying, but has saved me lots of `tmes form writting oragnizations.`
  - [LiveShare](https://marketplace.visualstudio.com/items?itemName=MS-vsliveshare.vsliveshare) -
    For pair programming
- C#
  - [C#](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp) - Omnisharp
    integrations
  - [.NET Core Test Explorer](https://marketplace.visualstudio.com/items?itemName=formulahendry.dotnet-test-explorer) -
    Test explorer for .NET tests
  - [.NET Core User Secrets](https://marketplace.visualstudio.com/items?itemName=adrianwilczynski.user-secrets) -
    Edit secrets files by right clicking on a .proj and selecting edit user -secrets
- Git
  - [Git Graph](https://marketplace.visualstudio.com/items?itemName=mhutchie.git-graph) - fantastic
    git visualization tool
  - [Git History](https://marketplace.visualstudio.com/items?itemName=donjayamanne.githistory) -
    More Git history
  - [Git Lens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens) - Even more Git
    options
- Typescript / Angular
  - [Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template) -
    Understands Angular templates
  - [Jest](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest) - Jest test runner
  - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) -
    integrate with prettier code formatting
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) -
    Integrations for ESLint
- Rust
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=matklad.rust-analyzer) -
    Great rust language server
  - [Even Better TOML](https://marketplace.visualstudio.com/items?itemName=tamasfe.even-better-toml) -
    for handling TOML (cargo config)
  - [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb) - for rust
    debugging
- Databases
  - [MySQL Syntax](https://marketplace.visualstudio.com/items?itemName=jakebathman.mysql-syntax) -
    syntax highlighting for MySQL
  - [PostgreSQL](https://marketplace.visualstudio.com/items?itemName=ckolkman.vscode-postgres) -
    syntax highlighting for PostgreSQL

## Optional tools

The following tools may be useful depending on your preferences or what you’re developing.

- [JetBrains Rider](https://www.jetbrains.com/rider/) ($) - an alternative to Visual Studio and/or
  Visual Studio Code
- [Microsoft Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/) -
  for connecting to or working with local Azure table storage and queues
- [Parallels](https://www.parallels.com/) - For running Windows VMs
- [Sourcetree](https://www.sourcetreeapp.com/) - Git GUI. Note: For the git hooks to behave
  correctly on macOS when using nvm, please follow
  [these instructions](https://typicode.github.io/husky/#/?id=command-not-found).

[nvm]: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
