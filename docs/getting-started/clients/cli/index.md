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

We recommend using Nx commands to build the CLI. Run the following from the repository root to build
and watch:

<Bitwarden>

```bash
npx nx serve cli --configuration=commercial-dev
```

</Bitwarden>

<Community>

```bash
npx nx serve cli --configuration=oss-dev
```

</Community>

For complete Nx documentation and all available commands, see
[Using Nx to Build Projects](https://github.com/bitwarden/clients/blob/main/docs/using-nx-to-build-projects.md).

By default, this will use the official Bitwarden servers. If you need to develop with Server running
locally, follow the instructions below in Environment setup.

## Environment setup

### Configure Node to trust development certificates

A quick way to do this is to give Node access to your system certificates:

```bash
export NODE_USE_SYSTEM_CA=1
```

Alternatively, you can add the certificate directly to Node:

```bash
export NODE_EXTRA_CA_CERTS=/path/to/your-certificate.pem
```

### Target local Server instance

If you are running the Bitwarden Web application locally, you only need to set the base server
location. The web application proxies API requests to your local Server APIs.

Run the following when you have Web running locally:

<Bitwarden>

```bash
node dist/apps/cli/commercial-dev/bw.js config server https://localhost:8080
```

</Bitwarden>

<Community>

```bash
node dist/apps/cli/oss-dev/bw.js config server https://localhost:8080
```

</Community>

Otherwise, you need to set the individual Server API locations as follows:

<Bitwarden>

```bash
node dist/apps/cli/commercial-dev/bw.js config server \
  --api http://localhost:4000 \
  --identity http://localhost:33656
```

</Bitwarden>

<Community>

```bash
node dist/apps/cli/oss-dev/bw.js config server \
  --api http://localhost:4000 \
  --identity http://localhost:33656
```

</Community>

## Testing and Debugging

The Nx build is located at `dist/apps/cli/<configuration>/bw.js`, where `<configuration>` matches
the configuration you built (for example `commercial-dev` or `oss-dev`). You can run this with node,
for example:

<Bitwarden>

```bash
node dist/apps/cli/commercial-dev/bw.js login
```

</Bitwarden>

<Community>

```bash
node dist/apps/cli/oss-dev/bw.js login
```

</Community>

It may be more convenient to make the file executable first:

<Bitwarden>

```bash
cd dist/apps/cli/commercial-dev
chmod +x bw.js
./bw.js login
```

</Bitwarden>

<Community>

```bash
cd dist/apps/cli/oss-dev
chmod +x bw.js
./bw.js login
```

</Community>

To debug the CLI client, run it from a
[Javascript Debug Terminal](https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_javascript-debug-terminal)
and place the breakpoints in your Typescript code.

## Manual build commands

Before the migration to Nx, the CLI was built directly with npm scripts. These commands are still
available but are no longer the recommended approach.

Build and watch:

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

These scripts output the build to `build/bw.js`, which you can run with node, for example:

```bash
node build/bw.js login
```
