---
sidebar_position: 3
---

# Clients

:::info

For the Mobile application please visit [Mobile](mobile). This page covers the other clients.

:::

This section contains development information for each of the Bitwarden Typescript client
applications:

- [Web Vault](./web-vault)
- [Browser](./browser)
- [Desktop](./desktop)
- [CLI](./cli)

In this context, "clients" generally refers to the Typescript clients, which are located in the
`clients` mono-repository.

## Requirements

Before you start, you should have Node and npm installed. See the [Tools and Libraries](../tools)
page for more information.

## Setup instructions

Before doing work on any of the clients, you need to clone and setup the `clients` mono-repository.

1.  Clone the repository:

    ```bash
    git clone https://github.com/bitwarden/clients.git
    ```

2.  Install the dependencies:

    ```bash
    cd clients
    npm ci
    ```

    :::info

    You should only ever install dependencies from the root of the repository. Don't try to install
    dependencies for individual client applications.

    :::

3.  Configure git blame to ignore certain commits (generally administrative changes, such as
    formatting):

    ```bash
    git config blame.ignoreRevsFile .git-blame-ignore-revs
    ```

4.  Open the `clients.code-workspace` file in Visual Studio Code. This has been configured to use
    [multi-root workspaces](https://code.visualstudio.com/docs/editor/multi-root-workspaces) to
    improve your development experience. Each client will appear as its own workspace in the
    Explorer panel on the left-hand side.

You're now ready to continue with any additional instructions for the particular client you want to
work on.
