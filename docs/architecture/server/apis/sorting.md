# Sorting

Notation follows the [APIs index](./index.md#notation).

APIs that support sorting `MUST` do so using a single query parameter named `sort` whose value is a
comma-delimited list of field names to sort by. Any field preceded by a hyphen `MUST` be interpreted
as descending.

**Examples**

| Example                   | Description                                                      |
| ------------------------- | ---------------------------------------------------------------- |
| `sort=name`               | Sort by the user's name ascending.                               |
| `sort=-name`              | Sort by the user's name descending.                              |
| `sort=name,email`         | Sort by the user's name and then by email.                       |
| `sort=name,-creationDate` | Sort by the user's name and then by most recently created first. |

The `sort` parameter is credited to [JSON:API](https://jsonapi.org/).
