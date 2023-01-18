---
sidebar_custom_props:
  access: bitwarden
---

# Microsoft Store

To debug the Microsoft Store application you need to generate a Code Signing certificate which can
be done using the following powershell command:

```powershell
New-SelfSignedCertificate -Type Custom `
  -Subject "CN=ElectronSign, 0=Your Corporation, C=US" `
  -TextExtension @("2.5.29.19={text}false") `
  -KeyUsage DigitalSignature `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}") `
  -FriendlyName ElectronSign `
  -CertStoreLocation "Cert:\CurrentUser\My"
```

The generated certificate needs to be copied into to `Cert:\CurrentUser\Trusted People`, which tells
the OS to trust the certificate. This is easiest done using the `certmgr` tool.

The [Windows SDK][sdk] is required in order to access the signtool.

```powershell
npm run dist:win

cd dist
"C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64\signtool.exe" sign /v /fd sha256 /n "14D52771-DE3C-4886-B8BF-825BA7690418" .\Bitwarden-2022.<version>.appx
```

[sdk]: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/
