---
sidebar_position: 1
---

# Tools

:::warning Operating System Assumptions

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

## AI tools

### Claude Code

Claude Code is Anthropic's official CLI tool that brings Claude's capabilities directly to your
terminal. It's ideal for developers who prefer command-line interfaces and want to integrate AI
assistance into their terminal-based workflows.

#### Installation

1. [Node.js](https://nodejs.org/) v18 or higher is available
2. Install via NPM `npm install -g @anthropic-ai/claude-code` or Homebrew
   `brew install --cask claude-code`
3. Configure your API key:

   ```bash
   claude configure
   ```

   Walk through the process to sign into the Anthropic Console via SSO and authenticate your local
   client.

#### Basic usage

```bash
# Start an interactive session
claude

# Ask a question
claude "How do I add a feature flag around my changes?"
```

### Claude Desktop

Claude Desktop provides a graphical interface for interacting with Claude, ideal for developers who
prefer a dedicated application with rich formatting and file management capabilities.

#### Installation

Install via [claude.ai/download](https://claude.ai/download) or Homebrew `brew install claude`

- Launch Claude Desktop
- Sign in with your Anthropic account via SSO
- Configure your workspace preferences
- Enable MCP server connections in Settings → Developer → MCP Servers

### Bitwarden AI plugin marketplace

Bitwarden maintains a curated [marketplace of AI plugins](https://github.com/bitwarden/ai-plugins)
specifically designed for our development workflows. This marketplace was created to provide
quality-controlled, security-reviewed plugins that follow Bitwarden's coding standards and security
requirements. All marketplace plugins are maintained by the Bitwarden team and include comprehensive
documentation, testing, and security validation.

To use the marketplace with Claude Code:

```bash
/plugin marketplace add bitwarden/ai-plugins
```

### MCP servers

We recommend that you install two MCP servers:

- Sequential Thinking
- Memory

:::warning MCP Server Security

See [here](../../contributing/ai/#mcp-servers) for background on what an MCP server is and for
important security considerations. Read this before installing any other MCP servers.

:::

#### Sequential Thinking MCP server

The Sequential Thinking server enhances Claude's problem-solving capabilities by providing
structured, step-by-step reasoning for complex tasks.

##### Claude Code

```bash
claude mcp add --scope user sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
```

##### Claude Desktop

Edit your `~/.claude.json`, go to the `mcpServers` section and add:

```json
"sequential-thinking": {
   "type": "stdio",
   "command": "npx",
   "args": [
      "-y",
      "@modelcontextprotocol/server-sequential-thinking"
   ]
   }
```

Restart Claude Desktop to activate the server.

#### Memory MCP server

The Memory server provides Claude with persistent memory capabilities, allowing it to remember
context across sessions and maintain a knowledge graph of your projects.

##### Claude Code

```bash
claude mcp add --scope user memory -- npx -y @modelcontextprotocol/server-memory
```

##### Claude Desktop

Edit your `~/.claude.json`, go to the `mcpServers` section and add:

```json
"memory": {
   "type": "stdio",
   "command": "npx",
   "args": [
      "-y",
      "@modelcontextprotocol/server-memory"
   ]
   }
```

Restart Claude Desktop to activate the server.

#### Verifying MCP installations

##### Claude Code

```bash
claude mcp list
```

##### Claude Desktop

1. Open Claude Desktop
2. Start a new conversation
3. Type: "Can you list your available MCP servers?"
4. Claude should respond with the configured servers

#### Troubleshooting

Common issues and solutions:

**Server not starting**:

- Verify NPM packages are installed globally
- Check Node version (must be 18+)
- Review server logs in `~/.claude-code/logs/` or Claude Desktop's developer console

**Permission errors**:

- Ensure data directories have proper permissions
- On macOS/Linux: `chmod 755 ~/.claude-memory`

**Configuration not loading**:

- Validate JSON syntax in configuration files
- Restart Claude Code or Claude Desktop after configuration changes

## Optional tools

The following tools may be useful depending on your preferences or what you’re developing.

- [Microsoft Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/) -
  for connecting to or working with local Azure table storage and queues
- [Parallels](https://www.parallels.com/) - For running Windows VMs
- [Sourcetree](https://www.sourcetreeapp.com/) - Git GUI. Note: For the git hooks to behave
  correctly on macOS when using nvm, please follow
  [these instructions](https://typicode.github.io/husky/#/?id=command-not-found).

[nvm]: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
