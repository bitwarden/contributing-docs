---
sidebar_position: 1
---

# Vision

## Definitions of Terms

- **`[Domain]Service`**: A general term to refer to any Service we use to handle a domain’s
  concerns. Example would be CipherService, OrganizationService, etc. In general, a service
  beginning with a noun is an example of a `[Domain]Service`.
- **`StorageService`**: A service in charge of storing information to one of three locations: Disk,
  Secure Disk, or Memory.
- **Omniscient Class**: Any class that knows too much or does too many things.
- **Magic String**: A string used to specify behavior.
- **Account Switching**: The Bitwarden feature that allows switching between multiple accounts
  without logging out/back in. Developed at the end of 2021.
- **State**: The state is how something is; its configuration, attributes, condition or information
  content.

## Where We Are and How We Got Here

### `StorageService`

Before Account Switching, client state was handled entirely through direct calls to `StorageService`
objects and magic string keys. Setting and getting a value was distributed throughout the entire
application, rather than localized. If a class needed some stored data, it used a `get()` method on
`StorageService` with a specific key. This worked well while there were relatively few keys and the
storage model wasn't overly complex. With Account Switching, the state model was too complicated for
this distributed approach, we needed a centralized location to track which of the several similar
keys to grab. That is `StateService`.

### `StateService`

`StateService` works by maintaining an array of validated state and keeping track of which item in
this array to use at any given time. The current active user is always assumed to be the one a
`get()` or `set()` is referring to, so the item is stored/retrieved using that user. What’s more,
`StateService` is often used to hold an in-memory cache of decrypted items, due to its ability to
synchronize data across contexts.

#### `StateService` Pain Points

##### In-memory and on-disk items are held in the same object

`Account` is used to store all data about an account regardless of storage location. This was done
because we assumed that services would regularly change storage locations on a call-by-call basis.
This never happened and we now have complex logic to manage the overly dangerous serialization of an
object potentially containing decrypted secrets.

##### `StateService` is an omniscient class

Our primary pain point when creating `StateService` was the use of magic strings. It was thought
that by limiting these strings to object keys we would create a safer storage system. This is true,
but it centralizes any and all data that can be stored to a single class.

## Where We’re Going and Why

We have an ultimate design in mind for state management in Bitwarden clients:

- Clients are responsive to state data updates
  - Simplifies visualization layer by leveraging Angular in a more effective way
  - Improves UX by reducing need for full refresh events
- State updates are broadcast through RxJS Observables
  - Allows for caching of data for free through `BehaviorSubject`s
  - Allows for arbitrary subscription to data without the need for any implementation details of the
    service
- Specific state items are managed entirely by the services that control the particular pieces of
  data
  - Separation of concerns improves code isolation and maintainability
  - Deconstructs `StateService` omniscient class
  - Reduces overall dependency count due to removal of god class
- `StateService` exists to be a container of the various storage locations
  - Single responsibility → to correctly route data to the appropriate storage location
- Services eventually will be reduced to providers, providing instances of classes populated with
  state via an Observable
  - Single responsibility → to announce changes to the state object they control
  - Observed classes would be responsible for the various helper methods now controlled by
    `<Domain>Services`

In general the above architecture's goals are to:

- Simplify and reduce the responsibility of all objects
- Allow for a reactive application design
