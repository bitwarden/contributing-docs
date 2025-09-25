---
sidebar_custom_props:
  access: bitwarden
---

# AI

## Background

At Bitwarden we leverage artificial intelligence tools to enhance developer productivity, improve
code quality, and accelerate our development cycles. Our adoption of AI tooling is driven by several
key objectives:

**Enhanced Developer Productivity**: AI assistants help automate repetitive tasks, generate
boilerplate code, and provide intelligent code completions, allowing developers to focus on complex
problem-solving and architectural decisions.

**Code Quality and Consistency**: AI tools assist in maintaining coding standards, identifying
potential bugs, and suggesting improvements that align with our established best practices and
patterns.

**Knowledge Sharing**: AI assistants serve as intelligent documentation companions, helping
developers quickly understand unfamiliar codebases, APIs, and frameworks used across our projects.

**Accelerated Onboarding**: New team members can leverage AI tools to quickly understand our
codebase structure, conventions, and development workflows, reducing the time needed to become
productive contributors.

**Security-First Approach**: We carefully select and configure AI tools that align with our security
requirements, ensuring that sensitive code and data remain protected while still benefiting from AI
assistance.

Our primary AI tooling stack centers around Anthropic's Claude, which offers both a powerful
language model and flexible integration capabilities through the Model Context Protocol (MCP). This
allows us to create custom workflows and integrate with our existing development tools while
maintaining control over data privacy and security.

## Installing Claude Code and Claude Desktop

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
   claude-code configure
   ```

   Walk through the process to sign into the Anthropic Console via SSO and authenticate your local
   client.

#### Basic Usage

```bash
# Start an interactive session
claude-code

# Ask a question
claude-code "How do I add a feature flag around my changes?"
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

## MCP Servers

Model Context Protocol (MCP) servers extend Claude's capabilities by providing access to external
tools, APIs, and data sources. They enable Claude to interact with your development environment,
databases, and other services while maintaining security boundaries.

### Understanding MCP Servers

MCP servers are separate processes that communicate with Claude through a standardized protocol.
They can:

- Access local file systems and databases
- Execute commands and scripts
- Integrate with third-party APIs
- Provide specialized reasoning capabilities

We recommend at least two be installed by everyone:

### Installing Sequential Thinking MCP Server

The Sequential Thinking server enhances Claude's problem-solving capabilities by providing
structured, step-by-step reasoning for complex tasks.

#### For Claude Code

1. **Install the server**:

   ```bash
   npm install -g @anthropic-ai/mcp-server-sequential-thinking
   ```

2. **Configure in Claude Code**: Create or edit `~/.claude-code/mcp.json`:

   ```json
   {
     "servers": {
       "sequential-thinking": {
         "command": "npx",
         "args": ["@anthropic-ai/mcp-server-sequential-thinking"],
         "env": {}
       }
     }
   }
   ```

#### For Claude Desktop

1. **Install the server**:

   ```bash
   npm install -g @anthropic-ai/mcp-server-sequential-thinking
   ```

2. **Configure in Claude Desktop**:
   - Open Claude Desktop
   - Navigate to Settings → Developer → MCP Servers
   - Click "Add Server"
   - Enter the following configuration:
     - Name: `sequential-thinking`
     - Command: `npx`
     - Arguments: `@anthropic-ai/mcp-server-sequential-thinking`
   - Click "Save"

3. **Restart Claude Desktop** to activate the server

### Installing Memory MCP Server

The Memory server provides Claude with persistent memory capabilities, allowing it to remember
context across sessions and maintain a knowledge graph of your projects.

#### For Claude Code

1. **Install the server**:

   ```bash
   npm install -g @anthropic-ai/mcp-server-memory
   ```

2. **Create a data directory**:

   ```bash
   mkdir -p ~/.claude-memory
   ```

3. **Configure in Claude Code**: Create or edit `~/.claude-code/mcp.json`:

   ```json
   {
     "servers": {
       "sequential-thinking": {
         "command": "npx",
         "args": ["@anthropic-ai/mcp-server-sequential-thinking"],
         "env": {}
       },
       "memory": {
         "command": "npx",
         "args": ["@anthropic-ai/mcp-server-memory"],
         "env": {
           "MEMORY_DATA_DIR": "~/.claude-memory"
         }
       }
     }
   }
   ```

#### For Claude Desktop

1. **Install the server**:

   ```bash
   npm install -g @anthropic-ai/mcp-server-memory
   ```

2. **Create a data directory**:

   ```bash
   # macOS/Linux
   mkdir -p ~/.claude-memory

   # Windows
   mkdir %USERPROFILE%\.claude-memory
   ```

3. **Configure in Claude Desktop**:
   - Open Settings → Developer → MCP Servers
   - Click "Add Server"
   - Enter the following configuration:
     - Name: `memory`
     - Command: `npx`
     - Arguments: `@anthropic-ai/mcp-server-memory`
     - Environment Variables:
       - Key: `MEMORY_DATA_DIR`
       - Value: `~/.claude-memory` (or `%USERPROFILE%\.claude-memory` on Windows)
   - Click "Save"

4. **Restart Claude Desktop** to activate the server

### Verifying Installations

#### Claude Code Verification

```bash
# List all configured servers
claude-code mcp list

# Test a specific server
claude-code mcp test sequential-thinking
claude-code mcp test memory
```

#### Claude Desktop Verification

1. Open Claude Desktop
2. Start a new conversation
3. Type: "Can you list your available MCP servers?"
4. Claude should respond with the configured servers

### Troubleshooting

Common issues and solutions:

1. **Server not starting**:
   - Verify NPM packages are installed globally
   - Check Node version (must be 18+)
   - Review server logs in `~/.claude-code/logs/` or Claude Desktop's developer console

2. **Permission errors**:
   - Ensure data directories have proper permissions
   - On macOS/Linux: `chmod 755 ~/.claude-memory`

3. **Configuration not loading**:
   - Validate JSON syntax in configuration files
   - Restart Claude Code or Claude Desktop after configuration changes

4. **Memory server not persisting data**:
   - Verify `MEMORY_DATA_DIR` path exists and is writable
   - Check disk space availability

### Best Practices

1. **Security Considerations**:
   - Only install MCP servers from trusted sources
   - Review server permissions and capabilities before installation
   - Regularly update servers to get security patches

2. **Performance Optimization**:
   - Limit the number of active servers to those you actively use
   - Monitor resource usage, especially for memory-intensive servers
   - Configure appropriate timeouts for long-running operations

3. **Data Management**:
   - Regularly backup memory server data directories
   - Clear old session data periodically to maintain performance
   - Use project-specific memory contexts when appropriate

4. **Integration with Development Workflow**:
   - Configure project-specific MCP servers in repository `.claude/` directories
   - Document custom MCP server requirements in project README files
   - Share MCP configurations with team members for consistency
