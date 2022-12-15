---
sidebar_custom_props:
  access: bitwarden
---

# Ingress Tunnels

Sometimes it can be beneficial to allow other team members access to your locally running Bitwarden
instance. Usually this involves opening ports in firewalls, and even then you can usually only
connect through the IP address.

## Configure Web

If the goal is to expose the local web vault (which includes access to most services) then the web
vault needs to be configured to not use `https` and instead serve it’s content unencrypted.

Open `webpack.config.js` and comment out the following lines from `const devServer = {`

```ts
https: {
  key: fs.readFileSync('dev-server' + certSuffix + '.pem'),
  cert: fs.readFileSync('dev-server' + certSuffix + '.pem'),
},
```

And add the domain to `allowedHosts` in `local.json`:

```json
{
  "allowedHosts": ["<super-secret-tunnel>"]
}
```

## Cloudflare Argo Tunnels

An alternative method which provides a few benefits are to use
[Cloudflare Argo Tunnels](https://www.cloudflare.com/products/tunnel/). Which works by setting up a
local tunnel between Cloudflare and your local machine, which provides access to a locally running
service. The tunnel can additionally be placed behind a cloudflare proxy which provides a valid SSL
certificate, making it perfect for testing with the mobile applications.

### Setup

1. Install `cloudflared`, instructions are available at
   <https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation>.
2. Start you local web server and take note of the `$PORT` it is running on
3. Start the tunnel using `cloudflared tunnel --url http://127.0.0.1:$PORT`

Cloudflare will build you a tunnel and provide the url to it: `*.trycloudflare.com`. Wait for the
DNS to start resolving before trying to access it.

**Note**, anyone with this URL can access the forwarded URL on your machine.

## Ngrok (Requires a Free Account)

1. Navigate to <https://ngrok.com/> and sign up for an account

2. Follow the [official instructions](https://dashboard.ngrok.com/get-started/setup) to download
   ngrok and connect it to your account.

3. Expose your local port using ngrok:

   ```bash
   ngrok http <port>
   ```

4. ngrok's interface should display a "Forwarding" url, for example:

   ```
   https://abcd-123-456-789.au.ngrok.io -> http://localhost:<port>
   ```

5. Verify that the forwarding url works by navigating to the forwarding url with `/alive` on the
   end. For example, `https://abcd-123-456-789.au.ngrok.io/alive`.

**Note**, anyone with this URL can access the forwarded URL on your machine.
