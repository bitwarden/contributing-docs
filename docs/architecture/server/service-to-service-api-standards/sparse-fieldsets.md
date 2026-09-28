---
sidebar_position: 25
---

# Sparse fieldsets

APIs `MAY` allow callers to specify which fields to return. Those that do `MUST` accept a `fields`
query parameter whose value is a comma-delimited list of the fields to include. `id` and `type` are
always returned.

**Example**

```
GET /api/v1/users?fields=firstName,lastName
```
