---
sidebar_position: 24
---

# Sorting

APIs that support sorting `MUST` do so using a single query parameter named `sort` whose value is a
comma-delimited list of field names to sort by. Any field preceded by a hyphen `MUST` be interpreted
as descending.

**Examples**

| Example                   | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `sort=lastName`           | Sort by the user's last name ascending.              |
| `sort=-lastName`          | Sort by the user's last name descending.             |
| `sort=lastName,firstName` | Sort by the user's last name and then by first name. |
