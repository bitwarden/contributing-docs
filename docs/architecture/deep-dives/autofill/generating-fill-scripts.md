---
sidebar_position: 2
---

# Generating and Executing Fill Scripts

This documentation assumes you have an understanding of
[Page Detail Collection](collecting-page-details.md), which is the first part of the Autofill
process.

Once the page details have been collected from the page source by the `autofill-init.ts` content
script, the next step is to generate what we call a "fill script". A fill script is a sequence of
instructions that tell the `autofill-init.ts` content script what fields to fill and with what data
it should fill each field.

The generation of fill scripts is the responsibility of the
[`AutofillService`](https://github.com/bitwarden/clients/blob/master/apps/browser/src/autofill/services/autofill.service.ts).
There are three method used to perform fill script generation:

- `doAutoFill()`
- `doAutoFillOnTab()`
- `doAutoFillActiveTab()`

All of these methods will execute the same `generateFillScript()` private method to actually
generate the fill script, but the separate methods provide different entry points for syntactic
sugar.

## Generating the fill script

The generation of the fill script takes place in the `generateFillScript()` method. We will examine
in more detail how the script is generated below.

### Input

The following information is provided to the `generateFillScript()` method:

1. The page details, which represent the information collected from the page in `autofill-init.ts`.
   It includes:
   - A list of AutoFillForm objects, representing each Form on the page
   - A list of AutoFillField objects, representing each Field on the page
2. The CipherView to fill in on the page
3. The user's fill options

### Output

The result of the generation routine is a fill script, which is a series of instructions (hence
"script") to tell the filler what to do to the page.

The script contains an array of instructions with the following types, each of which has a
corresponding `opid` unique identifier to tie it to an element on the page details:

| Instruction Type | Description                                               |
| ---------------- | --------------------------------------------------------- |
| `click_on_opid`  | Click on the element represented by `opid`                |
| `focus_by_opid`  | Set focus to the element represented by `opid`            |
| `fill_by_opid`   | Fill the element represented by `opid` with value `value` |

The goal of these instructions is to simulate - to the best of our ability - how the page would
respond to an actual user entering the value into the HTML element. This is why you will see a
**Click -> Focus -> Fill** sequence often; that simulates what a user would do when entering data.

### Processing

The logic for generating the script has two parts:

- Handle custom fields, and
- Handle Cipher type-specific fields

For custom fields, the logic is straightforward: the user has defined the field attribute name, so
we just need to find it in the DOM. If a matching field is found, we find its `opid` and add three
commands to the script:

1. `click_on_opid`
2. `focus_by_opid`
3. `fill_by_opid`

For Cipher type-specific fields, the logic is dependent upon the type. We will look at each one in
turn below.

#### Login

The core of a `Login` type is a username and password. The easiest field to find is often the
password, so the routine looks for a password field and then tries to find the most likely candidate
for a username field that is nearby in the DOM.

For each field in the Page Details collected from the DOM, we check to see if the following
properties contain the word "password":

- `htmlID`
- `htmlName`
- `placeholder`

These will be our "password fields" to fill in on the forms.

Now, we loop through each form on the page. For each of these forms, we examine each password field,
find the password field on the form, and then try to find the corresponding username field. This is
done by looking at all fields in the Page Details **prior** to the password in the DOM and finding
either:

- An exact match from the
  [`UsernameFieldNames`](https://github.com/bitwarden/clients/blob/master/apps/browser/src/autofill/services/autofill-constants.ts)
  list, or
- The text, email, or telephone field closest to the password field in the DOM

If we can't find any forms that have our password fields on them, we take the first password field
on the page and use the input field just before it as the username.

##### Handle Pages with no Password Fields

If we can't find any password fields on the page at all, we use a "fuzzy match" to see if there are
any username matches. We don't want to put any passwords based on a fuzzy match and accidentally
exposing them on the screen; these are just usernames. We use this list to do the fuzzy match
against. We remove all carriage returns, line breaks, and casing on the Page Details fields and
compare against this list, looking for a potential match.

##### Adding the Fill Instructions

If we are able to find matching username and password fields, we add instructions to the fill script
for each of them, by `opid`:

1. `click_on_opid`
2. `focus_by_opid`
3. `fill_by_opid`

#### Card

The goal of the logic on the Card fill is to find the fields on the page to match the typical credit
card entry:

- Cardholder Name
- Card Number
- Card Expiration Month
- Card Expiration Year
- Card Security Code (CCV)
- Card Brand

To attempt to autofill the card information, we loop through every field on the Page Details array.
For that field, we then loop through all of the field's attributes from the `CardAttributes` list:

- `autoCompleteType`
- `data-stripe`
- `htmlName`
- `htmlID`
- `label-tag`
- `placeholder`
- `label-left`
- `label-top`
- `data-recurly`

In the
[`CreditCardAutoFillConstants`](https://github.com/bitwarden/clients/blob/master/apps/browser/src/autofill/services/autofill-constants.ts),
we define a static list of possible matching values for each of the fields on the Card Cipher type.
For example, we define a `CardHolderFieldNames` array, which has all of the attribute values that we
look for to find the likely "Cardholder Name" field in the DOM - and thus the field we want to fill
with the cardholder's name. We use the `isFieldMatch()` method on the `AutoFillService` to compare
each attribute's value on each field to see if it matches.

If we are able to find matching fields, we add instructions to the fill script for each of them, by
`opid`:

1. `click_on_opid`
2. `focus_by_opid`
3. `fill_by_opid`

#### Identity

The goal of the logic on the Identity fill is to find the fields on the page to match the identity
defined in Bitwarden, with the following fields:

- Title
- First Name
- Middle Name
- Last Name
- Address 1
- Address 2
- Address 3
- City
- Postal Code
- Company
- Email
- Phone
- Username

To attempt to autofill the identity information, we loop through every field on the Page Details
array. For that field, we then loop through all of the field's attributes from the
`IdentityAttributes` list:

- `autoCompleteType`
- `data-stripe`
- `htmlName`
- `htmlID`
- `label-tag`
- `placeholder`
- `label-left`
- `label-top`
- `data-recurly`

In the
[`IdentityAutoFillConstants`](https://github.com/bitwarden/clients/blob/master/apps/browser/src/autofill/services/autofill-constants.ts),
we define a static list of possible matching values for each of the fields on the Identity Cipher
type. For example, we define a `FirstnameFieldNames` array, which has all of the attribute values
that we look for to find the likely "First Name" field in the DOM - and thus the field we want to
fill with the identity's first name. We use the `isFieldMatch()` method on the `AutoFillService` to
compare each attribute's value on each field to see if it matches.

If we are able to find matching fields, we add instructions to the fill script for each of them, by
`opid`:

1. `click_on_opid`
2. `focus_by_opid`
3. `fill_by_opid`

## Performing the Fill

When the script has been generated, the `AutoFillService` issues a `fillForm` command. The
`autofill-init.ts` content script is listening for that command and performs the action of filling
in the content on the page based on the instructions in the script. The logic that fills this
content is structured within the
[`InsertAutofillContentService`](https://github.com/bitwarden/clients/blob/master/apps/browser/src/autofill/services/insert-autofill-content.service.ts)
class.
