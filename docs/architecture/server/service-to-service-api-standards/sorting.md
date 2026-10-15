# Sorting

APIs that support sorting `MUST` take one `sort` parameter holding a comma-delimited list of fields.
A field preceded by a hyphen `MUST` be sorted descending.

| Example                    | Meaning                                      |
| -------------------------- | -------------------------------------------- |
| `sort=lastName`            | Last name, ascending.                        |
| `sort=-lastName`           | Last name, descending.                       |
| `sort=lastName,firstName`  | Last name, then first name.                  |
| `sort=lastName,-createdAt` | Last name, then most recently created first. |

The `sort` parameter is credited to [JSON:API](https://jsonapi.org/).
