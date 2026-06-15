# Lock states

A Bitwarden client moves between several distinct states over its lifetime, and which secrets are
available depends on the state. The most important distinction is between a vault that has been
unlocked at least once since the app started and one that has not. Some secrets are deliberately
held in memory only, never persisted at rest, and can only be re-hydrated by unlocking the vault
(see [Memory hardening](./memory-hardening.md)). As a result, the same feature can behave
differently depending on the current state.

## States

| State            | Description                                                                                                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Logged out**   | No account is loaded. No keys or secrets are present.                                                                                                                                                                                    |
| **Locked (BFU)** | _Before First Unlock._ An account is loaded but has not been unlocked since the process started (fresh launch, after a restart, or after a process reload). Only data persisted at rest is available; in-memory-only secrets are absent. |
| **Locked (AFU)** | _After First Unlock._ The vault was unlocked at least once during this session and then locked. In-memory-only secrets derived during the first unlock are still retained in protected memory.                                           |
| **Unlocked**     | The user key is available and the vault is fully decrypted and usable.                                                                                                                                                                   |

The **first** unlock is what moves the app out of the BFU state. Once unlocked, subsequent locks
land in the AFU state rather than BFU, because the in-memory secrets remain available. The app only
returns to BFU (or logged out) when the in-memory state is cleared — for example on a process
reload, app restart, or logout.

## Feature impact

Several features depend on secrets that are only available after the first unlock. In the BFU state
those secrets are absent, so the feature is either unavailable or behaves differently.

### PIN unlock

When PIN unlock is configured to require a master password reprompt, the material needed to satisfy
the reprompt is only retained in memory after the first unlock. In the AFU state the PIN can be used
to unlock directly. In the BFU state that material is not present, so the user must fall back to a
full master password unlock. To prevent the application from going back into the BFU state, PIN
unlock may prevent process reload from occuring.

### Biometrics

Biometric unlock relies on the biometric unlock key being held in protected memory while the app is
locked (via the `EncryptedMemoryStore` abstraction, see
[Memory hardening](./memory-hardening.md#process-isolation-and-key-protection-on-desktop-apps)).

- On **Linux** the biometric unlock key is only ever held in memory, so biometric unlock always
  requires the AFU state and is unavailable in BFU.
- On **Windows** availability depends on the configured setting; depending on that setting the key
  may be recoverable in BFU as well.

### SSH agent

The [SSH agent](./ssh/agent.md) holds the private keys of the active, unlocked account and wipes
them on lock. The public keys, however, are kept on lock so that listing still works. This means
that in the AFU state a client can list the available keys, the correct key for a server can be
chosen, and a signing request can be made — which then prompts the user to unlock their vault to
approve the request. In the BFU state no keys are present, so listing returns nothing.

## Why secrets are re-hydrated rather than persisted

These in-memory-only secrets are intentionally not stored at rest. A locked vault must remain secure
even if the device is compromised after locking (see the security principle
[A locked vault is secure](../security/principles/02-locked-vault-is-secure.mdx)). Keeping the
secrets in memory only — and clearing them on process reload — limits the window in which they exist
and avoids leaving them recoverable from disk. They are re-hydrated on each unlock rather than read
back from persistent storage.
