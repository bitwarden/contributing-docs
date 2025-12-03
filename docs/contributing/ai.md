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

While AI tools enhance developer productivity and help identify potential issues, all code
contributions to Bitwarden undergo thorough human review and approval by the Bitwarden engineering
team. Every contribution, whether created with or without AI assistance, must meet strict security
and quality standards, align with Bitwarden's core architecture, and be thoroughly tested before
being merged. This ensures that the final decision-making and quality assurance remain firmly in the
hands of our security-conscious development team. Contributors can be confident that all merged code
has been carefully vetted by Bitwarden engineers, regardless of the tools used to create it.

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

#### Basic usage

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

## MCP servers

Model Context Protocol (MCP) servers extend Claude's capabilities by providing access to external
tools, APIs, and data sources. They enable Claude to interact with your development environment,
databases, and other services while maintaining security boundaries.

### Understanding MCP servers

MCP servers are separate processes that communicate with Claude through a standardized protocol.
They can:

- Access local file systems and databases
- Execute commands and scripts
- Integrate with third-party APIs
- Provide specialized reasoning capabilities

We recommend at least two be installed by everyone:

### Installing Sequential Thinking MCP server

The Sequential Thinking server enhances Claude's problem-solving capabilities by providing
structured, step-by-step reasoning for complex tasks.

#### Claude Code

```bash
claude mcp add --scope user sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
```

#### Claude Desktop

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

### Installing Memory MCP server

The Memory server provides Claude with persistent memory capabilities, allowing it to remember
context across sessions and maintain a knowledge graph of your projects.

#### Claude Code

```bash
claude mcp add --scope user memory -- npx -y @modelcontextprotocol/server-memory
```

#### Claude Desktop

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

### Verifying installations

#### Claude Code

```bash
claude mcp list
```

#### Claude Desktop

1. Open Claude Desktop
2. Start a new conversation
3. Type: "Can you list your available MCP servers?"
4. Claude should respond with the configured servers

### Troubleshooting

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

### Best practices

**Security considerations**:

- Only install MCP servers from trusted sources
- Review server permissions and capabilities before installation:
  - Examine the server's source code or documentation to understand what file system access it
    requires
  - Verify what external APIs or services the server connects to
  - Check if the server executes system commands and understand which ones
  - Confirm whether the server stores persistent data and where it's stored
  - Review network permissions and ensure the server only communicates with expected endpoints
  - Validate that the server follows principle of least privilege
- Use trusted LLM providers and models:
  - Prefer established providers with strong security track records (e.g., Anthropic)
  - Verify the provider's data handling policies and ensure they align with Bitwarden's security
    requirements
  - Confirm that your API keys and credentials are stored securely
  - Understand whether your prompts and code are used for model training (opt out if possible)
  - Use enterprise or business tier services when available for enhanced security guarantees
- Core model usage guidelines:
  - Use the latest stable model versions to benefit from security improvements and bug fixes
  - Avoid deprecated or experimental models in production workflows
  - Be aware of model capabilities and limitations - not all models are suitable for code generation
  - Consider model context windows and token limits when designing workflows
  - Use model-specific features (like Claude's extended thinking) appropriately for complex tasks
  - Monitor model output for hallucinations or incorrect information, especially in
    security-critical code
- Regularly update servers to get security patches

**Performance optimization**:

- Limit the number of active servers to those you actively use
- Monitor resource usage, especially for memory-intensive servers
- Configure appropriate timeouts for long-running operations

**Data management**:

- Regularly backup memory server data directories
- Clear old session data periodically to maintain performance
- Use project-specific memory contexts when appropriate

**Integration with development workflow**:

- Configure project-specific MCP servers in repository `.claude/` directories
- Document custom MCP server requirements in project README files
- Share MCP configurations with team members for consistency
