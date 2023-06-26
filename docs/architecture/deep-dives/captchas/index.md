# Captchas

## When are Captchas required?

Captchas are required at two places in the Bitwarden codebase:

- Registration, via the `[CapchaProtected]` attribute
- Login, via the `ResourceOwnerPasswordValidator`

Each of these cases have slightly different validation for whether a captcha is required.

### Registration: `[CaptchaProtected]` anonymous endpoint

The only endpoint protected with the `[CaptchaProtected]` attribute is the `/register` endpoint on
the Identity service. This endpoint is anonymous, so no authentication middleware can perform the
captcha checks.

For these requests, the server requires a captcha if either of the following are true:

- The CloudFlare `x-Cf-Is-Bot` header is present on the request, or
- The `ForceCaptchaRequired` setting is enabled

### Login: Token requests authenticated with Resource Owner Password authentication

Requests against `/identity/connect/token` in the Identity service are validated with the
`ResourceOwnerPasswordValidator`. In this validator, we perform different checks to see if a captcha
is required, since the endpoint is authenticated and we know the user from the request (assuming
they are authenticated successfully).

No captchas are ever required for known devices. This check is performed before any of the rules
below are applied.

For these requests, the server requires a captcha if **any** of the following are true:

- The CloudFlare `x-Cf-Is-Bot` header is present on the request
- The `ForceCaptchaRequired` setting is enabled
- The instance is cloud-hosted and the user’s email address is not verified
- The failed login count is greater than the `MaximumFailedLoginAttempts` setting

The CLI performs the same captcha checks on the bw login command, but instead of prompting for a
captcha it accepts the API client secret. The server handles this API client secret as a “captcha
response” in the logic below.

## How do Captchas work in our code?

At a high level, the server **initiates** and **validates** captcha requirements, and the client
handles that requirement by **displaying the captcha** and **gathering the response** to validate
server-side.

In more detail, the process is as follows:

1. The server receives a request requiring a captcha using the rules defined above.
2. The server then responds with a response containing our `HCaptcha_SiteKey`, which the client
   interprets as “this request requires a captcha”.
3. The front-end displays the captcha `<div>` based on this response, using the `showCaptcha()`
   method on the `CaptchaProtectedComponent`.
4. The `CaptchaProtectedComponent` takes as input a `CaptchaIFrame` component, which contains the
   actual captcha UI.
5. `CaptchaProtectedComponent` handles the `successCallback` of the `CaptchaIFrame` by setting the
   `captchaToken` property to the value from the captcha response.
6. The user can then initiate the action again (logging in, registering, etc.). The `captchaToken`
   will be sent with the request as another element in the body.
7. The server validates the request in the `HCaptchaValidationService` by `POST`ing a message to
   https://hcaptcha.com/siteverify containing the token and our site key.

### What is a Captcha Bypass Token?

There are scenarios where there are multiple requests from the same user to one of the
captcha-protected endpoints. We want to “bypass” the captcha requirement on subsequent requests
based on the fact that they have already filled out the captcha before, even if those subsequent
requests would have required a captcha by the definition of the rules above.

We do this with a captcha bypass token. This is a token created on the server for the first request
when the captcha is verified, containing:

- User ID
- User email
- Expiration date (5 minutes from generation)

Because the captcha bypass token is generated with the user’s information, it is only checked on the
Login captcha validation. It doesn’t make sense to check in the Register captcha validation, because
a registering user would not have a valid User ID.

The token is protected using our data protection key on the server and sent back in the
`CaptchaBypassToken` element with the format `BWCaptchaBypass_{tokenContents}`.

The client can then use that `captchaResponse` in subsequent requests for the next 5 minutes from
that same user in order to bypass the captcha requirements. The server-side code treats this bypass
token the same way as it treats a `captchaResponse` gathered from the display of the captcha UI.

Captcha bypass tokens are not needed in most user flows, because the user is logging in from a known
device. Logging in from a known device bypasses all captcha requirements, so a token is not
required.
