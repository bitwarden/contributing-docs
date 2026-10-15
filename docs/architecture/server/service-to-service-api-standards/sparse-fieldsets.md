---
sidebar_position: 22
---

# Sparse fieldsets

APIs `MAY` let callers choose which fields to return. Those that do `MUST` take one `fields`
parameter holding a comma-delimited list, such as `fields=firstName,lastName`. `id` and `type` are
always returned.

The `fields` parameter is credited to [JSON:API](https://jsonapi.org/).
