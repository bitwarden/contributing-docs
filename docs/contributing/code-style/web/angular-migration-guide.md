# Angular Modernization Guide

Bitwarden desires to update our Angular codebase to leverage modern Angular best practices,
described under [Angular](./angular.md). This guide provides a step-by-step approach on how to
migrate existing Angular components and directives to align with these practices. New code
**should** strive to follow these guidelines from the start.

:::info

We provide a Bitwarden specific
[Angular Modernization Claude Skill](https://github.com/bitwarden/clients/blob/main/.claude/skills/angular-modernization)
that performs most of these migrations automatically. It's strongly **recommended** to migrate a
couple components yourself first to get familiar with the changes before using the automated tool.

:::

## Overview

Modern Angular emphasizes five core changes:

1. **Standalone Components** — Self-contained components without NgModules
2. **Built-in Control Flow** — New `@if`, `@for`, and `@switch` syntax replacing structural
   directives
3. **Signals** — A new reactivity model replacing many RxJS patterns in components
4. **OnPush Change Detection** — Performance-optimized change detection
5. **Updated Style Conventions** — `inject()` over constructor injection, `host` over decorators

## Migration Order

Some of the changes depend on each other. It's strongly recommended to adhere to this order while
migrating:

1. Standalone components
2. Built-in control flow
3. Migrate `@Input()` / `@Output()`
4. Migrate queries (`@ViewChild`, `@ContentChild`, etc.)
5. Convert component properties to `signal()` / `computed()`
6. Replace template-bound functions with `computed()` signals
7. Enable `OnPush` change detection

:::warning

Enabling `OnPush` before fully migrating to signals or reactive patterns may cause UI update issues.

:::

## Standalone Components

Use standalone components, directives and pipes. `NgModules` can still be used for grouping multiple
components but the inner components **should** be standalone. Use
[Angular's Standalone Migration](https://angular.dev/reference/migrations/standalone).

```bash
npx ng generate @angular/core:standalone
```

1. Remove `standalone: false` in the `@Component` decorator
2. Move `imports` from the NgModule directly to the component
3. Import only what the component needs (tree-shakeable)
4. Remove the component from NgModule declarations

```typescript
// Before
@Component({
  selector: "app-example",
  standalone: false,
  templateUrl: "./example.component.html",
})
export class ExampleComponent {}

// In module
@NgModule({
  declarations: [ExampleComponent],
  imports: [CommonModule, FormsModule],
})
export class ExampleModule {}

// After
@Component({
  selector: "app-example",
  templateUrl: "./example.component.html",
  imports: [CommonModule, FormsModule],
})
export class ExampleComponent {}
```

## Control Flow Syntax

Use Angular's built-in control flow over structural directives for better performance and type
safety. Use
[Angular's Control Flow Migration](https://angular.dev/reference/migrations/control-flow).

**Reference:** [Built-in control flow](https://angular.dev/guide/templates/control-flow)

<!-- prettier-ignore -->
```html
<!-- Before: structural directives -->
<div *ngIf="isVisible()">Content</div>
<div *ngFor="let item of items(); trackBy: trackById">{{ item.name }}</div>

<!-- After: built-in control flow -->
@if (isVisible()) {
  <div>Content</div>
} @for (item of items(); track item.id) {
  <div>{{ item.name }}</div>
}
```

## Signals

Signals provide a simpler reactivity model for Angular components. Use signals for all
component-local state or purely presentational services. For a more in-depth guide to signals, see
the [Angular Signals Guide](https://angular.dev/guide/signals).

### Signal Inputs

Replace `@Input()` with `input()` for reactive inputs. Use
[Angular's Signal Input Migration](https://angular.dev/reference/migrations/signal-inputs).

```bash
npx ng generate @angular/core:signal-input-migration
```

```typescript
// Before
@Input() name: string = "";
@Input({ required: true }) id!: string;

// After
name = input<string>("");
id = input.required<string>();
```

Access via `this.name()` in code and `name()` in templates.

### Signal Outputs

Replace `@Output()` with `output()`. Use
[Angular's Output Migration](https://angular.dev/reference/migrations/outputs).

```bash
npx ng generate @angular/core:output-migration
```

```typescript
// Before
@Output() save = new EventEmitter<string>();

// After
save = output<string>();
```

Emit via `this.save.emit(value)`.

### Signal Queries

Replace decorator-based queries with signal equivalents. Use
[Angular's Signal Queries Migration](https://angular.dev/reference/migrations/signal-queries).

```bash
npx ng generate @angular/core:signal-queries-migration
```

```typescript
// Before
@ViewChild("input") inputEl!: ElementRef;
@ViewChildren(ItemComponent) items!: QueryList<ItemComponent>;

// After
inputEl = viewChild<ElementRef>("input");
items = viewChildren(ItemComponent);
```

### RxJS Interoperability

Signals and RxJS work together. Use these utilities for conversion.

**Reference:** [RxJS Interop](https://angular.dev/ecosystem/rxjs-interop)

```typescript
import { toSignal, toObservable } from "@angular/core/rxjs-interop";

// Observable → Signal
private folders$ = this.folderService.folderViews$;
protected folders = toSignal(this.folders$, { initialValue: [] });

// Signal → Observable
private searchSignal = signal("");
private search$ = toObservable(this.searchSignal);
```

#### When to Use Each

| Use Signals           | Use RxJS                                            |
| --------------------- | --------------------------------------------------- |
| Component-local state | Cross-client shared code                            |
| Simple derived state  | Complex async operations                            |
| Template bindings     | Streams requiring operators (debounce, merge, etc.) |

## OnPush Change Detection

OnPush improves performance by limiting when Angular checks a component for changes.

**Reference:** [Skipping Component Subtrees](https://angular.dev/best-practices/skipping-subtrees)

### Enabling OnPush

```typescript
@Component({
  selector: "app-example",
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
```

### When Change Detection Runs

With OnPush, the component updates only when:

- An `input()` signal or `@Input()` reference changes
- An event is handled within the component or its children
- A signal read in the template updates
- An `Observable` with `| async` emits
- `ChangeDetectorRef.markForCheck()` is called manually

### Common Pitfalls

| Problem                                        | Solution                                                |
| ---------------------------------------------- | ------------------------------------------------------- |
| UI doesn't update after async operation        | Use signals or call `markForCheck()`                    |
| Mutating objects/arrays doesn't trigger update | Create new references: `[...arr]`, `{...obj}`           |
| Service data changes aren't reflected          | Expose data as signals or observables with `async` pipe |

## Dependency Injection

Use `inject()` instead of constructor injection for Angular primitives.

**Reference:** [Dependency Injection](https://angular.dev/guide/di)

```typescript
// Before
constructor(
  private folderService: FolderService,
  private route: ActivatedRoute,
) {}

// After
private folderService = inject(FolderService);
private route = inject(ActivatedRoute);
```

**Note:** Continue using constructor injection for code shared with non-Angular clients (CLI).

## Class and Style Bindings

Prefer native `[class]` and `[style]` bindings over `ngClass` and `ngStyle` directives.

**Reference:**
[Class and Style Binding](https://angular.dev/guide/templates/binding#css-class-and-style-property-bindings)

### Class Bindings

```html
<!-- Avoid: ngClass directive -->
<div [ngClass]="{ 'active': isActive(), 'disabled': isDisabled() }"></div>

<!-- Prefer: class binding for single class -->
<div [class.active]="isActive()" [class.disabled]="isDisabled()"></div>

<!-- Prefer: class binding for multiple classes from a signal/computed -->
<div [class]="containerClasses()"></div>
```

With signals:

```typescript
protected isActive = signal(false);
protected isDisabled = signal(false);

// For complex class logic, use computed
protected containerClasses = computed(() => {
  const classes: string[] = ["base-container"];
  if (this.isActive()) classes.push("active");
  if (this.isDisabled()) classes.push("disabled");
  return classes.join(" ");
});
```

### Style Bindings

```html
<!-- Avoid: ngStyle directive -->
<div [ngStyle]="{ 'width.px': width(), 'color': textColor() }"></div>

<!-- Prefer: style binding for individual properties -->
<div [style.width.px]="width()" [style.color]="textColor()"></div>

<!-- Prefer: style binding for multiple styles from a signal/computed -->
<div [style]="containerStyles()"></div>
```

With signals:

```typescript
protected width = signal(100);
protected textColor = signal("blue");

// For complex style logic, use computed
protected containerStyles = computed(() => ({
  width: `${this.width()}px`,
  color: this.textColor(),
}));
```

## Host Bindings

Use the `host` property instead of `@HostBinding` and `@HostListener`.

**Reference:** [Host Elements](https://angular.dev/guide/components/host-elements)

```typescript
// Before
@HostBinding("class.active") isActive = false;
@HostListener("click") onClick() { /* ... */ }

// After
@Component({
  host: {
    "[class.active]": "isActive()",
    "(click)": "onClick()",
  },
})
```

## Component Best Practices

### Keep Components Thin

Components handle presentation only. Business logic belongs in services.

### Protected Template Members

Use `protected` for members accessed only in templates:

```typescript
protected isLoading = signal(false);
protected items = computed(() => this.filterItems());
```

### Prefer `computed()` Over Functions in Templates

```typescript
// Avoid: function called every change detection cycle
getDisplayName() {
  return `${this.firstName()} ${this.lastName()}`;
}

// Prefer: computed, evaluated only when dependencies change
protected displayName = computed(() => `${this.firstName()} ${this.lastName()}`);
```

### Use `readonly` for Constants

```typescript
protected readonly maxItems = 10;
```

## Additional Resources

- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Change Detection Best Practices](https://angular.dev/best-practices/skipping-subtrees)
- [Zoneless Angular](https://angular.dev/guide/zoneless)
- [Angular Style Guide](https://angular.dev/style-guide)
- [Change Detection Visualizer](https://change-detection.guide)
