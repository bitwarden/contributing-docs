---
sidebar_position: 10
---

# Troubleshooting

## Aspire

The Aspire dashboard shows the logs for every resource. Check the logs for `setup-secrets` and
`run-db-migrations` first, because the services wait for both to finish.

| Symptom                              | Fix                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Containers fail to start             | Make sure Docker Desktop is running, and stop any Docker Compose containers that use the same ports                                        |
| Services stay in a waiting state     | Check the `setup-secrets` and `run-db-migrations` logs for errors                                                                          |
| Migrations fail to connect           | Make sure the `Database:Password` AppHost user secret matches the password in your `secrets.json` connection string                        |
| Migrations fail immediately          | Make sure `pwsh` is on your `PATH`                                                                                                         |
| `azurite-setup` fails                | Install the `Az` PowerShell module, as described in the [Setup Guide](./guide.md#set-up-aspire)                                            |
| A service fails with a port conflict | Set `Services:<name>:BasePort` to a free port with `dotnet user-secrets set` in the `AppHost` folder                                       |
| User secrets changes disappear       | Aspire runs `setup_secrets.ps1 -clear` on every start. Add the values to `dev/secrets.json` instead of setting them on individual projects |

## macOS

### AppleCFErrorCryptographicException

Error:
`Interop.AppleCrypto.AppleCFErrorCryptographicException: The operation couldn't be completed.`

There could be a couple fixes to this problem, the most likely is you need to restart your device.

If that doesn't work, you could try force unlocking your login keychain with:

```bash
security -v unlock-keychain /Users/$USER/Library/Keychains/login.keychain
```

If that doesn't work either, Mac can sometimes set trust settings for your certificates as admin
instead of as user. If you don't see your certificates by running:

```bash
security dump-trust-settings
```

Then try running:

```bash
security dump-trust-settings -d
```

If your certificates show up here you will have to export the trust settings to user using the
[security command](https://ss64.com/osx/security.html), as there is no way to specify this in the
Keychain Access Application.

To do this, run `security trust-settings-export -d <filename>` to export the admin certificates.
Then import them into user with `security trust-settings-import <filename>`.

See the related [Github Issue](https://github.com/dotnet/runtime/issues/59703) for more information.

### Error NU1403: Package content hash validation failed

Following commands should fix the problem:

```bash
dotnet nuget locals all --clear
git clean -xfd
git rm \*\*/packages.lock.json -f
dotnet restore
```

For more details read
[https://github.com/NuGet/Home/issues/7921#issuecomment-478152479](https://github.com/NuGet/Home/issues/7921#issuecomment-478152479)

## Windows

### An attempt was made to access a socket in a way forbidden by its access permissions

This error typically occurs when the application attempts to use a port that is either already in
use or reserved. Newer Windows with Hyper-V reserves many ports 50 000+.

Luckily it’s possible to manually mark the ports as reversed to prevent Hyper-V from reserving them.
Start a CMD session in an elevated mode and run the following commands, and restart the computer.

```bash
net stop winnat

netsh int ipv4 add excludedportrange protocol=tcp startport=<port> numberofports=1 store=persistent

net start winnat
```
