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
assistance. However, AI tools complement—rather than replace—human oversight and decision-making.

While AI tools enhance developer productivity and help identify potential issues, all code
contributions to Bitwarden undergo thorough human review and approval by the Bitwarden engineering
team.

Every contribution, whether created with or without AI assistance, must meet strict security and
quality standards, align with Bitwarden's core architecture, and be thoroughly tested before being
merged.

This ensures that the final decision-making and quality assurance remain firmly in the hands of our
security-conscious development team. Contributors can be confident that all merged code has been
carefully vetted by the Bitwarden team, regardless of the tools used to create it.

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

## MCP servers and extensions

Model Context Protocol (MCP) servers extend Claude's capabilities by providing access to external
tools, APIs, and data sources. They enable Claude to interact with your development environment,
databases, and other services while maintaining security boundaries.

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

<Bitwarden>
## Using Claude for code reviews

### Our goals: Why are we using Claude for code reviews?

The goals of using Claude code reviews at Bitwarden are to:

1. Improve the overall code product, and
2. Reduce the time a human needs to spend reviewing code

### Measurement: How are we gauging success?

We are currently assessing progress toward these goals through:

- Internal feedback gathered from the Engineering organization
- Gathering anecdotal evidence from PR **reviewers** as to a positive effect this has on the effort
  that they need to apply to reviews and the amount of feedback they need to recommend.
- Gathering anecdotal evidence from PR **authors** on on things that Claude is catching that would
  otherwise either make it into `main` or have to be caught by human reviewers.

We do not currently have any metrics in place to measure PR throughput at an aggregate level. We may
in the future, but we don't now.

## Recommended pull request workflow using Claude

### Step 1: Local code review

During the course of your local development, we recommend that you use the local Claude code review
slash command - `/code-review-local` - installed from our
[marketplace](#bitwarden-ai-plugin-marketplace). This can be done multiple times as your code
evolves, as well as immediately prior to opening a pull request.

The goal of local review is to provide allow you to address any feedback incrementally earlier in
the SDLC, minimizing the need for feedback when the changes are in a final form on the pull request.

Keep in mind that local review feedback is not visible to others, and so there are disadvantages to
using only local reviews; we miss the opportunity to see Claude's review feedback in a more public
forum, where others can learn from it and consider it in their review.

For full instructions on `/code-review-local`, see the `README` in the
[marketplace repository](https://github.com/bitwarden/ai-plugins).

### Step 2: Request Claude review on a draft pull request

We recommend that you then use the `ai-review` label to request Claude review on a draft pull
request containing your work.

The guidance is that you request the review on a draft pull request so that the PR author can
address Claude's feedback _before_ `CODEOWNERS` automatically requests reviews from teams when the
pull request is opened.

Due to limitations inherent to the `labeled` action and the inability to trigger workflows based on
it, we recommend one of the following two options to get the review on your pull request:

1. **Add label along with initial push.** In this case, you would make all of your changes locally,
   and then push a draft PR with the label on it. This push would trigger the Claude review action.
2. **Add the label after incremental pushes.** In this case, you would create a draft PR and push
   changes incrementally to it as you work. Then, as you near completion of your work, you would add
   the `ai-review` label. **However, in this case, you have to have some other workflow-triggering
   action _after_ you add the label, so that the Claude review workflow will have a chance to run.**

:::tip What if I already addressed feedback locally?

As the local feedback from Claude is not visible to human reviewers, and may differ based on local
Claude context, we currently recommend that you use the `ai-review` label for more consistent and
visible reviews. There is value in having more eyes on Claude's feedback as the pull request goes
through review, to ensure that we deliver the highest-quality code and nothing is missed.

:::

### Step 4: Address Claude's feedback

After Claude has reviewed your pull request, you should evaluate its feedback. If you judge that the
feedback is valid, you should make the changes before opening the PR for review.

For feedback that is not addressed, you can optionally use the opportunity to explain why it wasn't
addressed as input to the future reviewers as they look at the changes.

### Step 5: Open the PR for review

When you have addressed any Claude feedback that you judge is necessary, open the PR for review.
</Bitwarden>
