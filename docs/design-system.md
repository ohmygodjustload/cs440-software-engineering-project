# BAAAM design system (as implemented)

The design system the Angular frontend actually uses, documented from its CSS for Document 3 (BAAAM-44 / BAAAM-97). Nothing here is a proposal except the last section.

**Sources** (as of Nov 5, 2026)

- Global stylesheet: [`src/frontend/src/styles.css`](../src/frontend/src/styles.css)
- Font loading: [`src/frontend/src/index.html`](../src/frontend/src/index.html)
- 24 component stylesheets under `src/frontend/src/app/**/*.css`. The signup-provider page has no stylesheet of its own; it reuses `signup.component.css`.

All counts come from scanning those files. A "count" is the number of declarations (or color values) with that exact value.

## Global design tokens: defined, not yet adopted

`styles.css` defines these tokens on `:root`:

| Token | Value |
| --- | --- |
| `--color-brand` | `#1f6feb` |
| `--color-ink` | `#1f2933` |
| `--color-ink-muted` | `#52606d` |
| `--color-surface` | `#ffffff` |
| `--color-surface-muted` | `#f4f7fb` |
| `--color-border` | `#d9e2ec` |
| `--radius` | `8px` |
| `--display` | `block` |

Status: **defined, not yet adopted.** Only the `body` rule in `styles.css` uses them (`--color-ink` and `--color-surface-muted`). No component stylesheet references any `--color-*` token or `--radius`. Components hard-code their colors instead (380 color values across the 24 component stylesheets), so changing a brand color today means editing many files rather than one token.

## Page-scoped tokens

Six stylesheets define their own variables instead of using the global ones. Five of them repeat the same three warm values (`#f7f5f1`, `#344945`, `#e0dcd1`) under different names.

| Stylesheet | Tokens |
| --- | --- |
| `login` | `--login-background #f7f5f1`, `--login-foreground #344945`, `--login-border #e0dcd1`, `--login-font "Inter"`, `--login-input-radius 14px`, `--login-panel-radius 24px`, `--login-button-radius 999px` |
| `signup`, `signup-selection` (identical) | `--signup-background #f7f5f1`, `--signup-foreground #344945`, `--signup-border #e0dcd1`, `--signup-font "Inter"` |
| `appointments` | `--appointments-paper #f7f5f1`, `--appointments-ink #344945`, `--appointments-soft #e0dcd1` |
| `review-request` | `--paper #f7f5f1`, `--ink #344945`, `--blue #d5e3e8`, `--fitness #e4e3bc`, `--soft #e0dcd1` |
| `notification-popup` | `--toast-accent`: `#4c8a5c` (default and success), `#1f6feb` (info), `#b7791f` (reminder) |

## Color palette in use

The app's real palette is a warm "paper and ink" set, not the blue-gray global tokens. Most-used values across all CSS:

| Hex | Count | Where it's used |
| --- | ---: | --- |
| `#344945` | 69 | Ink: text color in 14 stylesheets, fill for primary buttons (19 backgrounds), and the value behind `--*-foreground` / `--ink` |
| `#f7f5f1` | 49 | Paper: page and panel backgrounds, text on dark buttons, the nav pill |
| `#e0dcd1` | 43 | Soft: borders and secondary button fill |
| `#344b48` | 24 | Shell text (brand, nav links) and toast text |
| `#d5e3e8` | 15 | Pale blue accent (`--blue` in review-request) |
| `#526460` | 13 | Muted text (loading label, toast message, notifications status) |
| `#344f4b` | 11 | Dark control color (loading spinner, settings Save, notification toggle) |
| `#e4e3bc` | 10 | Fitness category tint (`--fitness`) |
| `#faf9f6` | 6 | Header background |
| `#dce9ed` | 4 | Active nav link |
| `#1f6feb` | 7 | Global brand token, info toast accent, focus outlines on notifications |

Status colors:

| Purpose | Values |
| --- | --- |
| Error text | `#9a3412` (signup and login), `#7a2222` (alerts), `#9c2b2b` (settings and notifications field errors) |
| Error background and border | `#fdecec` with border `#c04949` (alerts), `#fbeaea` (create-slots and edit-appointment-admin error box) |
| Success | Background `#e7f3ea`, border `#4c8a5c`, text `#234d2e` (alerts); `#4c8a5c` success toast |
| Reminder | `#b7791f` reminder toast accent |

## Typography

**Font families**

| Font stack | Used by |
| --- | --- |
| `"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif` | Global default (`body` in `styles.css`), so every page that doesn't set its own |
| `Inter` (loaded from Google Fonts at weights **400 and 500 only**) | login, signup, signup-selection, signup-provider, review-request, confirmation |
| `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | accounts, activity, appointments-admin (set on `:host`) |
| `"Inter:Medium", Inter, Arial, sans-serif` | One dark pill button each in activity and appointments-admin. `"Inter:Medium"` is not a real font name (it looks copied from a design tool), so browsers skip it and use `Inter`. |

**Font sizes** (declaration counts)

| Size | Count | Examples |
| --- | ---: | --- |
| 14px | 60 | `.primary` buttons, settings inputs, toast titles |
| 13px | 55 | Nav links, account chip, loading label, toast messages |
| 12px | 26 | Settings hints and field errors |
| 15px | 14 | |
| 32px | 15 | Page titles: mostly `h1`, plus the login, signup, and signup-selection titles |
| 20px | 8 | Brand name in the header |
| 26px, 28px, 30px | 5, 4, 3 | |
| 38px to 48px | 8 in total | |
| 10px, 11px | 4, 5 | |

There is no type scale: 21 different sizes appear, from 10px to 48px. Body copy sits at 13px to 15px.

**Font weights:** 500 (62 declarations), 400 (18), 600 (5), 700 (1). Inter is only loaded at 400 and 500, so a 600 or 700 rule on an Inter page is faked by the browser.

## Spacing and corner radius

Spacing mostly follows a 4px grid. There are no spacing tokens.

| Property | Most common values (count) |
| --- | --- |
| `gap` | 12px (27), 16px (24), 24px (19), 8px (18), 4px (16), 10px (12), 20px (9) |
| `padding` | 20px (10), 24px (9), 14px 20px (8), 24px 18px (7), 12px 16px (6); buttons use 14px 24px or 12px 24px |

Off-grid values also appear (10px, 14px, 18px, 5px).

| `border-radius` | Count | Used for |
| --- | ---: | --- |
| 999px | 54 | Pill shape: buttons, nav, toggles |
| 24px | 28 | Large panels and auth cards |
| 16px | 12 | Cards |
| 12px | 10 | Toasts, notification panels, error boxes |
| 28px, 18px, 20px | 9, 7, 4 | Other card and panel variants |
| 50% | 5 | Circles: spinner, today marker, toggle knob, unread dot, icon buttons |
| 8px (the `--radius` token value) | 1 | Only one hard-coded use; the token itself is never used |

## Shared UI pieces

There is no shared button, form, or card component. Each page styles its own copies, which mostly agree on colors but differ in class names and sizes.

### App shell (`app.component.css`)

- Header with the brand name (`.app-brand`, 20px), a centered pill nav (`.app-nav__list`, `#f7f5f1` with `#dedbd2` border), pill links (`.app-nav__link`, 13px; hover `#f0efea`; active `#dce9ed`), an account chip, and Sign out.
- A provider variant (`.app-header--provider`).
- Hidden on login and the signup pages, which use a full-page layout.

### Buttons

| Style | Class names | Pages |
| --- | --- | --- |
| Primary: ink fill `#344945`, paper text `#f7f5f1`, pill | `.primary` | home, home-admin, requests, review-request, home-provider, create-slots, edit-appointment-admin, appointments (uses `--appointments-ink`) |
| Primary (different name) | `.primary-button` (min-height 44px) | book-appointment |
| Primary (different name) | `.primary-action` | edit-account |
| Primary (different name) | `.confirmation-prompt__button--confirm` | confirmation |
| Secondary: `#e0dcd1` fill or `#e0dcd1` border | `.secondary`, `.secondary-button`, `.secondary-action`, `.confirmation-prompt__button--back` | create-slots, edit-appointment-admin, book-appointment, edit-account, confirmation |
| Outline / destructive | `.danger` (transparent with ink border), `.confirmation-prompt__button--reject` | appointments, confirmation |
| Review actions | `.action-button` with `.approve` (filled) | review-request |
| Text link button | `.text-button` | book-appointment |
| Dark save button | `.settings-save` (`#344f4b` fill, white text) | settings |
| Dark pill in the page header | Unnamed rule with `#344945` fill and the `"Inter:Medium"` font | activity, appointments-admin |

The Edit links on accounts and appointments-admin have `class="primary"` in the HTML, but those stylesheets have no `.primary` rule. They are styled by `.account-card a` and `.appointment-card a` instead.

### Form fields

| Pattern | Pages |
| --- | --- |
| `.login-field__input`, `.login-password__input` (14px radius via `--login-input-radius`) | login |
| `.signup-field__input` with `__label`, `__hint`, `__error`; invalid fields get a `#9a3412` border | signup, signup-provider |
| `.field` with `.field-error` (settings also has `.field-hint`; its inputs use 12px 14px padding, a `#d5d1c6` border, and a white fill) | settings, edit-account |
| `.form-grid` (edit-account and edit-appointment-admin collapse it to one column at 650px) | create-slots, edit-account, edit-appointment-admin |
| `.search-field`, `.type-field`, `.time-field`, `.date-field` (filter bars) | accounts, activity, appointments-admin |

### Cards and panels

| Pattern | Pages |
| --- | --- |
| `.signup-card`, `.login-panel` (large rounded auth panels) | signup, signup-selection, login |
| `.stat-card` (dashboard numbers) | home, home-admin |
| `.appointment-card` | home, home-provider, appointments-admin, activity |
| `.request-card`, `.review-card`, `.comments-card` | requests, home-admin, review-request |
| `.account-card` | accounts |
| `.upcoming-card` | appointments |
| `.provider-panel`, `.slots-panel`, `.review-panel`, `.slot-card`, `.confirmation-card` | book-appointment |
| `.notifications-panel` (white, `#e3ded2` border, 12px radius) | notifications |

### Toasts (`shared/notification-popup`)

- A fixed stack in the top-right corner (`.toast-stack`, up to 360px wide).
- Each toast is a white card with a 4px colored left border from `--toast-accent`: success `#4c8a5c`, info `#1f6feb`, reminder `#b7791f`.
- It has a close button, a timer bar, and slide-in / slide-out animations (`.toast--leaving`, 350ms).
- Adjusts at 480px and turns off motion when the user prefers reduced motion.

### Loading indicator (`core/components/loading`)

- An inline 15px ring spinner (`#c7d3d1` track, `#344f4b` moving segment) with a 13px muted label (`#526460`).
- Stops spinning when the user prefers reduced motion.

### Inline alerts

- Error and success banners with a 3px left border: `.settings-alert--error/--success` and `.notifications-alert--error/--success`.
- Colors are listed under Status colors above.

### Confirmation dialog (`pages/confirmation`)

- A dialog with confirm, reject, and back buttons, used inside review-request.
- It uses Inter and has no width media queries.

## Responsive breakpoints

All breakpoints are `max-width` except one range on login. Thirteen distinct widths are in use: 380, 480, 560, 600, 620, 650, 700, 760, 800, 860, 900 (with 901 as the start of a range), 980, and 1150px. **650px and 760px are the most common, with 6 queries each.**

| Stylesheet | Breakpoints |
| --- | --- |
| `app.component.css` (shell) | 1150px, 650px |
| `login` | 901px to 1150px, 900px, 380px |
| `book-appointment` | 980px, 860px, 700px, 560px |
| `notifications` | 800px |
| `settings` | 800px |
| `home` | 760px |
| `home-admin` | 760px |
| `appointments` | 760px |
| `requests` | 760px |
| `review-request` | 760px |
| `statistics` | 760px |
| `home-provider` | 700px |
| `activity` | 700px |
| `create-slots` | 650px |
| `edit-account` | 650px |
| `edit-appointment-admin` | 650px |
| `accounts` | 650px |
| `appointments-admin` | 650px |
| `signup` (and signup-provider) | 620px |
| `signup-selection` | 620px |
| `calendar` | 600px |
| `notification-popup` | 480px |

**Not responsive:** the confirmation page (`confirmation.component.css`) has no width media queries. The loading component has none either, but it is a small inline element.

Earlier versions of the app also had no media queries on accounts and appointments-admin. Both got a 650px breakpoint with BAAAM-148.

**Reduced motion:** `styles.css` (page transitions), `app.component.css`, `login`, `signup`, `signup-selection`, `settings`, `notification-popup`, and `loading` turn off animations when the user's OS asks for reduced motion.

## Gaps and recommendations

1. **Adopt one set of tokens.** Either point the `:root` tokens at the warm palette the app really uses (`#344945`, `#f7f5f1`, `#e0dcd1`) or drop them, then replace the hard-coded colors with `var()` references.
2. **Merge the duplicate page-scoped tokens.** `--login-*`, `--signup-*`, `--appointments-*`, and review-request's `--paper` / `--ink` / `--soft` define the same three colors five times over.
3. **Standardize breakpoints** on two or three widths (for example 650px and 1150px, plus 760px if needed) instead of thirteen.
4. **Share button, form, and card styles.** One `.primary` / `.secondary` style (or shared Angular components) would replace `.primary-button`, `.primary-action`, and the confirmation button classes.
5. **Make the confirmation dialog responsive.**
6. **Fix the font setup.** Load Inter at 600 if it's needed, settle on one font stack (three are in use), and replace `"Inter:Medium"` with `Inter` plus `font-weight: 500`.
