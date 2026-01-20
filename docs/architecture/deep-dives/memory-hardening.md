# Memory Hardening

While protecting against user-space memory attacks in the general case is not within the threat
model for Bitwarden applications, the lock state must be protected, and it should not be possible to
unlock a locked vault. Because of this, passwords or keys cannot be left behind in memory in an
accessible state. Besides this requirement, some features such as SSH agent need process hardening
where possible, as required by the protocol specification.

## Zeroizing and process reload

To clear secrets on locking, Bitwarden clients use two techniques, zeroizing and process reload. For
any memory that lives in Rust, memory is overwritten with zeroes, as soon as it becomes unused or
gets dropped, which is implemented in
[lib.rs](https://github.com/bitwarden/sdk-internal/blob/4591981820f12a24e64609fb0a9fd4fdaabbb216/crates/bitwarden-crypto/src/lib.rs#L13).
This hardens the SDK, and the Rust desktop module (desktop native) against memory being left behind.
Process reload wipes the entire process - on the web app by reloading the page, on browser
extensions by reloading the extension, and on desktop by force-crashing the renderer process in the
[process reload service](https://github.com/bitwarden/clients/blob/16e67566436ae7becbea85f900656c437204824b/libs/common/src/key-management/services/default-process-reload.service.ts#L22).
The assumption here is that since the process dies, the memory gets wiped too. JavaScript does not
provide mechanisms for reliably zeroizing memory. Secrets or partial secrets frequently remain in
memory even after garbage collection cycles complete.

## Process isolation and key protection on desktop apps

Next to process reload and zeroizing, desktop apps can use OS-level protections to harden memory.
There are two mechanisms used here: Process isolation and key protection. Process isolation uses
OS-level features to isolate the process from debugger access. Windows and desktop Linux by default
allow user-space processes to debug other user-space processes and read memory. MacOS does not allow
this by default and requires user consent to allow a process to debug another process. On Linux,
some distributions such as Ubuntu use
[yama.ptrace_scope](https://www.kernel.org/doc/Documentation/security/Yama.txt) to limit ptrace
access.

To harden against user-space memory attacks, Bitwarden desktop isolates the main process. On
Windows, [`DACL`](https://learn.microsoft.com/en-us/windows/win32/secauthz/dacls-and-aces) is used
to restrict access to the process, on Linux
[`PR_SET_DUMPABLE`](https://man7.org/linux/man-pages/man2/pr_set_dumpable.2const.html) is used to
disable ptrace access and on MacOS the process is hardened using the Hardened Runtime entitlements,
and also by using `PT_DENY_ATTACH` to prevent debugger attachment. On Linux, a dynamic library that
sets [`PR_SET_DUMPABLE`](https://man7.org/linux/man-pages/man2/pr_set_dumpable.2const.html) is also
injected into the renderer processes by injecting a shared object into the renderer processes in the
[process isolation library](https://github.com/bitwarden/clients/blob/16e67566436ae7becbea85f900656c437204824b/apps/desktop/desktop_native/process_isolation/src/lib.rs),
so that these are isolated too. These mechanisms apply to all apps except for the Snap desktop app.
Snap does not support
[`PR_SET_DUMPABLE`](https://man7.org/linux/man-pages/man2/pr_set_dumpable.2const.html) currently and
breaks file picker support, due to a [bug](https://github.com/flatpak/xdg-desktop-portal/issues/785)
in the desktop portal.

Next to hardening the entire process, operating systems offer mechanisms to protect cryptographic
keys in memory. On Windows,
[`DPAPI`](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectmemory) can
be used to encrypt a key in memory, with a key bound to the process. On Linux,
[`memfd_secret`](https://man7.org/linux/man-pages/man2/memfd_secret.2.html) and
[`keyctl`](https://man7.org/linux/man-pages/man1/keyctl.1.html) are available, each of which can be
used to store keys in memory while preventing other processes from reading them. This is used to
hold the biometric unlock key in memory while the desktop app is locked. Access to this protected
memory is available via the
[`EncryptedMemoryStore`](https://github.com/bitwarden/clients/blob/16e67566436ae7becbea85f900656c437204824b/apps/desktop/desktop_native/core/src/secure_memory/encrypted_memory_store.rs#L16)
abstraction that automatically uses the correct memory protection.
