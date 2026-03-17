import Tabs from "@theme/Tabs"; import TabItem from "@theme/TabItem";

# Splunk app

The Bitwarden Splunk app fetches event log data from the Bitwarden Public API and makes it available
in Splunk.

## Requirements

- Docker. If you're using an Apple Silicon Mac, enable _Docker Desktop_ -> _Settings_ -> _General_
  -> _Use Rosetta for x86_64/amd64 emulation on Apple Silicon_
- Python 3.7 - 3.10
  - (Optional) Use something like [PyEnv](https://github.com/pyenv/pyenv) to manage Python versions
- [Poetry][poetry]
  - Also install Poetry export plugin with `poetry self add poetry-plugin-export`
- libmagic (macOS only), available via homebrew: `brew install libmagic`
- A Bitwarden Teams or Enterprise organization
- If using a local development server - make sure the Events and EventsProcessor projects are
  running and [Event Logging](../server/events.md) is working

## Set up and configuration

### Configure your environment

1. Clone the Github repository:

   ```
   git clone https://github.com/bitwarden/splunk.git
   ```

2. Navigate to the root of the repository:

   ```
   cd splunk
   ```

3. Tell poetry to use the required Python version:

   ```
   poetry env use <executable>
   ```

   Where `<executable>` is the executable for Python. If this is in your PATH variable then you do
   not need to specify the full path. e.g. `poetry env use python3.9`.

   If using PyEnv, you can use `pyenv local <version>` to set the global version. And then follow
   that up with, `poetry env use python`.

4. Install dependencies:

   ```
   poetry install --with dev
   ```

### Set up Splunk Enterprise

1. Run Splunk Enterprise:

<Tabs groupId="os">
<TabItem value="windows" label="Windows">
   ```
   docker compose -f dev/docker-compose.yml up -d splunk
   ```
</TabItem>
<TabItem value="macos" label="macOS">
   ```
   docker compose -f dev/docker-compose.yml up -d splunk93
   ```
</TabItem>
</Tabs>

:::warning

If you are using an Apple Silicon Mac, you must use up to version 9.3 of Splunk. As of version 9.4,
Splunk depends on the use of the AVX instruction set for its KVStore, which is not supported by
Apple Silicon.

:::

Please note this will set the admin password to `password`. This is for development purposes only.

2. Confirm that Splunk is running by navigating to http://localhost:8001

### Deploy the app

1. Package the app:

   ```
   ./package.sh
   ```

   This will produce a packaged Splunk app in `output/bitwarden_event_logs.tar.gz`.

2. Deploy the app to Splunk:

   ```
   ./deploy.sh
   ```

   This will restart Splunk and it may take a few seconds to become available again after the script
   is finished

3. (optional) Check the logs for errors or for debugging purposes later:
   ```
   docker exec -u splunk -it splunk tail -f /opt/splunk/var/log/splunk/bitwarden_event_logs.log
   ```

### Configure the app in Splunk

1. Navigate to the Splunk web app: http://localhost:8001.

2. Log in with the username `admin` and the password `password`.

3. Click on the _Apps_ -> _Bitwarden Event Logs_.

4. Complete the setup. Refer to the [Bitwarden Help Center][Bitwarden Splunk SIEM] for more
   information about configuration.

:::warning

Splunk uses https and requires additional configuration to work with your local dev server (Events
needs to run in https). We don't have instructions for this yet. In the meantime, we recommend
configuring Splunk to use a Bitwarden cloud deployment (such as the internal Dev or QA
environments). To do this, select Self-Hosted and enter the URL of your hosted environment.

:::

You should now see your organization events in _Apps_ -> _Bitwarden Event Logs_ -> _Dashboards_. If
no event logs appear, check the Splunk logs (see above).

Events are categorized by Auth Events, Vault Events, and Organization Events. Here are a few
examples of each:

Auth Events:

- User Login
- User Changed Password

Vault Events:

- Item Created
- Item Deleted
- Item Updated

Organization Events:

- User Invited
- User Revoked
- User Restored

:::note

When configuring the Bitwarden Event Logs app, all previous values will be overwritten. This means
that if you have previously configured the app, it will empty out the configuration and you will
need to re-enter your secret key and client id.

:::

[Bitwarden Splunk SIEM]: https://bitwarden.com/help/splunk-siem/
[poetry]: https://python-poetry.org/docs/#installation
