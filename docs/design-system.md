# BAAAM design system (as implemented)

Documented from the existing CSS for Document 3 (BAAAM-44 / BAAAM-97). Values are taken from the stylesheets; nothing here invents a new look.

**Sources**

- Global: [`src/frontend/src/styles.css`](../src/frontend/src/styles.css)
- Fonts link: [`src/frontend/src/index.html`](../src/frontend/src/index.html)
- 21 component stylesheets under `src/frontend/src/app/**/*.css` (signup-provider reuses `signup.component.css`)

Counts below were produced by scanning those files (hex literals, media queries, font/spacing properties).

## Design tokens — defined, not yet adopted

[`styles.css`](../src/frontend/src/styles.css) defines these on `:root`:

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

**Adoption status: defined, not yet adopted.**

- Only `body` in `styles.css` references `var(--color-ink)` and `var(--color-surface-muted)`.
- No component CSS file uses `var(--color-*)` or `var(--radius)`.
- Component styles hard-code colors instead: **288** hex literals across the 21 app CSS files (**294** including the six token values in `styles.css`).

### Hex literals per file

| File | Hex count |
| --- | ---: |
| `pages/notifications/notifications.component.css` | 33 |
| `pages/settings/settings.component.css` | 32 |
| `pages/book-appointment/book-appointment.component.css` | 32 |
| `app.component.css` | 23 |
| `pages/requests/requests.component.css` | 19 |
| `pages/calendar/calendar.component.css` | 16 |
| `pages/statistics/statistics.component.css` | 15 |
| `pages/home-provider/home-provider.component.css` | 15 |
| `pages/create-slots/create-slots.component.css` | 14 |
| `pages/confirmation/confirmation.component.css` | 14 |
| `pages/home-admin/home-admin.component.css` | 12 |
| `shared/notification-popup/notification-popup.component.css` | 12 |
| `pages/appointments/appointments.component.css` | 10 |
| `pages/home/home.component.css` | 10 |
| `pages/review-request/review-request.component.css` | 9 |
| `pages/signup/signup.component.css` | 7 |
| `styles.css` | 6 |
| `pages/login/login.component.css` | 5 |
| `core/components/loading/loading.component.css` | 3 |
| `pages/signup-selection/signup-selection.component.css` | 3 |
| `pages/appointments-admin/appointments-admin.component.css` | 2 |
| `pages/accounts/accounts.component.css` | 2 |

## Local token sets (page-scoped)

Several pages define their own CSS variables instead of using the global tokens. These repeat a second, warm palette that differs from the blue-gray `:root` set.

### Login — `login.component.css`

| Token | Value |
| --- | --- |
| `--login-background` | `#f7f5f1` |
| `--login-foreground` | `#344945` |
| `--login-border` | `#e0dcd1` |
| `--login-font` | `"Inter", sans-serif` |
| `--login-input-radius` | `14px` |
| `--login-panel-radius` | `24px` |
| `--login-button-radius` | `999px` |

### Signup / signup-selection — `signup.component.css`, `signup-selection.component.css`

| Token | Value |
| --- | --- |
| `--signup-background` | `#f7f5f1` |
| `--signup-foreground` | `#344945` |
| `--signup-border` | `#e0dcd1` |
| `--signup-font` | `"Inter", sans-serif` |

Signup-provider reuses `signup.component.css` (no separate stylesheet).

### Book appointment — `book-appointment.component.css`

| Token | Value |
| --- | --- |
| `--booking-ink` | `#344945` |
| `--booking-paper` | `#f7f5f1` |
| `--booking-soft` | `#e0dcd1` |
| `--booking-active` | `#d5e3e8` |

### Review request — `review-request.component.css`

| Token | Value |
| --- | --- |
| `--paper` | `#f7f5f1` |
| `--ink` | `#344945` |
| `--blue` | `#d5e3e8` |
| `--fitness` | `#e4e3bc` |
| `--soft` | `#e0dcd1` |

### Toasts — `notification-popup.component.css`

| Token | Default / variants |
| --- | --- |
| `--toast-accent` | `#4c8a5c` (default / success); `#1f6feb` (info); `#b7791f` (reminder) |

## Color palette in use

Most frequent hex literals across all CSS (exact occurrence counts):

| Hex | Count | Typical role |
| --- | ---: | --- |
| `#344945` | 42 | Primary text / ink (warm palette) |
| `#f7f5f1` | 29 | Paper / page background |
| `#344b48` | 25 | Text / chrome (shell, toasts) |
| `#e0dcd1` | 22 | Soft border |
| `#d5e3e8` | 16 | Active / accent wash (blue-gray) |
| `#526460` | 13 | Muted text |
| `#e4e3bc` | 12 | Category / fitness wash |
| `#344f4b` | 11 | Dark accent / spinner |
| `#fff` / `#ffffff` | 9+ | Surfaces |
| `#1f6feb` | 7 | Brand blue (token + toast info) |
| `#fbeceb` | 7 | Soft error / reject wash |
| `#faf9f6` | 7 | Header background |
| `#dedbd2` | 5 | Nav / chrome border |
| `#4c8a5c` | 4 | Success |
| `#8a3636` / `#9a3412` / `#7a2222` | several | Error / danger text |

**Two palettes coexist:** the unused global blue-gray tokens (`#1f6feb`, `#1f2933`, `#f4f7fb`, …) and the widely used warm paper palette (`#f7f5f1`, `#344945`, `#e0dcd1`, `#d5e3e8`).

## Typography

### Font families

| Context | Stack |
| --- | --- |
| Global `body` (`styles.css`) | `"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif` |
| Inter (Google Fonts in `index.html`, weights **400** and **500** only) | Used by login, signup, signup-selection (`var(--*-font)`), review-request, and confirmation |

### Font sizes in use (declaration counts)

| Size | Count | Size | Count |
| --- | ---: | --- | ---: |
| 14px | 53 | 13px | 50 |
| 12px | 20 | 15px | 15 |
| 32px | 14 | 11px | 10 |
| 20px | 7 | 26px | 6 |
| 18px | 5 | 30px | 4 |
| Others (9–48px) | sparse | | |

Body / UI copy clusters around **13–15px**. Display headings commonly use **26–32px** (some 38–48px on auth / hero-like blocks).

### Font weights in use

| Weight | Count |
| --- | ---: |
| 500 | 46 |
| 400 | 15 |
| 600 | 4 |
| 700 | 1 |

Inter is loaded only at 400/500; heavier weights fall back to the next available face.

## Spacing and radii

### Common spacing

| Pattern | Approx. count | Notes |
| --- | ---: | --- |
| `gap: 12px` / `16px` / `24px` | 18 / 17 / 12 | Dominant flex/grid gaps |
| `gap: 4px` / `8px` | 10 each | Tight clusters |
| `padding: 24px` / `20px` | 10 / 9 | Page and card padding |
| `padding: 12px 16px` / `14px 24px` | several | Buttons and controls |

There is no shared spacing scale token; values are hard-coded per component.

### Border radii in use

| Value | Count | Role |
| --- | ---: | --- |
| `999px` | 37 | Pills (nav, many buttons) |
| `24px` | 23 | Large panels / cards |
| `16px` | 12 | Cards / sections |
| `12px` | 8 | Toasts, smaller cards |
| `14px` | 4 | Login inputs (also `--login-input-radius`) |
| `50%` | 4 | Avatars / spinner |
| Global `--radius: 8px` | — | Defined but almost unused (1 hard-coded `8px` elsewhere) |

## Shared UI pieces

There is no single shared component library for buttons or cards. Patterns are copied (and slightly varied) per page.

### App shell — `app.component.css`

- Header (`.app-header`, provider variant `.app-header--provider`), brand (`.app-brand`), centered pill nav (`.app-nav`, `.app-nav__list`, `.app-nav__link`, `--active`), account chip and sign-out.
- Warm chrome colors (`#faf9f6`, `#f7f5f1`, `#344b48`, `#dedbd2`, `#dce9ed`).
- Breakpoints at **1150px** and **650px**; respects `prefers-reduced-motion`.

### Buttons

| Class | Where defined | Notes |
| --- | --- | --- |
| `.primary` | home, home-admin, home-provider, appointments, requests, review-request, create-slots | Pill / filled CTA; colors differ slightly per page |
| `.secondary` | create-slots | Outline / quiet action next to `.primary` |
| `.primary-button` / `.secondary-button` | book-appointment | Separate naming; rules appear more than once in that file |
| `.action-button` | review-request | Used with return / dialog actions |
| `.danger-button` | book-appointment | Destructive variant in the booking flow |

### Form fields

- Auth pages (login, signup, signup-selection / provider): shared warm panel look, Inter, rounded inputs (`14px` on login).
- create-slots: `.form-grid`, paired `.primary` / `.secondary`.
- book-appointment: `.form-actions`, `.form-error`, and booking-local tokens.
- No global form control class; validation and spacing are local.

### Cards / panels

- Page “card” layouts appear as local classes (e.g. `.card-heading`, `.card-content`, `.card-actions` on appointments / book-appointment).
- Auth pages use large rounded panels (`24px` / `--login-panel-radius`).
- Home / admin / provider / requests use section panels with paper backgrounds and soft borders rather than a shared `Card` component.

### Toasts — `shared/notification-popup`

- Fixed top-right stack (`.toast-stack`, `.toast`, variants `--success` / `--info` / `--reminder`, leave animation `.toast--leaving`).
- Accent via `--toast-accent`; body text `#344b48` / `#526460`.
- Mobile tweak at **480px**; `prefers-reduced-motion` supported.

### Loading — `core/components/loading`

- Inline spinner (`.loading__spinner`): 15px ring, `#c7d3d1` / `#344f4b`, muted label `#526460`.
- Pages may override host spacing/color; `prefers-reduced-motion` disables spin.

### Confirmation dialog — `confirmation.component.css`

- Standalone route exists, but the component is also embedded from review-request.
- Uses Inter; no width media queries (not responsive).

## Responsive breakpoints

**11 distinct widths** appear in `@media` rules: **380, 480, 600, 620, 650, 700, 760, 800, 900/901, 1050, 1150px**. **760px is the most common** (8 queries).

| File | Breakpoint(s) |
| --- | --- |
| `app.component.css` | max 1150px, max 650px |
| `login.component.css` | 901–1150px, max 900px, max 380px |
| `book-appointment.component.css` | max 1050px, max 760px (twice) |
| `notifications.component.css` | max 800px |
| `settings.component.css` | max 800px |
| `home.component.css` | max 760px |
| `home-admin.component.css` | max 760px |
| `appointments.component.css` | max 760px |
| `requests.component.css` | max 760px |
| `review-request.component.css` | max 760px |
| `statistics.component.css` | max 760px |
| `home-provider.component.css` | max 700px |
| `create-slots.component.css` | max 650px |
| `signup.component.css` | max 620px |
| `signup-selection.component.css` | max 620px |
| `calendar.component.css` | max 600px |
| `notification-popup.component.css` | max 480px |

### Pages with no media queries (not responsive)

- `accounts.component.css`
- `appointments-admin.component.css`
- `confirmation.component.css`

### Reduced motion

Also honored in: `styles.css` (view transitions), `app.component.css`, `login.component.css`, `signup.component.css`, `signup-selection.component.css`, `settings.component.css`, `notification-popup.component.css`, `loading.component.css`.

## Gaps and recommendations

1. **Adopt the `:root` tokens** (or replace them with the warm palette actually used) so components stop hard-coding ~288 hex values.
2. **Pick one palette** — either the global blue-gray tokens or the warm paper set (`#f7f5f1` / `#344945` / `#e0dcd1`) — and delete the unused set.
3. **Standardize breakpoints** to 2–3 widths (for example 760px + 1150px) instead of 11 ad-hoc widths.
4. **Extract shared button / form / card classes** (or Angular shared components) so `.primary` and `.primary-button` do not diverge page by page.
5. **Add media queries** for accounts, appointments-admin, and confirmation, or document them as desktop-only intentionally.
6. **Align typography:** Inter is loaded at 400/500 while many rules use weight 500/600; either load 600 or stay at 500.
