---
sidebar_position: 1
---

# Claude Code

Claude Code reads each Bitwarden repository's `.claude/` directory for the rules and skills that
apply to that codebase, and the plugins in `bitwarden-marketplace` add the ones that work across
repositories. This page explains how to install Claude Code and add the Bitwarden plugins.

**Audience:** Developers setting up Claude Code to work on Bitwarden code, including community
contributors.

:::info Before you start

<Bitwarden>

You need a Claude Code license. Sign in to the Anthropic Console with SSO.

</Bitwarden>

<Community>

You need an account that can use Claude Code: a Claude subscription, a Claude Console account, or
access through a supported cloud provider. Anthropic's
[quickstart](https://code.claude.com/docs/en/quickstart) lists them.

</Community>

:::

## Setup

1. Install Claude Code by following Anthropic's
   [quickstart](https://code.claude.com/docs/en/quickstart), and sign in when prompted.
2. Add Claude Code to your IDE. Anthropic has setup instructions for
   [VS Code](https://code.claude.com/docs/en/vs-code) and
   [JetBrains IDEs](https://code.claude.com/docs/en/jetbrains).
3. Start Claude Code in a Bitwarden repository and trust the folder when prompted. Many repositories
   add `bitwarden-marketplace` in their `.claude/settings.json`, which applies only after you trust
   the folder.
4. Open the plugin manager and check that `bitwarden-marketplace` is listed under **Marketplaces**.

   ```text
   /plugin
   ```

   If it is missing, add it as the
   [Usage section of the ai-plugins README](https://github.com/bitwarden/ai-plugins#usage) shows.

5. Install the plugins you need, as
   [Installing plugins](https://github.com/bitwarden/ai-plugins#installing-plugins) in the README
   shows. The README's plugin table says what each plugin does, and each plugin's README lists what
   it requires.
6. Load the plugins. Restart Claude Code, or run this in a session that is already open:

   ```text
   /reload-plugins
   ```

7. Turn on auto-update for `bitwarden-marketplace`, as
   [Keeping plugins up to date](https://github.com/bitwarden/ai-plugins#keeping-plugins-up-to-date)
   in the README describes, so your plugins update when Claude Code starts.

## Key concepts

| Term       | What it is                                                                                                          | You                |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Plugin     | The unit you install from a marketplace. It bundles agents, skills, and sometimes an MCP server, and has a version. | Install it         |
| Agent      | A role with its own instructions and tools that Claude hands a task to.                                             | Delegate to it     |
| Skill      | Instructions for one task. Claude loads it when your request matches its description, or you invoke it by name.     | Trigger it         |
| MCP server | A connector that gives Claude access to an outside system, such as Jira or Confluence.                              | Connect through it |

Anthropic's [Glossary](https://code.claude.com/docs/en/glossary) defines the other terms Claude Code
uses, such as hooks, subagents, and compaction.

## Where to go next

- The [ai-plugins README](https://github.com/bitwarden/ai-plugins#available-plugins) lists every
  plugin in the marketplace and what it does. Each plugin's `CHANGELOG.md`, in its folder under
  [`plugins/`](https://github.com/bitwarden/ai-plugins/tree/main/plugins), lists what changed in
  each version.
- [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) explains Claude
  Code's agentic loop, what Claude can access, and how sessions and the context window work.
- [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) explains how to
  give Claude the context it cannot see, a check to run, and rules it must follow.
- [Manage costs effectively](https://code.claude.com/docs/en/costs) explains how to track and reduce
  token usage.

<Bitwarden>

- [AI Code Review](../../contributing/pull-requests/ai-code-review.md) explains which local review
  fits your change, the reviews that run on your pull request, and when your work on it is complete.
- [Claude context](../../contributing/ai/contributing-claude-context.md) explains how to teach
  Claude about a codebase.
- The [AI](../../contributing/ai/index.md) section explains how Bitwarden uses AI and what is
  expected of you.

</Bitwarden>
