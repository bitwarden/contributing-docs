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

:::tip Setting up AI tooling

To set up AI tooling in your development environment, see the
[AI Tools](./../getting-started/tools/index.md#ai-tools) instructions of our Getting Started
section.

:::

## Contributing Claude context

Every time you catch Claude making the same mistake twice, explain the same convention in chat, or
hand a teammate a mental map they did not have, that is knowledge worth encoding. This section
covers what belongs in a repository's `.claude/` directory, where to put it, and how to land it
alongside the code it describes.

### Decide where the knowledge belongs

Ask whether the knowledge is specific to one codebase or generic enough to work across repositories.

- **Specific to one codebase**: contribute it to that repository's `.claude/` directory. Examples
  include how a new module is added in that codebase, or how its feature-flag system works.
- **Generic and reusable across repositories**: contribute it to
  [bitwarden/ai-plugins](https://github.com/bitwarden/ai-plugins) as a persona plugin, a tool
  integration, or a shared utility.

When unsure, keep it in the repository. Promoting it to `ai-plugins` later is easier than pulling it
back; see the
[ai-plugins contributing guide](https://github.com/bitwarden/ai-plugins/blob/main/CONTRIBUTING.md)
when you are ready.

### Choose a scope

Claude loads every `CLAUDE.md` and `CLAUDE.local.md` by
[walking up from the working directory](https://code.claude.com/docs/en/memory#how-claude-md-files-load),
checking both `CLAUDE.md` and `.claude/CLAUDE.md` in each ancestor. Files below the working
directory, including nested `.claude/skills/`, load lazily when Claude reads into that subtree. Use
that hierarchy:

- Applies everywhere in the repository: `CLAUDE.md` or `.claude/CLAUDE.md` at the repository root,
  or `.claude/skills/`. Several repositories use the `.claude/` location rather than a root file, so
  check which one your repository already has before adding another.
- Applies only within one app, library, utility, or subtree: a nested `CLAUDE.md` or
  `.claude/skills/` in that directory.

Push rules as deep as they will go. Keeping app-specific rules local saves context for everyone
else's sessions, not just yours.

For rules that apply only to certain file types, use
[`.claude/rules/<name>.md` with a `paths:` frontmatter glob](https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/)
instead of a nested `CLAUDE.md`.

### Choose a shape

| You want to                                             | Use                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| State a rule Claude must always follow in its scope     | `CLAUDE.md`                                                                                |
| State a rule that applies only to certain file globs    | `.claude/rules/<name>.md` with `paths:` frontmatter                                        |
| Teach a procedure Claude invokes on demand              | `.claude/skills/<name>/SKILL.md`                                                           |
| Give Claude a specialized subagent with its own context | `.claude/agents/<name>.md`, with `name` and `description` required in the YAML frontmatter |
| Add a user-invocable slash command                      | `.claude/commands/<name>.md`                                                               |
| Trigger a shell script on a Claude Code event           | `.claude/hooks/<name>.sh`, registered per developer in `.claude/settings.local.json`       |

If Claude only needs it sometimes, it is a skill. Once a `CLAUDE.md` loads it stays in context for
the rest of the session, so keep each one lean, especially the root.

Hook scripts are committed so the whole team can use them, but registration stays in each
developer's gitignored `.claude/settings.local.json`, which means a hook you add is opt-in for
everyone else rather than automatic.

### Security conventions

Skills and agents that touch vault data, authentication, or cryptography must use Bitwarden's
[core vocabulary](../architecture/security/definitions.mdx) (Vault Data, Protected Data, Secure
Channel, and so on) and restate the zero-knowledge invariant inline. Subagents run in a fresh
context and do not inherit a repository's `CLAUDE.md`, so include the relevant definitions directly
in the agent's system prompt.

### What good contributions look like

- **Grounded in the code.** Real files, real patterns, real commands. If it could apply to any
  repository, it belongs in `ai-plugins`.
- **Describes the what and the why, not the who.** Avoid team-persona framing. Describe the domain
  and its constraints; the team is an implementation detail.
- **Short and specific.** 2,000 words of general advice is not a skill.
- **Active voice and direct language.** "Invoke this skill when...", not "This skill may be invoked
  when...".
- **Reviewed like code.** Teams of domain experts own `.claude/` in their areas, shaping how Claude
  behaves for everyone who works there, so treat changes with the same seriousness as source.

### Anti-patterns

- **Team-persona agents**, such as "Team ABC engineer". If a team's process is unique enough to
  warrant a persona, that is an SDLC signal to address rather than a persona to encode.
- **Root-level rules that only matter in one subtree.** If a rule only ever applies to a single
  subtree, it belongs in a nested `CLAUDE.md` next to that subtree.
- **Duplicating `ai-plugins` content.** Check the existing plugin skills before writing a new one.
- **Generic advice disguised as repository-local knowledge.** "Write good tests" is not
  repository-specific. "Our integration tests must hit a real database because..." is.

### Build a contribution

The Claude Code ecosystem moves quickly, so last session's habits may already be out of date.

1. Refresh on the canonical documentation before you begin:
   - [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) for the mental
     model.
   - [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) for what
     Anthropic recommends.
   - [Extend Claude Code](https://code.claude.com/docs/en/features-overview) for what you can build.
   - [The complete guide to building skills for Claude](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf),
     essential reading before authoring a skill.
2. Survey the landscape. Skim the target repository's `.claude/` tree and
   [bitwarden/ai-plugins](https://github.com/bitwarden/ai-plugins), then match the voice you find.
   Your contribution should read like its neighbors.
3. Build iteratively. When authoring a skill, start with the `skill-creator` command:

   ```
   /skill-creator:skill-creator
   ```

   It runs a draft, test, review, and refine loop with benchmark statistics and a side-by-side
   reviewer, so the skill has been exercised against concrete inputs before you open the pull
   request. For agents, commands, hooks, and `CLAUDE.md` entries, adapt an existing one in the
   repository rather than inventing a new structure.

4. Validate before you push. Run a local Bitwarden Claude Code review, which writes findings to
   files so you can fix them before pushing without posting anything to GitHub:

   ```
   /bitwarden-code-review:code-review-local
   ```

5. Open the pull request. A non-draft pull request receives a Claude Code review automatically, once
   per pull request, with no label needed. Apply the `ai-review` label to review a draft, or to
   request another review after one has already posted. The label keeps working on every push, so
   remove it once you have the review you wanted.
