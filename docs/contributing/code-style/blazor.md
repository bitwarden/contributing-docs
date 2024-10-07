# Blazor

## Writing a component or page

Every page of component should be divided into at least one or more parts:

- *.razor: The HTML template of the component or page.
- *.razor.cs (optional): The C# code-behind file of the component or page.
- *.razor.css (optional): The CSS file of the component or page.
- *.razor.js (optional): The JavaScript file of the component or page.
- Unit tests

### Naming conventions

- Pages:
  - Have the suffix `Page` in the file name.

### Forms

- Form binding is obligatory making use of the `EditForm` component. ([read more](https://learn.microsoft.com/en-us/aspnet/core/blazor/forms/))
- Preferably use `OnValidSubmit` or `OnInvalidSubmit` instead of `OnSubmit`.
- For additional server-side validation in addition to data annotation attributes, use the `EditContext` and `ValidationMessageStore` classes. ([read more](https://learn.microsoft.com/en-us/aspnet/core/blazor/forms-validation))

```csharp
public partial class DeleteApplicationSection : ComponentBase
{
    public const string DeleteFormName = "delete-application-form";

    [Parameter]
    public required Application Application { get; set; }

    [SupplyParameterFromForm(FormName = DeleteFormName)]
    public DeleteFormModel? DeleteForm { get; set; }

    public EditContext? DeleteFormContext { get; set; }

    public ValidationMessageStore? DeleteFormValidationMessageStore { get; set; }

    protected override async Task OnInitializedAsync()
    {
        Application = ...

        DeleteForm ??= new DeleteFormModel();
        DeleteFormContext = new EditContext(DeleteForm);
        DeleteFormValidationMessageStore = new ValidationMessageStore(DeleteFormContext);
    }

    private async Task OnDeleteValidSubmittedAsync()
    {
        if (DeleteForm!.NameConfirmation != Application.Name)
        {
            DeleteFormValidationMessageStore!.Add(() => DeleteForm.NameConfirmation, "Name confirmation does not match.");

            // Form is invalid, stop here.
            return;
        }

        // Form is valid, continue.
    }

    public class DeleteFormModel
    {
        public string NameConfirmation { get; set; } = string.Empty;
    }
}
```

### JavaScript

- JavaScript should be avoided as much as possible. If it is necessary, it should be placed in a separate file with the
  `.razor.js` extension.
- Do no rely on `DOMContentLoaded` or similar events, instead use the `enhancedload` event if you include JavaScript globally. ([read more](https://learn.microsoft.com/en-us/aspnet/core/blazor/javascript-interoperability/static-server-rendering))

## Unit tests

Unit tests for Blazor are written with the help of the `Bunit` library. The tests are written in a different project as
the  component or page they are testing, which should preferably **maintain the same folder structure** as
much as possible.
