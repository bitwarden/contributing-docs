# Public API

The Bitwarden Public API provides organizations a suite of tools for managing members, collections,
groups, event logs, and policies. More information about the Public API is available in the
[Help Center](https://bitwarden.com/help/public-api/).

## Differences with the private API

Most developers will be more familiar with the private API used by our client applications. The
Public API is different in several key areas:

<!-- prettier-ignore -->
| Private API | Public API |
| --- | --- |
| Located at https://api.bitwarden.com | Located at https://api.bitwarden.com/public |
| Used by official Bitwarden client applications | Used by third parties, usually in custom integrations |
| Broad scope -- can be used for anything | Narrow scope -- can only be used to manage organizations |
| Can be changed without notice | Must give notice for any breaking changes
| Utilizes user credentials for authentication | Utilizes organization API key for authentication |

## Development guidelines

1. Avoid making breaking changes -- these are any changes that would require existing users of the
   API to update their integrations to avoid errors or unexpected behavior -- for example, make new
   properties optional, so that existing integrations do not have to supply a value
2. If you must make breaking changes, consider how to give advance warning to existing users.
   Communicate with Engineering, Product, and Customer Success Integration teams to coordinate any
   notice required and minimize impact
3. Do not use the same request/response models as the private API
4. Use [xmldoc comments](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/)
   to add documentation to your endpoints and models. These will be included in the SwaggerUI output

## Developing locally

When running in dev mode the Bitwarden server includes a
[SwaggerUI](https://swagger.io/tools/swagger-ui/) instance, similar to the one found on our
[Help Center](https://bitwarden.com/help/api/).

SwaggerUI can help you test any changes you make to the Public API without having to write your own
HTTP requests. You can also check how your xmldoc comments will be presented by SwaggerUI when the
Help Center is updated.

To use SwaggerUI:

1. Start your local development server (Api and Identity projects) and Web Vault
2. Navigate to http://localhost:4000/docs
3. Click "Authorize"
4. In a separate tab, open the Web Vault and navigate to your Organization Settings page. Click
   "View API Key"
5. Enter your organization's client_id and client_secret from the Web Vault into Swagger
6. You can now close the Web Vault and continue in Swagger
7. In the Scopes section, click "select all"
8. Click "Authorize" to close the dialog
9. You should receive a confirmation dialog. Click "Close"

You can now test the Public API by expanding any section, clicking "Try it out", editing the
request, and clicking Execute. The response will be displayed below. You can also verify that your
request worked by manually inspecting the organization in the Web Vault.
