---
sidebar_position: 5
---

# CLI

:::tip

If you’re not familiar with the CLI client, the Bitwarden Help Center has lots of
[great documentation](https://bitwarden.com/help/article/cli/) that will help you get oriented.

:::

## Requirements

Before you start, you must complete the [Clients repository setup instructions](../index.md).

## Build instructions

:::tip Nx commands are preferred.

We now recommend using Nx commands for building projects. For the cli:

```bash
# Build and watch (GPL)
npx nx serve cli --configuration=oss-dev
# Build and watch (Bitwarden)
npx nx serve cli --configuration=commercial-dev
```

For complete Nx documentation and all available commands, see
[Using Nx to Build Projects](https://github.com/bitwarden/clients/blob/main/docs/using-nx-to-build-projects.md).
:::

Build and run:

<Bitwarden>

```bash
cd apps/cli
npm run build:bit:watch
```

</Bitwarden>

<Community>

```bash
cd apps/cli
npm run build:oss:watch
```

</Community>

By default, this will use the official Bitwarden servers. You can target your local server by using
the [config command](https://bitwarden.com/help/article/cli/#config). You may need to
[configure node to use your self-signed certificate](https://bitwarden.com/help/article/cli/#using-self-signed-certificates).

## Testing and Debugging

The build is located at `build/bw.js`. You can run this with node, for example:

```bash
node build/bw.js login
```

It may be more convenient to make the file executable first:

```bash
cd build
chmod +x bw.js
./bw.js login
```

To debug the CLI client, run it from a
[Javascript Debug Terminal](https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_javascript-debug-terminal)
and place the breakpoints in your Typescript code.
