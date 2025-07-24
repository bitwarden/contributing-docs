# Modifying User Secrets

## Manually editing user secrets

We recommend using the automated helper script described in the
[Server Setup Guide](../getting-started/server/guide.md). However, you can manually edit or
troubleshoot your user secrets using the instructions below. If you are manually editing using
secrets, make sure to remember to copy your changes across to all projects if required.

### Editing user secrets - Visual Studio on Windows

Right-click on the project in the Solution Explorer and click **Manage User Secrets**.

### Editing user secrets - Visual Studio on macOS

Open a terminal and navigate to the project directory.

Add a user secret by running:

```bash
dotnet user-secrets set "<key>" "<value>"
```

View currently set secrets by running:

```bash
dotnet user-secrets list
```

By default, user secret files are located in:

```bash
~/.microsoft/usersecrets/<project name>/secrets.json
```

You can edit this file directly, which is much easier than using the command line tool.

### Editing user secrets - Visual Studio Code

- Install the
  [.NET Core User Secrets](https://marketplace.visualstudio.com/items?itemName=adrianwilczynski.user-secrets)
  extension
- Right-click on your project's **.csproj** file and select **Manage User Secrets**

### Editing user secrets - Rider

- Navigate to **Preferences -> Plugins** and Install .NET Core User Secrets
- Right click on the a project and click **Tools** > **Open project user secrets**
