---
hide:
  - navigation
---

# Home

Welcome! The Bitwarden Contributing Documentation contains all the information you need to get started as a community developer.

## Getting Started

It’s likely the first thing you’ll need to do is set up a local development environment; to do so, we recommend progressing through the documentation in the following order.

1. Install all the recommended [Tools and Libraries](./tools/index.md) for development.
2. Follow the [Server Setup Guide](./server/guide.md) to setup your local server and related services
3. Build and run each [Clients](./clients/index.md) from source and connect them to your local server
4. Read our [Contributing Guidelines](./contributing.md) and [Coding Style](./code-style/index.md)

## Help!

If you’re having trouble following these instructions, don’t panic.

- The [Bitwarden Help Center](https://bitwarden.com/help/) is an excellent resource to learn about the different features of our software and configuration options.
- Ask for help from the community in the [Community Forums](https://community.bitwarden.com)
- Ask the dev team on the official [Gitter chat](https://gitter.im/bitwarden/Lobby)

## Help make this documentation better

We want a culture of shared knowledge, and documentation is one of the best ways to do that.

- If you have trouble following some instructions, please improve them
- If you add or change a feature that requires setup for development, please update the documentation
- If you're reviewing a PR that requires a change to this documentation, ask the author to do that as part of your review

To contribute to this documentation, clone the [Developer Docs Github repo](https://github.com/bitwarden/dev-docs/) and follow the instructions in the README.

Please follow the following (very brief) style guide:

- Use numbered paragraphs for all instructions or procedures. Start each paragraph with a verb (“click”, “type”, “restart”, etc)
- Use code blocks for all commands. Don’t write them in-line
- Avoid long paragraphs - this documentation should be to-the-point and instructional
- If making changes to the `external` documentation, ensure that your changes are appropriate for the public (no reference to confidential or sensitive information, no personal information, appropriate language)
