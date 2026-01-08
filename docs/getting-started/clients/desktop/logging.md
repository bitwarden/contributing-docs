# Logging

The Desktop client app logs are written to the filesystem by default.

## Desktop Native

Desktop Native is written in Rust and utilizes the `tracing` ecosystem. For more information on how
to properly use `tracing`, see [Logging](../../../contributing/logging.md).

### How it works

Tracing Log events are emitted by the Rust SDK and the Desktop Native.

The logs events are consumed in the `Napi` layer and wired into the client app electron logging
framework via the `JsLogger`. This can be found in `napi/lib.rs`, `logging::init_napi_log()`.

### Location of logs

When running the client which is installed and executed through the desktop environment of the OS,
the logs can be found in the data directory for the Bitwarden app.

When running the client via the command line, the logs are additionally output to the stdout/stderr
of the console.

See https://bitwarden.com/help/data-storage/#on-your-local-machine for more information.

#### Data directory app logs

By default, the data directory is fixed, per OS and release variant.

The log file name is `app.log`.

When running the app from the command line, the `BITWARDEN_APPDATA_DIR` can be used to redirect the
log output dir. This can then of course be tailed and filtered with grep. For example

```
$ BITWARDEN_APPDATA_DIR=/Users/keanu/.bw/desktop npm run electron

$ tail -F ~/.bw/desktop/app.log | grep NAPI
```
