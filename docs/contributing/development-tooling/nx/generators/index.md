---
title: Nx Generators
---

# Nx Generators

Nx generators are powerful tools that automate the creation of code, configuration, and other files
in your project. They help maintain consistency across your codebase and reduce the manual effort
required to scaffold new components, libraries, or applications.

## What are Nx Generators?

Nx generators (previously known as schematics) are code generation tools that follow templates to
create or modify files in your project. They can:

- Create new files from templates
- Modify existing files
- Update configuration files
- Ensure consistent project structure
- Automate repetitive tasks

Generators can be run using the Nx CLI with the `nx generate` command (or the shorthand `nx g`).

## When to Use Generators

Use generators when:

- Creating new libraries, components, or features that follow a standard pattern
- You want to ensure consistency across similar parts of your application
- You need to automate repetitive setup tasks
- You want to reduce the chance of human error in project setup

## Why Use Generators Instead of Manual Creation

- **Consistency**: Generators ensure that all generated code follows the same patterns and
  conventions
- **Efficiency**: Save time by automating repetitive tasks
- **Reduced Errors**: Minimize human error in project setup
- **Maintainability**: Easier to maintain code that follows consistent patterns
- **Onboarding**: Help new team members create code that follows project standards

## How Bitwarden Uses Generators

Platform maintains a Nx plugin (`@bitwarden/nx-plugin`) with custom generators for our monorepo. We
may at times also use stock generators from dependencies such as Nx's own generator for generating
nx plugins (a generator generator generator, if you will).

## Creating A Nx Generator

It may be useful at some point to create a new Nx generator. The platform team maintains a nx plugin
in `libs/nx-plugin` that has a generators folder. If you need to create a new generator please do so
by following these steps.

1. Run
   `npx nx generate @nx/plugin:generator libs/nx-plugin/src/generators/your-generator-name-here}`.
   This will create a basic generator structure for you to get started with.

## Further Learning

For more information about Nx generators, check out these resources:

- [Nx Generators Documentation](https://nx.dev/plugin-features/use-code-generators)
- [Creating Custom Generators](https://nx.dev/recipes/generators/creating-files)
- [Nx Generator Examples](https://nx.dev/plugin-features/use-code-generators#examples)
