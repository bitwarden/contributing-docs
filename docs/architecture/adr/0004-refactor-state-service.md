---
adr: "0004"
status: In progress
date: 2022-06-30
tags: [clients, angular]
---

# 0004 - Refactor State Service

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

This ADR builds upon [Adopt Observable Data Services for Angular][observable].

The Bitwarden clients currently have a quite complex state architecture, where all the state is
handled by a single service. This has resulted in everything being tightly coupled to the
`StateService` essentially making it a God object.

Additionally any service or component can directly access any state using the state service. Which
makes it difficult to follow the state lifecycle of each data type, and introduces uncertainty in how
the data is accessed.

## Decision Outcome

We should refactor the state service to be a generic storage container.

- Good: Eliminates the "good" functionality of the state service
- Good: State is maintained by the service which owns it.
- Good: No arbitrary access of data.
- Bad: Brings back arbitrary keys that must be unique.

### Example

```ts
interface StateService {
  getAccountData<T>: (account: Account, key: string, options?: StorageOptions) => Promise<T>;
  saveAccountData: (account: Account, key: string, options?: StorageOptions) => Promise<void>;
  deleteAccountData: (account: Account, key: string, options?: StorageOptions) => Promise<void>;

  deleteAllAccountData: (account: Account);

  getGlobalData<T>: (key: string, options?: StorageOptions) => Promise<T>;
  saveGlobalData: (key: string, options?: StorageOptions) => Promise<void>;
  deleteGlobalData: (key: string, options?: StorageOptions) => Promise<void>;
}
```

```ts
// StorageKey is an internal constant, and should be prefixed with the domain.
//  DO NOT EXPORT IT.
const StorageKey = "organizations";

class OrganizationService {
  async save(organizations: { [adr: string]: OrganizationData }) {
    await this._stateService.saveAccountData(this._activeAccount, StorageKey, organizations);
    await this._organizations$.next(await this.decryptOrgs(this._activeAccount, organizations));
  }
}
```

[observable]: ./0003-observable-data-services.md
