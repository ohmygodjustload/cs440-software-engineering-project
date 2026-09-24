# Appointment Scheduler — frontend

Angular 19 single-page app for the Appointment Scheduler. The [root README](../README.md) covers
the project overview, prerequisites, and conventions; this file is just the frontend day-to-day.

## Commands

| Command                                                   | What it does                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm start`                                               | `ng serve` on <http://localhost:4200>; `proxy.conf.json` forwards `/api` to the API on 5100. |
| `npm run build`                                           | Production build into `dist/appointment-scheduler`.                                          |
| `npm test -- --watch=false --browsers=ChromeHeadless`     | Unit tests (Karma + Jasmine) in headless Chrome. Drop the flags for watch mode.              |
| `npx ng generate component pages/<name>`                  | Scaffolds a page with template, stylesheet, and spec.                                        |

## Conventions

- Standalone components only — no `NgModule`s. Angular 19 templates use the built-in `@if`, `@for`,
  and `@switch` control flow instead of structural directives.
- Pages live in `src/app/pages/<name>/`; shared services and models live in `src/app/core/`.
- Every component and service has a co-located `*.spec.ts`. API calls are replaced with
  `HttpTestingController`, so the tests never need the backend or a network connection.
- Pages are lazily loaded from `src/app/app.routes.ts`, which also sets each page's document title.
- HTTP calls use relative paths (`/api/...`) so the dev-server proxy handles development and
  same-origin serving handles production. `src/app/core/models/` mirrors the backend response types.
- Component styles are scoped by Angular; only genuinely shared layout classes and the design tokens
  live in `src/styles.css`.
