# Web Vault

## Requirements

- Before you start, you must complete the [Clients repository setup instructions](../index.md).

- If you want to develop against a local server instance, see the [Server Setup Guide](../../server/guide.md).

## Build Instructions

1.  Build and run the Web Vault.

    === "Community Developer"

        ```bash
        cd apps/web
        npm run build:oss:watch
        ```

    === "Bitwarden Developer"

        ```bash
        cd apps/web
        npm run build:bit:watch
        ```

      Which will target the local bitwarden instance. See further below for information on how to target official servers.

2.  Open your browser and navigate to `https://localhost:8080`.

!!! info

    You can also run the Web Vault in self-hosted mode by using the `build:bit:selfhost:watch` and `build:oss:selfhost:watch` commands.

## Configuring API endpoints

By default, the Web Vault will use your local development server (running at `localhost` on the default ports). You can use the official Bitwarden server instead or configure custom endpoints.

### Official Server

To use the official Bitwarden server, follow the build instructions above, but run the Web Vault using the following command:

=== "Community Developer"

    ```csharp
    ENV=cloud npm run build:oss:watch
    ```

=== "Bitwarden Developer"

    ```csharp
    ENV=cloud npm run build:bit:watch
    ```

### Custom Endpoints

You can manually set your API endpoint settings by creating a `config/local.json` file with the following structure:

```csharp
{
    "dev": {
        "proxyApi": "<http://your-api-url>",
        "proxyIdentity": "<http://your-identity-url>",
        "proxyEvents": "<http://your-events-url>",
        "proxyNotifications": "<http://your-notifications-url>",
        "allowedHosts": ["hostnames-to-allow-in-webpack"],
    },
    "urls": {

    }
}
```

- `dev`: Proxies traffic from ex. `/api -> <http://your-api-url>`.
- `urls`: Directly calls the remote service. Note: This can cause issues with CORS headers. urls adhere to the [Urls type in jslib](https://github.com/bitwarden/jslib/blob/master/common/src/abstractions/environment.service.ts).
