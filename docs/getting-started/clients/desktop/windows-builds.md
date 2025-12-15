---
sidebar_custom_props:
  access: bitwarden
---

# Windows Installer builds

When installing standard/beta builds (not portable) for the Windows platform from build artifacts,
there are additional steps required.

1. Download the corresponding `.nsis` file from the build artifacts page.
2. Place the `.nsis` file in the same folder as the installer. This might require de-compressing the
   download.

## Figure 1: example error

This is the error that occurs during install process if the `.nsis` file is not present.

![`nsis` error](./nsis-error.png)

## Figure 2: build artifacts

This is an example of pairing the `.nsis` file with the installer. Make sure to use the file that
matches the CPU architecture.

![`nsis` build files](./nsis-build-files.png)
