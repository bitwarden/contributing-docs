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

By default, this will use the official Bitwarden servers. If you need to develop with a Server instance running locally, follow the instructions in Environment setup below.


## Environment setup
### Configure Node to trust development certificates
A quick way to do this is to give Node access to your system certificates in the macOS Keychain:

```bash
export NODE_USE_SYSTEM_CA=1
```

Alternatively, you can add the certificate directly to Node by referencing it like so:

```bash
export NODE_EXTRA_CA_CERTS=/path/to/your-certificate.pem
```

### Target local Server instance
If you are running the Bitwarden Web application locally, you will only need to set the base server location. This works because the web application uses Webpack to proxy API requests through to your local Server APIs. 

Run the following when you have Web running locally:

```bash
node build/bw.js config server https://localhost:8080
```

Otherwise, you need to set the individual Server API locations as follows:

```bash
node build/bw.js config server --web-vault http://localhost:8080 \
  --api http://localhost:4000 \
  --identity http://localhost:33656 \ 
  --icons http://localhost:50024 \
  --notifications http://localhost:61840 
```

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
