---
sidebar_position: 23
---

# Paging

APIs `SHOULD` support paging and those that do `MUST` support either **offset/limit** style paging
or **cursor** style paging.

## Offset/limit style paging

APIs that implement offset/limit style paging do so via the following query parameters:

| Parameter      | Description                           |
| -------------- | ------------------------------------- |
| `page[number]` | The page number to return, one-based. |
| `page[size]`   | The number of resources to return.    |

Paging metadata `MUST` be populated within the `meta` field of responses as follows:

| Field        | Description                                         |
| ------------ | --------------------------------------------------- |
| `pageCount`  | The total number of pages.                          |
| `pageNumber` | The current page number.                            |
| `pageSize`   | The current page size.                              |
| `totalCount` | The total number of resources matching the request. |

**Example**

```
GET /api/v1/users?page[number]=1&page[size]=2
Accept: application/json
```

```json
{
  "data": [
    {
      "attributes": {
        "firstName": "Bob",
        "lastName": "Smith"
      },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "type": "user"
    },
    {
      "attributes": {
        "firstName": "Alice",
        "lastName": "Jones"
      },
      "id": "cacba8c1-29fa-4018-8950-acd400ec76b7",
      "type": "user"
    }
  ],
  "meta": {
    "pageCount": 5,
    "pageNumber": 1,
    "pageSize": 2,
    "totalCount": 9
  }
}
```

## Cursor-style paging

APIs that implement cursor-style paging do so via the following query parameters:

| Parameter     | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| `page[size]`  | The number of resources to return.                                 |
| `page[after]` | An opaque cursor. Returns the resources that follow that position. |

A cursor `MUST` be treated as opaque. Callers `MUST NOT` construct, parse, or modify one, and a
service `MAY` change its encoding at any time without a new API version.

Paging metadata `MUST` be populated within the `meta` field of responses as follows:

| Field      | Description                                                    |
| ---------- | -------------------------------------------------------------- |
| `pageSize` | The current page size.                                         |
| `hasMore`  | Whether more resources follow this page.                       |
| `cursor`   | The cursor to pass as `page[after]` to retrieve the next page. |

**Example**

```
GET /api/v1/users?page[size]=2&page[after]=dXNlcnM6NjJiZWQxODA
Accept: application/json
```

```json
{
  "data": [
    {
      "attributes": {
        "firstName": "Bob",
        "lastName": "Smith"
      },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "type": "user"
    },
    {
      "attributes": {
        "firstName": "Alice",
        "lastName": "Jones"
      },
      "id": "cacba8c1-29fa-4018-8950-acd400ec76b7",
      "type": "user"
    }
  ],
  "meta": {
    "cursor": "dXNlcnM6Y2FjYmE4YzEtMjlmYQ",
    "hasMore": true,
    "pageSize": 2
  }
}
```

The final page `MUST` return `hasMore` as `false` and `MUST` omit `cursor`.
