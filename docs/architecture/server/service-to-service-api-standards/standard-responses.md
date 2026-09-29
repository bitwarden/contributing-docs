---
sidebar_position: 10
---

# Standard responses

APIs `SHOULD NOT` document standard responses because these responses apply to every API and
documenting them over and over again just creates noise. The following responses are possible for
every API:

| Response | Description                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------- |
| `400`    | A malformed request (i.e. invalid JSON).                                                                 |
| `401`    | The caller isn't [recognized](./authentication-and-authorization.md) (i.e. not authenticated).           |
| `403`    | The caller isn't [authorized](./authentication-and-authorization.md) to invoke the API (i.e. forbidden). |
| `404`    | The resource specified via the URL path does not exist (or the caller isn't allowed to know it exists).  |
| `405`    | The HTTP method is not allowed.                                                                          |
| `406`    | The API doesn't return the specified media type.                                                         |
| `409`    | The attempted update conflicts with some other update (i.e. was changed since the caller last read it).  |
| `415`    | The API doesn't accept the specified media type.                                                         |
| `422`    | An error the client can fix.                                                                             |
| `429`    | The caller has made too many requests.                                                                   |
| `500`    | An unexpected error the client cannot fix.                                                               |
| `501`    | The API has just been stubbed out and has not been implemented, yet.                                     |
| `503`    | The request cannot be completed because a dependency is unavailable or timed out.                        |

## 400 vs. 422

- Return `400` for requests that are malformed and cannot even be parsed (e.g. invalid JSON).
- Return `422` for invalid requests. See [Request validation](./request-validation.md).

## 403 vs. 404

- Return `403` for attempts to read, write, or act upon resources the user is allowed to know exist.
- Return `404` for attempts to read, write, or act upon resources the user should _not_ know exist.

## 404 vs. 422

- If the resource specified by the URL is **not found**, or the caller should not know it exists,
  APIs `MUST` return `404`.
- If the resource specified by the URL is **found**, but a resource referenced within the payload
  does not exist (or the caller should not know it exists), APIs `MUST` return `422`.

## 500 vs. 503

- Return `500` for unexpected errors that occur within the service that the client cannot fix. By
  definition, a `500` is a bug.
- Return `503` if some dependency of the service is down or unreachable or times out.
