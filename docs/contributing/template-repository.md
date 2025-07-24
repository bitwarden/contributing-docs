---
sidebar_custom_props:
  access: bitwarden
---

# Template Repository

## Location and usage

A template [repository](https://github.com/bitwarden/template) exists as a base set of files and
overall setup for new projects that can be selected within the GitHub repository creation interface.
It contains what's needed to get started with pull request templates, linting, continuous
integration, and more. Core concepts that generally apply to all repositories should be created and
reviewed there before being distributed. The template represents best practices across the company
but should also be considered a _starting point_ for further setup within the context of a
repository's needs; in many cases customization is expected as elaborated below.

## Content and licensing

Text license files declare the usage of GPL and a proprietary Bitwarden license. A
`bitwarden_license` directory with a `README` is where Bitwarden-licensed code and contents go,
otherwise it's specified that GPL applies. These files and their locations / structure should not be
modified.

Security and contributing documents clarify company policies and approaches. They can be modified if
a unique situation applies, but it's highly likely they can be left as-is.

A `README` at the root is expected to be customized with no explicit rules on contents. It's
recommended to keep this brief with a title and simple description of a couple sentences as
documentation can be kept elsewhere such as this very site!

## Editor configuration

A couple files define attribute expectations and ignores for Git. The latter is expected to be
expanded based on repository needs but when possible the template itself should be expanded for
additional use cases. Popular OS and IDE-specific ignores are already present.

Editor configuration sets rules for file formatting. Similar to the above for ignores the template
should receive updates for new languages and company standards. Linters will obey editor
configurations when enforcing rules.

## Local linting

[Husky](https://github.com/typicode/husky) and [lint-staged](https://github.com/okonet/lint-staged)
via NPM are used to locally lint and format changed files. Run:

```bash
npm install
```

after cloning your new repository to install the necessary Git hooks.

Within the `lint-staged` section of the
[package configuration](https://github.com/bitwarden/template/blob/main/package.json) exist linter
configurations for specific file types, with [Prettier](https://github.com/prettier/prettier) as a
default formatter for all files. Extend this for relevant file types that have formatters available,
for example with .NET applications:

```json
"*.cs": "dotnet format --include"
```

or TypeScript:

```json
"*.ts": "eslint --cache --cache-strategy content --fix"
```

The editor configuration used above is accessed by many linters to drive results.

## Dependency management

The template includes [Renovate](https://github.com/renovatebot/renovate)
[configuration](https://github.com/bitwarden/template/blob/main/.github/renovate.json) for managing
dependencies that is derived from a
[shared configuration repository](https://github.com/bitwarden/renovate-config).

See [Dependency Management](./dependencies/index.md) for more information on our Renovate
configuration.

## Issue templates

Configuration for issues with centralized and relevant links as well as a template for pull request
creation that uses common sections expected with essentially all changes. Instructions exist within
the pull request template but in general:

- Expect a tracking link such as a GitHub or Jira issue.
- If the repository does not have a user interface, the "Screenshots" section can be removed.
- Adjust reminders as needed for the repository context.

It's unlikely that you'll need to modify the template significantly in destination repositories, and
the origin template here can always be expanded with additional improvements within the
organization.

## Code ownership

[CODEOWNERS](https://github.com/bitwarden/template/blob/main/.github/CODEOWNERS) entries to be
defined indicating a team that "owns" the code at a relevant path.

## Scanning

Actions workflows for code scanning. Targets two domains:

- Static application security testing (SAST): Runs PR scans in an incremental mode and full scans on
  push events.
- Quality: Additional language-specific findings and improvements not strictly related to security.

SAST results are exported as
[SARIF](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html) (Static Analysis Results
Interchange Format) and uploaded to the GitHub Advanced Security interface for internal review.
Quality results are also made available in the interface when security-related.
