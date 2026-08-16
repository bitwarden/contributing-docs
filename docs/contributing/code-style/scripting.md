# Scripting

## Our stance

Scripts committed to a Bitwarden repository must use the scripting language already established for
that repository. New scripts should not introduce a different language based on personal preference
or on what an AI assistant happened to generate.

A proliferation of scripting languages within a repository and between repositories with similar
code languages and frameworks increases the support burden and widens the range of skills anyone
maintaining it later must hold. Immediate inconvenience of writing in the established language is
the price for long-term supportability.

## Established languages per repository

Defer to what a repository already uses. The current defaults in our core repositories are:

| Repository family   | Scripting language |
| ------------------- | ------------------ |
| `clients`           | Node               |
| `server`            | PowerShell         |
| `ios` and `android` | Python             |

For other repositories, follow the convention already present in its existing scripts.

## Guidance when there is no established choice

When a repository has no established scripting language, defer to the best practices for what is
germane to the product being developed and its relevant frameworks, as well as any precedent with
similar cases within Bitwarden. Be cautious about choosing what is familiar to you personally over
what can be maintained long-term by the organization.
