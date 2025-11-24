# HTML

Please ensure each input field and button has a descriptive ID. This will allow QA to more
efficiently write test automation.

The IDs should have the three following _components_:

- **Component Name**: To ensure IDs stay unique we prefix them with the component name. While this
  may change it rarely does and since we avoid re-using the same component name multiple times this
  should be unique.
- **HTML Element**: This allows you at a quick glance understand what we're accessing.
- **Readable name**: Descriptive name of what we're accessing.

Please use dashes within components, and separate the _components_ using underscore.

```
<component name>_<html element>_<readable name>

register_button_submit
register-form_input_email
```

When writing components for the component library it's sometimes necessary to ensure an ID exists in
order to properly handle accessibility with references to other elements. Consider using an auto
generated ID but ensure it can be overridden. Use the following naming convention for automatic IDs:

```
<component selector>-<incrementing number>

bit-input-0
```

Please ensure words in the selector are separated using dash and not camelCase.
