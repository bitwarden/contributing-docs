---
sidebar_position: 7
---

# Troubleshooting

## Build errors / npm dependency errors

If you're receiving npm dependency errors when you try to build a client app, make sure that you've
run `npm ci` in the root directory of the repository only. You should never run `npm i` or `npm ci`
in any other directory (such as in a client app directory).

You can double check this by searching for `node_modules` in the `libs` and `apps` directories:

```bash
find apps -name node_modules
find libs -name node_modules
```

Delete any results of these searches and try building the app again.

If you're still encountering build errors, you can try deleting the `node_modules` folder in the
root of you repository, re-running `npm ci`, and then building the app again.
