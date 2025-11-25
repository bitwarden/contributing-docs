# SSH Agent

An SSH agent acts as a program that holds a set of private keys and provides a way to sign
challenges with those keys, without ever letting the private keys leave the vault. These challenges
can be sign-in requests for logging into a server and in newer SSH versions they can also be used to
sign arbitrary data e.g. Git commits, but also regular files.

## OS interface

On Unix-like systems (Mac, Linux, BSDs) the `ssh-agent` is provided via a Unix domain socket. The
agent provides this socket and any application that wants to use the agent connects via this socket.
This is done by getting the socket path from the `SSH_AUTH_SOCK` environment variable.

On Windows the agent is provided via a global named pipe at `\\.\pipe\openssh-ssh-agent`. Since only
a single application can act as the pipe server, the OpenSSH agent service first needs to be
disabled in Windows, after which the desktop app can start the agent listening on this pipe.

## SSH agent Protocol

The `ssh-agent` protocol is specified as a
[spec](https://tools.ietf.org/html/draft-miller-ssh-agent-00) however the desktop app only
implements a subset of this protocol, specifically the sign and list operations. List operations are
always allowed by default while sign operations require user verification.

### Signing during login

When logging into a server the client and server first exchange the set of algorithms they support
for key exchange and signing. The server has a host key which is saved locally. In contrast to TLS,
we don't have central authorities proving the authenticity of a server; the first time connecting to
a server the client will ask the user to verify the fingerprint of the server, saving it
subsequently to the `known_hosts` file. In subsequent authentication requests the client will
compare the fingerprint against the saved one, to prevent subsequent machine-in-the-middle attacks.

The client and server then agree on authentication methods that they can continue with e.g. public
key, password. For public keys the client then offers the public keys to the server and the server
will reply which keys it accepts. To prevent leaking the set of keys the client has they can
additionally configure to offer specific keys to a specific server.

The SSH client then for all accepted keys, one by one, asks the agent to sign the login request for
that specific key. This means that if a server accepts multiple keys the agent might be asked
multiple times to provide UV with different keys. These might be detectable by parsing the login
request to sign since it contains the user and server host key. The sign request does not contain
the IP or hostname of the server but this could be inferred using the `known_hosts` file.

Only if public key authentication fails will it fall back to password.

## Agent forwarding

Any clients can access the agent via the socket / pipe. Furthermore, SSH supports a feature called
agent forwarding -- forwarding can be used to log into a remote server A and allow that server to
access server B and authenticate to it without ever giving the keys to server A. While convenient
care has to be taken, both about which servers the agent is forwarded to, but also to always require
user verification for signing operations.

## SSH signatures

The SSH agent can not only sign login requests but also arbitrary data. The format for these
signature requests is specified at
[`Protocol.sshsig`](https://github.com/openssh/openssh-portable/blob/master/PROTOCOL.sshsig). During
a signature request the desktop app detects `SSHSIG` requests and parses the namespace, passing it
on to the UI to present.

## Verifying SSH client processes

In order to present details about which application is requesting access to the any SSH key,
information about the connecting process is gathered. On \*nix this works via the `SO_PEERCRED`
`socketopt`; this provides the PID of the connecting process. On Windows,
[`GetNamedPipeClientPRocessId`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getnamedpipeclientprocessid)
is used.

Using the process ID further information about the process (process name, signature, application
name, and application logo) can be acquired, but for now just the process name is used. Depending on
the client application the process hierarchy might look different and the process connecting might
be a one-time child process of the application that the user expects to connect.

When agent forwarding is used an `EXTENSION` command is sent to the client with the `extension_name`
set to
[`session-bind@openssh.com`](https://raw.githubusercontent.com/openssh/openssh-portable/refs/heads/master/PROTOCOL.agent).
This is detected and noted on the connection so that the clients can handle this appropriately.

## Architecture in the desktop app

The desktop app provides an `ssh-agent` implementation that provides signing functionality to
applications running on the system. Since the applications running on the system and remote
applications when forwarding the agent are untrusted, the agent requires user verification for
signing operations. In total, the SSH agent feature consists of multiple components:

- **Desktop Native:** the agent itself, handling the socket / pipe and signing requests.
- **Desktop Native:** a key store that holds the private keys and corresponding cipher IDs for the
  keys of the active and unlocked account.
- **Desktop Native and Electron:** a communication layer that allows the native module to show UV
  prompts in the UI.
- **Desktop Electron:** a UI component that shows the UV prompts and allows the user to accept or
  deny the signing request.

The key store is synced on an interval from the renderer process and receives the decrypted private
keys from the vault ciphers. When locking / changing users the private keys of the keystore are
wiped. When locking the public keys are kept so that listing still works -- this means that when
locked after unlocking once the correct SSH key for a server can be chosen and a signing request
made; this then prompts the user to unlock their vault in order to approve the request.
