# Passkeys

Bitwarden uses passkeys to provide users with a secure and convenient alternative to passwords. In
this context Bitwarden can act as both a Relying Party (RP) and a Passkey Provider (PP). In other
words: You can use passkeys to log in to Bitwarden but you can also use Bitwarden to generate and
store passkeys for logging into other applications.

## What are passkeys?

Passkeys are another name given to the credentials defined by the two specifications:

- World Wide Web Consortium’s (W3C) Web Authentication (WebAuthn)
- FIDO Alliance’s Client-to-Authenticator Protocol (CTAP)

which together make up what is usually referred to as the FIDO2 standard.

At the core FIDO2 is based on public-key cryptography, where each passkey contains a unique
public/private key-pair. The public key is given to an application during the initial credential
creation ceremony, while the private key is never shared. The private key is then used in all
subsequent requests to sign challenges from the application to prove ownership of the key.
