# Locators

[Back to E2E Testing](README.md)

## Locator strategy

Use Playwright's built-in locators in this priority order. CSS
selectors and XPath are fragile and should be avoided.

| Priority | Locator              | When to use                       | Example                                         |
| -------- | -------------------- | --------------------------------- | ----------------------------------------------- |
| 1        | `getByRole()`        | Buttons, headings, links, dialogs | `page.getByRole('button', { name: 'Sign in' })` |
| 2        | `getByText()`        | Non-interactive text content      | `page.getByText('Welcome, John')`               |
| 3        | `getByLabel()`       | Form inputs with labels           | `page.getByLabel('Email')`                      |
| 4        | `getByPlaceholder()` | Inputs without labels             | `page.getByPlaceholder('Search…')`              |
| 5        | `getByAltText()`     | Images                            | `page.getByAltText('logo')`                     |
| 6        | `getByTitle()`       | Elements with title attribute     | `page.getByTitle('Issues count')`               |
| 7        | `getByTestId()`      | Last resort, explicit contract    | `page.getByTestId('balance')`                   |

**Project-specific conventions:**

- **Password fields**: use `getByLabel('Password', { exact: true })`
  because the `PasswordInput` toggle button's aria-label ("Show
  password") contains the substring "Password" and causes a strict
  mode violation without `exact`.
- **Filtering**: narrow lists with `.filter({ hasText })`,
  `.filter({ hasNotText })`, `.filter({ has: locator })`,
  `.filter({ hasNot: locator })`, or `.filter({ visible: true })`.
- **Combining**: `.and(otherLocator)` narrows to elements matching
  both. `.or(otherLocator)` matches either alternative.
- **Chaining**: `page.getByRole('listitem').filter(…).getByRole(…)`
  is preferred over nested CSS selectors.
- **Lists**: use `.all()` to iterate matching elements. Assert
  list contents with `toHaveText(['item1', 'item2'])` (multi-
  element form). Avoid `.nth()` / `.first()` — they break when
  content order changes.
- **Shadow DOM**: locators pierce open shadow roots by default.
  No special syntax needed for Web Components.
- **Label retargeting**: when you act on a `<label>` (e.g., via
  `getByText`), Playwright auto-targets the associated `<input>`.
  This is why `getByLabel()` works for form controls.
- **Codegen selectors**: `npx playwright codegen` may produce
  legacy syntax (`text=`, `nth=`, `id=`, `data-testid=`, `>>`
  chaining). Replace these with role/text/label locators from
  the priority table above.

## Actionability and auto-waiting

Playwright auto-waits for elements to be actionable before
performing actions. You rarely need explicit waits.

**Checks performed before actions:**

| Check           | Meaning                                                                                 |
| --------------- | --------------------------------------------------------------------------------------- |
| Visible         | Non-empty bounding box, no `visibility:hidden`. Note: `opacity:0` **passes** this check |
| Stable          | Same bounding box for two consecutive animation frames                                  |
| Enabled         | Not disabled (applies to form controls, `aria-disabled`)                                |
| Editable        | Enabled and not `readonly` / `aria-readonly`                                            |
| Receives Events | Element is the hit target (not obscured by overlays)                                    |

Playwright also auto-scrolls elements into the viewport before
any action. You rarely need `scrollIntoViewIfNeeded()` unless
taking a screenshot of an off-screen element without an action.

**Which checks apply to which actions:**

- `click`, `dblclick`, `check`, `uncheck`, `setChecked`, `tap`: all
  five checks
- `hover`, `dragTo`: Visible + Stable + Receives Events
- `fill`, `clear`: Visible + Enabled + Editable
- `selectOption`: Visible + Enabled
- `screenshot`, `selectText`: Visible only
- `setInputFiles`: no checks
- `focus`, `blur`, `press`, `dispatchEvent`: no checks (run against
  the DOM directly, bypassing actionability entirely. Use
  `dispatchEvent()` to fire synthetic events like custom DOM events
  on non-interactive elements)

**Detached element retry:** If an element detaches mid-action
(e.g., React re-renders and replaces the DOM node), Playwright
retries from locator resolution. This is why role/label locators
survive re-renders but CSS selectors attached to specific elements
may not.

**Explicit waiting with `waitFor()`:** When you need to wait for
an element state without performing an action, use
`locator.waitFor()` with a `state` option:

```ts
// Wait for element to appear in the DOM (even if hidden)
await page.locator('#loading').waitFor({ state: 'attached' });

// Wait for element to disappear (removed from DOM)
await page.locator('#loading').waitFor({ state: 'detached' });

// Wait for element to become visible (default)
await page.locator('#content').waitFor({ state: 'visible' });

// Wait for element to become hidden
await page.locator('#modal').waitFor({ state: 'hidden' });
```

Rarely needed — auto-retrying assertions (`toBeVisible()`,
`toBeHidden()`) are preferred. Use `waitFor()` when you need
to gate on element state before a non-Playwright operation
(e.g., calling `AxeBuilder.analyze()`).

Use `{ force: true }` to bypass non-essential checks only when
Playwright's detection is wrong (e.g., custom overlay components).
Never use `force` to paper over real issues.

## Input patterns

**Text input — `fill()` vs `pressSequentially()`:**

- `fill()` is the default. It focuses, clears, then sets the value
  in one step. Triggers `input` and `change` events. Also works on
  `<input type="date">`, `<input type="time">`,
  `<input type="datetime-local">`, and `[contenteditable]` elements.
- `pressSequentially()` types one character at a time with optional
  delay. Use only when the page has special per-keystroke handling
  (e.g., autocomplete, debounced search).

```ts
// Default — fast and reliable
await page.getByLabel('Email').fill('user@example.com');

// Per-keystroke — only when the page needs it
// delay is milliseconds between each keypress (optional, default 0)
await page.getByLabel('Search').pressSequentially('react', { delay: 50 });
```

**Checkboxes and radio buttons:**

```ts
// Toggle to a specific state (preferred — idempotent)
await page.getByLabel('Remember me').setChecked(true);
await expect(page.getByLabel('Remember me')).toBeChecked();

// Explicit check/uncheck (when you know the current state)
await page.getByLabel('I agree').check();
await page.getByLabel('Newsletter').uncheck();
```

**Select dropdowns:**

```ts
// By value, label, or index
await page.getByLabel('Currency').selectOption('USD');
await page.getByLabel('Currency').selectOption({ label: 'US Dollar' });
```

**File upload:**

```ts
// Single file
await page.getByLabel('Upload').setInputFiles('path/to/file.pdf');

// Multiple files
await page.getByLabel('Upload').setInputFiles(['file1.pdf', 'file2.pdf']);

// Clear selection
await page.getByLabel('Upload').setInputFiles([]);

// Upload an entire directory
await page.getByLabel('Upload').setInputFiles('path/to/directory');

// In-memory buffer (no file on disk)
await page.getByLabel('Upload').setInputFiles({
  name: 'statement.csv',
  mimeType: 'text/csv',
  buffer: Buffer.from('date,amount\n2024-01-01,100.00'),
});

// Dynamic file chooser (no input element)
const fileChooserPromise = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Upload' }).click();
const fileChooser = await fileChooserPromise;
await fileChooser.setFiles('path/to/file.pdf');
```

**Click variants:**

```ts
await page.getByRole('row').dblclick(); // double-click (inline edit)
await page.getByRole('row').click({ button: 'right' }); // right-click (context menu)
await page.getByRole('row').click({ modifiers: ['Shift'] }); // shift-click (range select)
await page.getByRole('row').click({ modifiers: ['ControlOrMeta'] }); // cmd/ctrl-click (multi-select)
await page.getByRole('button').click({ position: { x: 10, y: 10 } }); // click at specific coordinates within element
```

**Hover:**

```ts
// Trigger tooltips, reveal hover menus, etc.
await page.getByRole('button', { name: 'Info' }).hover();
await expect(page.getByRole('tooltip')).toBeVisible();
```

**Focus:**

```ts
await page.getByLabel('Email').focus();
// Useful for triggering focus/blur validation without clicking
```

**Drag and drop:**

```ts
// High-level API (works for most HTML5 drag-and-drop)
await page.getByText('Drag me').dragTo(page.getByText('Drop here'));

// Low-level fallback (for custom drag implementations where dragTo() fails)
await page.getByText('Drag me').hover();
await page.mouse.down();
await page.getByText('Drop here').hover();
await page.mouse.up();
```

**Keyboard shortcuts:**

```ts
await page.getByLabel('Name').press('Tab'); // move focus
await page.keyboard.press('Escape'); // dismiss dialog
await page.keyboard.press('Control+a'); // select all
```

**Scrolling:**

```ts
// Explicit scroll (e.g., before taking a screenshot)
await page.locator('.chart').scrollIntoViewIfNeeded();

// Simulate scroll wheel (infinite scroll, sticky headers)
await page.mouse.wheel(0, 500);

// Programmatic scroll inside a custom container
await page.locator('.scroll-container').evaluate((el) => (el.scrollTop += 300));
```

**File downloads:**

```ts
// Wait for download event before triggering the action
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'Export CSV' }).click();
const download = await downloadPromise;

// Save to disk — must happen before context closes
await download.saveAs(`./downloads/${download.suggestedFilename()}`);
```

Downloaded files are deleted when the browser context closes, so
call `saveAs()` before the test ends. Use `suggestedFilename()` to
read the server-provided filename.

**New tabs (`target="_blank"` links):**

`target="_blank"` links fire the `page` event on the
**BrowserContext**, not the `popup` event on the page:

```ts
const newPagePromise = page.context().waitForEvent('page');
await page.getByRole('link', { name: 'Open in new tab' }).click();
const newPage = await newPagePromise;
await expect(newPage).toHaveURL(/external-site/);
await newPage.close();
```

Use `context.pages()` to list all currently open pages in a
context (useful for multi-tab assertions).

**Popups (`window.open()`):**

The `popup` event fires on the **page** only for popups spawned
via `window.open()` from that page's JavaScript:

```ts
const popupPromise = page.waitForEvent('popup');
await page.getByRole('button', { name: 'Open preview' }).click();
const popup = await popupPromise;
await expect(popup).toHaveURL(/preview/);
await popup.close();
```

**Iframes:**

Use `frameLocator()` to scope locators inside an iframe (e.g.,
payment widgets, third-party embeds):

```ts
const frame = page.frameLocator('.payment-iframe');
await frame.getByLabel('Card number').fill('4242424242424242');
await frame.getByRole('button', { name: 'Pay' }).click();
```

For imperative frame access: `page.frame('name')` or
`page.frame({ url: /pattern/ })`.

## Dialogs

Playwright auto-dismisses `alert`, `confirm`, and `prompt` dialogs
when no listener is registered. To assert on or interact with a
dialog, register a handler **before** the triggering action.

**Important:** A registered `page.on('dialog')` listener **must**
call `dialog.accept()` or `dialog.dismiss()`. If it only observes
(e.g., logs the message), the triggering action hangs indefinitely.

```ts
// Accept a confirm dialog and verify its message
page.once('dialog', (dialog) => {
  expect(dialog.type()).toBe('confirm');
  expect(dialog.message()).toContain('Are you sure');
  void dialog.accept();
});
await page.getByRole('button', { name: 'Delete' }).click();

// Dismiss a prompt dialog
page.once('dialog', (dialog) => void dialog.dismiss());
await page.getByRole('button', { name: 'Rename' }).click();

// Accept a prompt with input text
page.once('dialog', (dialog) => void dialog.accept('New name'));
await page.getByRole('button', { name: 'Rename' }).click();
```

**`beforeunload` dialogs** (unsaved-changes prompts):

```ts
page.on('dialog', (dialog) => void dialog.accept());
await page.close({ runBeforeUnload: true });
```

Use `page.once()` for one-shot handlers (most common).
Use `page.on()` for persistent listeners that handle multiple
dialogs in a flow.
