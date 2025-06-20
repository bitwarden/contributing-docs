---
title: Bitwarden Nx Plugin
---

# @bitwarden/nx-plugin

The `@bitwarden/nx-plugin` is a custom Nx plugin developed specifically for Bitwarden projects. It
provides generators tailored to Bitwarden's architecture and coding standards.

## Overview

This plugin extends Nx's capabilities with Bitwarden-specific generators that help maintain
consistency across the codebase. It automates the creation of libraries, components, and other
project elements according to Bitwarden's established patterns.

## How It Fits Into the Project Architecture

The `@bitwarden/nx-plugin` is designed to:

1. Enforce Bitwarden's architectural decisions and code organization
2. Streamline the creation of new libraries and components
3. Ensure consistent configuration across the project
4. Automate updates to project metadata and configuration files
5. Reduce the learning curve for new contributors

By using this plugin, we maintain a consistent approach to code organization and structure across
the entire project.

## Installation and Setup

The plugin is included as a development dependency in the project. If you're working with a fresh
clone of the repository, it will be installed when you run:

```bash
npm install
```

No additional setup is required to use the generators provided by the plugin.

## Available Generators

The plugin currently includes the following generators:

- `basic-lib`: Creates a new library with standard configuration and structure

Additional generators may be added in the future to support other common patterns in the Bitwarden
codebase.

## Further Learning

To learn more about Nx plugins and how they work:

- [Nx Plugin Development](https://nx.dev/extending-nx/creating-nx-plugins)
- [Nx Plugins Overview](https://nx.dev/extending-nx/intro)
