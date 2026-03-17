# Logging

:::info

This page is an extension of the global and Rust-specific logging guidelines in
[Contributing](../../../../contributing/logging).

:::

The Desktop client app logs are written to the filesystem by default.

Desktop Native is developed in Rust and utilizes the `tracing` crate for it's logging framework.

## How it works

Tracing Log events are emitted by both the Rust SDK and Desktop Native.

The logs events are consumed in the `Napi` layer and wired into the client app electron logging
framework via the `JsLogger`. This can be found in `napi/lib.rs`, `logging::init_napi_log()`.

### Dependency crates and `log` compatibility

Dependency crates using `tracing` may also emit tracing events. For example, the internal Rust SDK.
Other dep crates may be using the popular `log` crate. We utilize `tracing-log` to act as a bridge
to subscribe to log crate’s Records and emit them as tracing Events. These are by default filtered
out of the standard log streams.

## Log level

The default log level (`info`) can be overridden by the environment variable `RUST_LOG`

```bash
RUST_LOG=debug npm run electron
```

## Location of logs

When running the client which is installed and executed through the desktop environment of the OS,
the logs can be found in the data directory for the Bitwarden app.

When running the client via the command line, the logs are additionally output to the stdout/stderr
of the console.

See https://bitwarden.com/help/data-storage/#on-your-local-machine for more information.

### Data directory app logs

By default, the data directory is fixed, per OS and release variant.

The log file name is `app.log`.

When running the app from the command line, the `BITWARDEN_APPDATA_DIR` can be used to redirect the
log output dir.

```bash
BITWARDEN_APPDATA_DIR=/your/special/path npm run electron

tail -F /your/special/pathp/app.log | grep NAPI
```
