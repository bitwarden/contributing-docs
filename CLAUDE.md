# Bitwarden Contributing Docs - Claude Code Configuration

- **OFTEN** prefer editing existing files over creating new ones
- **ALWAYS** follow the established patterns for frontmatter, conditional content, and structure
- **ALWAYS** validate code and diagram syntax

## Repository structure

- **docs/** - Documentation content organized into three main sections:
  - **getting-started/** - Setup instructions for various Bitwarden projects (clients, server,
    mobile, SDK)
  - **contributing/** - Contribution guidelines including code style, pull requests, testing, and
    database migrations
  - **architecture/** - Technical architecture documentation, ADRs (Architecture Decision Records),
    and deep dives into specific features
- **src/** - Docusaurus custom components and React code
- **static/** - Static assets like images
- **scripts/** - Build and development scripts

## Key technologies

- **Docusaurus** - Static site generator
- **React** - UI framework
- **TypeScript**
- **Node.js**

## Development commands

```bash
npm ci                 # Install dependencies
npm start              # Start local dev server with SSL (requires .env setup)
npm start:insecure     # Start without SSL
npm run build          # Generate static site
npm run prettier       # Format code
npm run lint           # Check code formatting
npm run spellcheck     # Run cspell on Markdown files
npm run typecheck      # Run TypeScript type checking
```

## Documentation writing guidelines

### Style guide

- Use numbered paragraphs for instructions/procedures, starting with action-oriented verbs ("click",
  "type", "restart")
- Headings should start with capitalization but following words are not capitalized
- Use code blocks for all commands (not inline)
- Keep paragraphs concise and to-the-point
- Add custom words to `custom-words.txt` if needed for spellchecking
- Include trailing commas for multi-line lists
- Do not use code regions
- Follow language-specific guidelines for code examples in `docs/contributing/code-style/`
- Diagrams should use [Mermaid](https://mermaid.js.org/)
- Large code examples should be in `<details>` blocks

### Conditional content

The site serves both internal Bitwarden employees and external community contributors. Use these
tags to target specific audiences:

```md
<Community>
Content for community contributors only
</Community>

<Bitwarden>
Content for Bitwarden employees only
</Bitwarden>
```

To hide pages from navigation, use frontmatter:

```yml
---
sidebar_custom_props:
  access: bitwarden # or community
---
```

## Code review and ownership

Tech leads generally review all documentation changes. See [.github/CODEOWNERS](.github/CODEOWNERS)
for full ownership details.

## Pull request strategy

- Prefer small, incremental PRs
- Merge directly to `main`
- Avoid using long-lived feature branches and keep content changes relatively small and iterative

## Working with this repository

### When editing documentation

1. Always follow the style guide (numbered instructions, code blocks, brevity)
2. Consider if content should be conditional using `<Community>` or `<Bitwarden>` tags
3. Run `npm run spellcheck` before committing
4. Ensure proper frontmatter is set (sidebar position, access restrictions, etc.)
5. Reference the appropriate section (getting-started, contributing, or architecture)

### When adding new files

1. Place in the appropriate docs subdirectory
2. Include frontmatter with at least `sidebar_position`
3. Add any technical terms to `custom-words.txt`
4. Update sidebars.js if needed for navigation structure

### Architecture documentation

- ADRs go in `docs/architecture/adr/` with format `####-title.md`
- Follow existing ADR structure (Status, Context, Decision, Consequences)

## Testing before committing

1. Run `npm run spellcheck` to catch typos
2. Run `npm run lint` to ensure formatting is correct
3. Run `npm start` to preview changes locally
4. Verify conditional content displays correctly by switching between Community/Bitwarden modes in
   the dropdown

For most changes you can rely on making a draft pull request and testing it live with a branch
deployment.
