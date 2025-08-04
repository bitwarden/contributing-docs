---
sidebar_position: 1
---

# Tools

## Operating system

All Bitwarden developers are issued with a MacBook or Windows laptop. The tooling recommendations
and instructions in this documentation assume that you’re using one of these operating systems,
noting where a tool may apply to only one of them.

This may require some adaptation if you’re using a different operating system.

## Recommended tools

The following tools are strongly recommended as part of the "standard" developer setup. We recommend
that any new Bitwarden developer install all of them as part of setting up their local development
environment.

### IDEs

| Tool                                                         | How we use it                                                                                                         |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [JetBrains Rider](https://www.jetbrains.com/rider/download/) | Fully featured IDE for C#, .NET & more. Bitwarden developers should contact IT for a license.                         |
| [Visual Studio](https://visualstudio.microsoft.com/)         | Used for C# development on Windows.                                                                                   |
| [Visual Studio Code](https://code.visualstudio.com/)         | Used for all Typescript projects. Suboptimal for C#. Be sure to install [extensions](#visual-studio-code-extensions). |
| [Xcode](https://developer.apple.com/xcode/)                  | Required for iOS Mobile development and Safari web extension.                                                         |

### Local environment

| Tool                                                                                                            | How we use it                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [.NET SDK](https://dotnet.microsoft.com/download)                                                               | Required for server and other back-end development environments.                                                                                                                                   |
| [Docker](https://docs.docker.com/get-docker/)                                                                   | Required for server development only. Bitwarden developers should contact IT for a license for Docker Desktop.                                                                                     |
| [Git](https://git-scm.com)                                                                                      | [Commit signing](../../contributing/commit-signing.mdx) is strongly recommended.                                                                                                                   |
| [Homebrew](https://brew.sh/)                                                                                    | Package manager for macOS.                                                                                                                                                                         |
| [Iterm2](https://iterm2.com/)                                                                                   | A better terminal emulator (available via Homebrew).                                                                                                                                               |
| [NodeJS](https://nodejs.org/)                                                                                   | Check the `engines` in [package.json](https://github.com/bitwarden/clients/blob/main/package.json) for the current version. We recommend using a [node version manager][nvm]).                     |
| [npm](https://www.npmjs.com/)                                                                                   | Check the `engines` in [package.json](https://github.com/bitwarden/clients/blob/main/package.json) for the current version. It is included with NodeJS.                                            |
| [PowerShell](https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell-core-on-macos) | Available via Homebrew on macOS: `brew install powershell`.                                                                                                                                        |
| [Rust](https://www.rust-lang.org/tools/install)                                                                 | We stay on the latest stable version - preferably installed via [rustup](https://rustup.rs/).                                                                                                      |
| Various browsers                                                                                                | It's nice to have a slew of browsers ready to test the extension in a host of scenarios. You can also use multiple browsers to have different browser extension version installed to compare them. |

### Mobile-specific tooling

| Tool                                                                                | How we use it                                       |
| ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| [adb](https://developer.android.com/studio/command-line/adb)                        | For interacting with Android sims.                  |
| [Android Studio](https://developer.android.com/studio/)                             | Nice for setting up and running Android Simulators. |
| [Apple Icons Generator Gist](https://gist.github.com/brutella/0bcd671a9e4f63edc12e) | Script to generate Apple icons from an image.       |

### Databases

| Tool                                                                                             | How we use it                                                           |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [Microsoft Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/) | For connecting to or working with local Azure table storage and queues. |
| [MSSQL VSCode Extension](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql)     | For working with your local SQL Server.                                 |
| [MySQLWorkbench](https://www.mysql.com/products/workbench/)                                      | Useful for fiddling with MySQL db.                                      |
| [PgAdmin4](https://www.pgadmin.org/)                                                             | Useful for fiddling with PostgreSQL db.                                 |
| [SQLiteStudio](https://www.sqlitestudio.pl/)                                                     | Useful for fiddling with SQLite db.                                     |

### Visual Studio Code extensions

There are some VS Code extensions that are very helpful in our codebase. A list of highly
recommended ones include the following:

| Type                 | Extension                                                                                                         | Notes                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| C#                   | [.NET Core Test Explorer](https://marketplace.visualstudio.com/items?itemName=formulahendry.dotnet-test-explorer) | Test explorer for .NET tests.                                                             |
| C#                   | [.NET Core User Secrets](https://marketplace.visualstudio.com/items?itemName=adrianwilczynski.user-secrets)       | Edit secrets files by right clicking on a .proj and selecting "Manage User Secrets".      |
| C#                   | [C#](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp)                                   | Omnisharp integrations.                                                                   |
| Databases            | [MySQL Syntax](https://marketplace.visualstudio.com/items?itemName=jakebathman.mysql-syntax)                      | Syntax highlighting for MySQL.                                                            |
| Databases            | [PostgreSQL](https://marketplace.visualstudio.com/items?itemName=ckolkman.vscode-postgres)                        | Syntax highlighting for PostgreSQL.                                                       |
| General              | [Back & Forth](https://marketplace.visualstudio.com/items?itemName=nick-rudenko.back-n-forth)                     | Adds forward and back buttons to top right of your editor. Simple, but incredibly useful. |
| General              | [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)   | Can be annoying, but has saved lots of `tmes form writting oragnizations.`                |
| General              | [LiveShare](https://marketplace.visualstudio.com/items?itemName=MS-vsliveshare.vsliveshare)                       | For pair programming.                                                                     |
| Git                  | [Git Graph](https://marketplace.visualstudio.com/items?itemName=mhutchie.git-graph)                               | Fantastic git visualization tool.                                                         |
| Git                  | [Git History](https://marketplace.visualstudio.com/items?itemName=donjayamanne.githistory)                        | More Git history.                                                                         |
| Git                  | [Git Lens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens)                                   | Even more Git options.                                                                    |
| Rust                 | [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb)                               | For Rust debugging.                                                                       |
| Rust                 | [Even Better TOML](https://marketplace.visualstudio.com/items?itemName=tamasfe.even-better-toml)                  | For handling TOML (`cargo` config).                                                       |
| Rust                 | [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=matklad.rust-analyzer)                        | Great Rust language server.                                                               |
| Typescript / Angular | [Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template)               | Understands Angular templates.                                                            |
| Typescript / Angular | [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)                              | Integrations for ESLint.                                                                  |
| Typescript / Angular | [Jest](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest)                                      | Jest test runner.                                                                         |
| Typescript / Angular | [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)                            | Integrate with prettier code formatting.                                                  |

## Optional tools

The following tools may be useful depending on your preferences or what you're developing.

| Tool                                         | How we use it                                                                                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Parallels](https://www.parallels.com/)      | For running Windows or Linux VMs on macOS machines.                                                                                                                     |
| [Sourcetree](https://www.sourcetreeapp.com/) | Git GUI. For the Git hooks to behave correctly on macOS when using `nvm`, please follow [these instructions](https://typicode.github.io/husky/#/?id=command-not-found). |

[nvm]: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
