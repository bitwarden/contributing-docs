---
sidebar_position: 1
---

# Tools

:::warning Operating system assumptions

The tooling recommendations and instructions in this documentation assume that you’re using macOS.
This may require some adaptation if you’re using a different operating system.

:::

The following tools are strongly recommended as part of the “standard” developer setup. We recommend
that any new Bitwarden developer install all of them as part of setting up their local development
environment.

## IDEs

- [Visual Studio Code](https://code.visualstudio.com/) - used for all Typescript projects.
  Suboptimal for C#. Be sure to install [extensions](#visual-studio-code-extensions)
- [JetBrains Rider](https://www.jetbrains.com/rider/download/) - fully featured IDE for C#, .NET &
  more. Bitwarden developers should contact IT for a license
- [Xcode](https://developer.apple.com/xcode/) - required for iOS Mobile development and Safari web
  extension

## Local environment

- [Homebrew](https://brew.sh/) - package manager for macOS
- [Iterm2](https://iterm2.com/) (available via Homebrew) - a better terminal emulator
- Various browsers - It’s nice to have a slew of browsers ready to test the extension in a host of
  scenarios. You can also use multiple browsers to have different browser extension version
  installed to compare them.
- [Docker](https://docs.docker.com/get-docker/) - required for server development only
- [.NET SDK](https://dotnet.microsoft.com/download) - required for server and other backend
  development environments
- [PowerShell](https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell-core-on-macos)
  (available via Homebrew: `brew install powershell`)
- [NodeJS](https://nodejs.org/) v22 (preferably using a [node version manager][nvm])
- [NPM](https://www.npmjs.com/) v10 (included with Node)
- [Rust](https://www.rust-lang.org/tools/install) latest stable version - (preferably installed via
  [rustup](https://rustup.rs/))
- [Git](https://git-scm.com)
  - [Commit signing](../../contributing/commit-signing.mdx) is strongly recommended

## Mobile

- [Android Studio](https://developer.android.com/studio/) - Nice for setting up and running Android
  Simulators
- [adb](https://developer.android.com/studio/command-line/adb) - for interacting with Android sims
- [Apple Icons Generator Gist](https://gist.github.com/brutella/0bcd671a9e4f63edc12e) - Script to
  generate Apple icons from an image

## Databases

- [MSSQL VSCode Extension](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql) for
  working with your local SQL Server
- [PgAdmin4](https://www.pgadmin.org/) - Useful for fiddling with PostgreSQL db
- [MySQLWorkbench](https://www.mysql.com/products/workbench/) - Useful for fiddling with MySQL db
- [SQLiteStudio](https://www.sqlitestudio.pl/) - Useful for fiddling with SQLite db

## Visual Studio Code extensions

There are some vs code extensions that are life-savers in our line of work. A list of highly
recommended ones include the following:

- General
  - [Back & Forth](https://marketplace.visualstudio.com/items?itemName=nick-rudenko.back-n-forth) -
    Adds forward and back buttons to top right of your editor. Simple, but incredibly useful.
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
  - [Nx Console](https://marketplace.visualstudio.com/items?itemName=nrwl.angular-console) - UI over
    the Nx CLI
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

<Bitwarden>

## AI tools

:::tip

To learn more about how we use AI tools at Bitwarden, see our [AI](../../contributing/ai.md)
documentation. This page specifies how to configure AI tooling for development.

:::

### Claude Code

We use Claude Code as our primary AI tool for development workflows, including planning work,
exploring the codebase, and proposing solutions.

#### Installation

Follow the installation instructions [here](https://code.claude.com/docs/en/quickstart) for your OS
and interface of choice. When prompted, sign into the Anthropic Console via SSO and authenticate
your local client.

Depending on your IDE of choice, you may also want to integrate Claude Code into your development
environment. See [VS Code](https://code.claude.com/docs/en/vs-code) instructions, for example.

#### Basic usage

We recommend that you start with
[common workflows](https://code.claude.com/docs/en/common-workflows) and
[best practices](https://code.claude.com/docs/en/best-practices) from Anthropic to understand how to
use Claude Code.

### Bitwarden AI plugin marketplace

Bitwarden maintains a curated [marketplace of AI plugins](https://github.com/bitwarden/ai-plugins)
specifically designed for our development workflows. This marketplace was created to provide
quality-controlled, security-reviewed plugins that follow Bitwarden's coding standards and security
requirements. All marketplace plugins are maintained by the Bitwarden team and include comprehensive
documentation, testing, and security validation.

You should install the marketplace plugins using the `/plugin` command:

```bash
/plugin marketplace add bitwarden/ai-plugins
```

</Bitwarden>

## Optional tools

The following tools may be useful depending on your preferences or what you’re developing.

- [Microsoft Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/) -
  for connecting to or working with local Azure table storage and queues
- [Parallels](https://www.parallels.com/) - For running Windows VMs
- [Sourcetree](https://www.sourcetreeapp.com/) - Git GUI. Note: For the git hooks to behave
  correctly on macOS when using nvm, please follow
  [these instructions](https://typicode.github.io/husky/#/?id=command-not-found).

[nvm]: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
