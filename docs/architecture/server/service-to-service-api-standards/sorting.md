---
sidebar_position: 21
---

# Sorting

APIs that support sorting `MUST` take one `sort` parameter holding a comma-delimited list of fields.
A field preceded by a hyphen `MUST` be sorted descending. For example, `sort=lastName,-createdAt`.

The `sort` parameter is credited to [JSON:API](https://jsonapi.org/).
