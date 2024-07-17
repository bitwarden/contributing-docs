# Splunk App

A Splunk app for reporting Bitwarden event logs.

## Contributing

### Set up Splunk Enterprise

1. Install Docker
2. If you're using an Apple Silicon Mac, open _Docker Desktop_ -> _Settings_ -> _General_ -> enable
   "Use Rosetta for x86_64/amd64 emulation on Apple Silicon"
3. Run Splunk Enterprise
   `docker run --rm --platform linux/amd64 --name splunk -d -p 8001:8000 -p 8089:8089 -e SPLUNK_START_ARGS='--accept-license' -e SPLUNK_PASSWORD='password' splunk/splunk:latest`
   (replace 'password' with your desired admin password)
4. Confirm that Splunk is running by navigating to http://localhost:8001

### Configure your environment

1. Clone the Github repository: `git clone https://github.com/bitwarden/splunk.git`
2. Install Python 3.8 or 3.9
3. Install [Poetry][poetry]
4. If you're using macOS, install libmagic: `brew install libmagic`
5. Navigate to your local repository: `cd splunk`
6. Activate the poetry shell: `poetry shell`
7. Tell poetry to use the required Python version: `poetry env use <executable>`, where
   `<executable>` is the executable for Python 3.8 or 3.9. If this is in your PATH variable then you
   do not need to specify the full path. e.g. `poetry env use python3.8`.
8. Install dependencies: `poetry install --with dev`

### Deploy the app

1. Package the app: `./package.sh`. This will produce a packaged Splunk app in
   `output/bitwarden_event_logs.tar.gz`
2. Deploy the app to Splunk: `./deploy.sh`
3. (optional) Check the logs for errors or for debugging purposes later:

- `docker exec -u splunk -it splunk bash`
- `tail -f /opt/splunk/var/log/splunk/bitwarden_event_logs_beta.log`

### Configure the app

1. Access Splunk url in the browser: http://localhost:8001
2. Enter credentials, login: `admin`, password: `password` (or the password you set above)
3. Click on the _Apps_ -> _Bitwarden Event Logs_
4. Complete the setup. Refer to the [Bitwarden Help Center][Bitwarden Splunk SIEM] for more
   information about configuration
