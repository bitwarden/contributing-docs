# Splunk App

A Splunk app for reporting Bitwarden event logs.

## Contributing

This app requires Python 3.8 installed. Install [Poetry][poetry] if not already installed.

Activate shell: `poetry shell`

Install dependencies: `poetry install --with dev`

### Local development

- Install docker.
- Run splunk enterprise
  `docker run --rm --name splunk -d -p 8001:8000 -p 8089:8089 -e SPLUNK_START_ARGS='--accept-license' -e SPLUNK_PASSWORD='password' splunk/splunk:latest`
- Package and Deploy to splunk:
  - `./package.sh`
  - `./deploy.sh`
- Access logs:
  - `docker exec -u splunk -it splunk bash`
  - `tail -f /opt/splunk/var/log/splunk/bitwarden_event_logs_beta.log`
- Access Splunk url in the browser: http://localhost:8001
  - Enter credentials, login: `admin`, password: `password`
  - Click on the _Apps_ -> _Bitwarden Event Logs_
  - Complete the Setup
