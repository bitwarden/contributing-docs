---
adr: "0016"
status: Accepted
date: 2022-11-28
tags: [clients, typescript]
---

# 0016 - Move Decryption and Encryption to Views

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

Bitwarden has a couple of different models for representing data described in detail in
[Data Model](../clients/data-model.md). In this ADR we will focus on the following two models:

- `<Domain>` - The domain model which represents the encrypted data state.
- `<Domain>View` - The view model which represents the decrypted state of domain models.

Since we have at least two different models representing the encrypted and decrypted state of the
same _Domain_, this also means we need a way to convert between the two models i.e. encrypting and
decrypting the data.

### How it's currently being done

The way this is currently done is by having the `<Domain>Service` expose either an _Observable_
which contains the decrypted views, or by having a promise based method to decrypt it. The
`<Domain>Service` also typically expose a `encrypt` method which converts from the `View` and the
`Domain` model.

There is also typically a `decrypt` method on `Domain` models themselves which performs the actual
decrypting logic. It does so by calling `decrypt` on the `EncString` objects which in turn relies on
a global container service to retrieve the `CryptoService` and `EncryptService` for performing the
actual operations.

### The problems

There are a couple of problems with this approach:

- A _Domain_ model is tightly coupled to a _View_ model.
- Encryption and decryption are split into two different places. Decryption happens directly on the
  domain model, while encryption happens in the service. Logically these are tightly coupled and
  should be located next to each other.
- We rely on a global container service to retrieve the `CryptoService` and `EncryptService`.
- Our current models acts as a transformation pipeline. `Request -> Data -> Domain -> View`.
- It would be nice to have a way to support multiple `View` models per domain in the future.

### Why now?

Secret Manager is currently experiencing some friction with how encryption and decryption is
currently managed. It doesn't follow the typical pattern of having a synced local state and instead
relies on direct requests to the server to fetch data. The data then needs to be decrypted.

Currently this encryption and decryption logic is handled by the `<Domain>Service` however this
violates the single responsibility principle. It also makes our services difficult to follow since
it now needs to be aware of requests, responses, encryption and decryption.

## Considered options

- **Move decrypt to `<Domain>Service`** - We already have services for the different domains which
  also currently handle encryption, so it would make sense to move the logic there.
- **Move logic to `<Domain>View`** - Move the logic to the `View` models themselves, combined with a
  generic service to encrypt and decrypt views.

## Decision outcome

Chosen option: **Move logic to `<Domain>View`**.

### Positive consequences

- Domain services no longer need to implement customized encryption and decryption logic. Which
  follows the single responsibility principle.
- Domain models are no longer tightly coupled to views.
- We can now have multiple views per domain.

### Negative consequences

- Since encryption and decryption is now done on the generic `EncryptService` this makes it possible
  to bypass expected flows. One example of this is `Cipher`, `CipherService` has a
  `updateHistoryAndEncrypt` method which calculates the password history before encrypting it.

### Implementation

Example [PR for Folders](https://github.com/bitwarden/clients/pull/3732).

```ts
class FolderDomain implements DecryptableDomain {
  id: string;
  name: EncString;
  revisionDate: Date;

  keyIdentifier(): string | null {
    return null;
  }
}

class FolderView implements Encryptable<Folder> {
  id: string = null;
  name: string = null;
  revisionDate: Date = null;

  keyIdentifier(): string | null {
    return null;
  }

  async encrypt(encryptService: EncryptService, key: SymmetricCryptoKey): Promise<Folder> {
    const folder = new Folder();
    folder.id = this.id;
    folder.revisionDate = this.revisionDate;

    folder.name = this.name != null ? await encryptService.encrypt(this.name, key) : null;

    return folder;
  }

  static async decrypt(encryptService: EncryptService, key: SymmetricCryptoKey, model: Folder) {
    const view = new FolderView();
    view.id = model.id;
    view.revisionDate = model.revisionDate;

    view.name = await model.name?.decryptWithEncryptService(encryptService, key);

    return view;
  }
}
```

Which would be used like this:

```ts
// Fetch from server
const response: FolderResponse = await this.folderApiService.getFolder(id);
const folderData: FolderData = new FolderData(response);
const folder: Folder = new Folder(folderData);

// Decrypt / Encrypt
const folderView: FolderView = this.encryptionService.decryptView(FolderView, folder, key);
folderView.name = "New folder name";
const encryptedFolder: Folder = this.encryptionService.encryptView(folderView, key);

// Update
const request: FolderRequest = new FolderUpdateRequest(encryptedFolder);
```
