---
sidebar_custom_props:
  access: bitwarden
---

# Microsoft Store

The Microsoft Store application is packaged as an Appx file. To test the Appx, you must have a
Windows 10+ machine, but you may have a separate development machine with a different OS.

## Development Machine Setup

The instructions differ based on the OS of your development machine. Regardless of OS, you must
generate a PKCS12 signing certificate whose subject matches the publisher in the Electron Builder
configuration, found in `./apps/desktop/electron-builder.json`.

### Windows

#### Prerequisites

- [Windows SDK][sdk]: includes the required `signtool` binary for signing the Appx.

[sdk]: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/

#### Generating Certificate

On Windows, you can generate the signing certificate using PowerShell.

```powershell
$certPath = "<File Path>.pfx"

$publisher = "CN=Bitwarden Inc., O=Bitwarden Inc., L=Santa Barbara, S=California, C=US, SERIALNUMBER=7654941, OID.2.5.4.15=Private Organization, OID.1.3.6.1.4.1.311.60.2.1.2=Delaware, OID.1.3.6.1.4.1.311.60.2.1.3=US"
$certificate = New-SelfSignedCertificate -Type Custom `
  -Subject $publisher `
  -KeyUsage DigitalSignature `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}") `
  -FriendlyName "Bitwarden Local Developer Signing Certificate" `
  -CertStoreLocation "Cert:\CurrentUser\My"
# Export this certificate to a file so you can configure the machine to trust
# Appx applications signed with it, and optionally sign the Appx on another
# machine.
$password = Read-Host -AsSecureString
Export-PfxCertificate -cert "Cert:\CurrentUser\My\${$cert.Thumbprint}" -FilePath $certPath -Password $password
```

See [Microsoft's documentation][ms-appx-cert-docs] for more information.

After generating the signing certificate, make sure you follow the [steps below to trust the
certificate][trust-docs] on your test machine.

[ms-appx-cert-docs]:
  https://learn.microsoft.com/en-us/windows/msix/package/create-certificate-package-signing
[trust-docs]: #trusting-the-certificate

#### Signing Appx

On Windows, our build scripts will automatically sign the Appx file when packaging the appx if you
set the following environment variables:

```powershell
$env:ELECTRON_BUILDER_SIGN_CERT = "<path to cert>.pfx"
$env:ELECTRON_BUILDER_SIGN_CERT_PW = "<cert password>"
cd apps/desktop/
npm run dist:win
```

You can also manually sign the Appx using `signtool` directly.

```powershell
npm run dist:win

cd dist
"C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64\signtool.exe" sign /v /fd sha256 /n "CN=Bitwarden Inc., O=Bitwarden Inc., L=Santa Barbara, S=California, C=US, SERIALNUMBER=7654941, OID.2.5.4.15=Private Organization, OID.1.3.6.1.4.1.311.60.2.1.2=Delaware, OID.1.3.6.1.4.1.311.60.2.1.3=US" .\Bitwarden-<version>.appx
```

### macOS

#### Prerequisites

See the prerequisites for [cross-compiling][cross-compile-docs] the Windows Appx.

[cross-compile-docs]: /getting-started/clients/desktop/#cross-compile

#### Generating a Signing Certificate

If you are building the Appx using a non-Windows machine, you can generate a certificate on Windows
and copy it to your development machine, or you can use OpenSSL to generate the signing certificate:

```shell
pkcs="<file path>.pfx"

publisher="/jurisdictionCountryName=US/jurisdictionStateOrProvinceName=Delaware/businessCategory=Private Organization/serialNumber=7654941/C=US/ST=California/L=Santa Barbara/O=Bitwarden Inc./CN=Bitwarden Inc."
key=$(mktemp)
cert=$(mktemp)
openssl req -x509 -newkey rsa:2048 -days 3650 -nodes \
  -addext 'keyUsage=critical,digitalSignature' \
  -addext 'extendedKeyUsage=critical,codeSigning' \
  -addext 'basicConstraints=critical,CA:FALSE' \
  -subj "$publisher" -keyout $key -out $cert
openssl pkcs12 -inkey $key -in $cert -export -out $pkcs
# clean up temp files
rm "$key" "$cert"
```

After generating the signing certificate, make sure you follow the [steps below to trust the
certificate][trust-docs] on your test machine.

#### Signing the Appx

On macOS, the `apps/desktop/scripts/appx-cross-build.ps1` script will sign the Appx when the
`-CertificatePath` and `-CertificatePassword` arguments are passed:

```powershell
cd apps/desktop
./scripts/appx-cross-build.ps1 -Architecture arm64 -CertificatePath ~/Development/code-signing.pfx -CertificatePassword (Read-Host -AsSecureString)
```

You can alternatively specify the certificate password using the `CERTIFICATE_PASSWORD` environment
variable, which allows using a shell besides PowerShell to invoke the request:

```sh
cd apps/desktop
export CERTIFICATE_PASSWORD="<password>"
./scripts/appx-cross-build.ps1 -Architecture arm64 -CertificatePath "<path to signing cert>.pfx"
```

### Linux

Linux is not currently supported for cross-platform Appx signing. See the [footnote in the
cross-compiling docs][cross-compile-footnotes] for how we can support this in the future.

[cross-compile-footnotes]: /getting-started/clients/desktop/#footnote-label
[msix-packaging-tap]: https://github.com/iinuwa/homebrew-msix-packaging-tap/

## Test Machine Setup

### Prerequisites

The only requirement for running the Microsoft Store application on the test machine is Windows 10+,
although Windows 11 is recommended for testing all features.

### Trusting the certificate

The generated certificate needs to be copied onto the test machine and imported into to
`Cert:\CurrentUser\Trusted People`, which tells the OS to trust the certificate. You can do this
with a PowerShell command:

```powershell
$password = Read-Host -AsSecureString
Import-PfxCertificate -CertStoreLocation "Cert:\LocalMachine\TrustedPeople" -Password $password -FilePath <FilePath>.pfx
```

You only need to do this the first time you use a certificate.
