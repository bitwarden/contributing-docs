# SSH Agent

An ssh agent acts as a program that holds a set of private keys
and provides a way to sign challenges with those keys. These challenges
can be sign in requests for logging into a server, and in newer SSH versions,
they can also be used to sign arbitrary data (git commits, but also regular files).

## OS interface

On Unix-like systems (Mac, Linux, BSDs), the ssh-agent is provided via a
Unix domain socket. The agent provides this socket and any application that
wants to use the agent connects via this socket, usually by getting the socket path
from the `SSH_AUTH_SOCK` environment variable.

On Windows, the agent is provided via a global named pipe at `\\.\pipe\openssh-ssh-agent`. For this,
the OpenSSH agent service needs to be disabled in Windows, at which point the Bitwarden desktop app
can start the agent listening on this pipe.

## SSH Agent Protocol

The ssh-agent protocol is specified at [SSH-Agent Spec](https://tools.ietf.org/html/draft-miller-ssh-agent-00).
However, Bitwarden Desktop only implements a subset of this protocol, specifically the sign and list operations.
List operations are always allowed by default, while sign operations require user verification.

### Signing during login
Logging into a server, the client and server first exchange the set of algorithms they support for key exchange and signing.
The server has a host key, which is saved locally. Since - in contrast to TLS - we don't have central authorities proving the
authenticity of a server, the first time connecting to a server the client will ask the user to verify the fingerprint of the server, saving it
subsequently to the `known_hosts` file.
In following authentication requests the client will check the fingerprint against the saved one, to prevent subsequent machine-in-the-middle attacks.

The client and server then agree on authentication methods that they can continue with (for instance public key, password).
For public keys, the client then offers keys to the server, and the server will reply which keys it accepts. To prevent
leaking the set of keys the client has, they can additionally configure to offer specific keys to a specific server.

The ssh client then, for all accepted keys - one by one - asks the agent to sign the login request for that specific key. This
means that if a server accepts multiple keys, the agent might be asked multiple times to provide UV with different keys. These
might be detectable by parsing the login request to sign, since it contains the user and server hostkey. The sign request does not
contain the IP or hostname of the server, but this could be inferred using the `known_hosts` file.

Only if public key authentication fails will it fallback to password.

## Agent forwarding

Any clients can access the agent via the socket / pipe. Further SSH supports a feature called agent forwarding.
Forwarding can be used to log into a remote server A, and allow that server to access server B and authenticate to it,
without ever giving the keys to server A. While convenient, care has to be taken, both about which servers the agent
is forwarded to, but also to require more user verification for signing operations.

## SSH Signatures

The ssh agent can not only sign login requests but also arbitrary data. While this is currently not parsed
and used by the Bitwarden Desktop app, the format for these signature requests
is specified at [Protocol.sshsig](https://github.com/openssh/openssh-portable/blob/master/PROTOCOL.sshsig).

## Architecture in Bitwarden Desktop

Bitwarden desktop provides an ssh-agent implementation that provides signing functionality to applications running on the system.
Since the applications running on the system, and remote applications when forwarding the agent are untrusted, the agent
requires user verification for signing operations. In total, the ssh agent feature consists of multiple components:

- [Desktop Native] The agent itself, handling the socket / pipe and signing requests
- [Desktop Native] A key store that holds the private keys and corresponding cipher id's for the keys of the active and unlocked account
- [Desktop Native & Desktop Electron] A communication layer that allows the native module to show UV prompts in the UI
- [Desktop Electron] A UI component that shows the UV promts and allows the user to accept or deny the signing request

The key store is synced on an interval from the renderer process and receives the decrytped private keys from the vault ciphers.
When locking / changing users, the keystore is wiped.
