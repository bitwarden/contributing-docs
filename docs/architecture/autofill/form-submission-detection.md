---
sidebar_position: 3
---

# Form Submission Detection

## Why is Form submission detection important?

Form submission detection is important for several reasons:

- It allows the Bitwarden extension to prompt the user to add new credentials to their vault,
  increasing the user's footprint in Bitwarden.
- It allows us to accurately handle password change detection and help the user keep their data in
  sync, providing a better user experience.

## Why is Form submission detection difficult?

The reason why the detection of forms and their submission is difficult because of the flexibility
of modern progressive web apps (PWAs) and single-page applications (SPAs). In classic HTML, a
`<form>` element is defined along with a `<submit>` that submits all of the form data to the user.

On the other hand, in modern applications a `<form>` element can be used to collect user data, but a
completely separate API request sends the form data to the server. For a good overview of the
complexities, see
[this](https://developer.mozilla.org/en-US/docs/Learn/Forms/Sending_forms_through_JavaScript)
excellent documentation.

## What is involved in Form submission detection?

### Initial Collection

We must accurately collect the page details to capture the fact that there are forms on the page.

### DOM Manipulation

We must handle cases where the application is modifying the DOM based on user interaction.

### Submission Detection

We must be able to detect when a Form is submitted so that we can properly notify the user to save
their credentials.

## How is this handled today?

The form submission detection is handled in the `notificationBar.ts` content script.

### Detecting DOM changes for new forms

A `MutationObserver` is attached to the window and runs every 1000 milliseconds. It observes the DOM
for any changes that include a form element has not yet been collected (using the
`data-bitwarden-watching` data element on the form to see whether it has been collected).

If a form element is detected that is new, the [Page Detail collection](collecting-page-details.md)
process is triggered to retrieve the page details.

### Detecting form submission

Form submission is detected by attaching an event to each form `submit()` button on the DOM. This is
done upon receipt of the `notificationBarPageDetails` command by the `notificationBar.ts` content
script.
