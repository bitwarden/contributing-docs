# Bitwarden Contributing Docs

The current version of the docs are accessible at:

- https://contributing.bitwarden.com/

## Install

```bash
npm ci
```

## Local Development

```bash
npm start
```

This command starts a local development server and opens up a browser window. Most changes are
reflected live without having to restart the server.

## Build

```bash
npm build
```

This command generates static content into the `build` directory and can be served using any static
contents hosting service.

## Writing

This website is built using [Docusaurus 2](https://docusaurus.io/), a modern static website
generator.

Documentation is located under `docs`.

### Conditional Content

The Contributing Docs site is used both for internal and external contributors. To this end we've
facilitated a mean to conditionally show content for either group. This is primarily to keep the
external docs simple.

```md
<community>

This content is shown only to community contributors.

</community>

<bitwarden>

This content is shown only to bitwarden contributors.

</bitwarden>
```

The technical implementation uses a custom context called `devMode` which is persisted to local
storage, and is exposed as a dropdown in the navigation bar.

It's also possible to conditionally hide pages from the navigation using `frontMatter`. This is
easiest done using the `access` property, which can be either `community` or `bitwarden`.

```yml
---
sidebar_custom_props:
  access: bitwarden
---
```
