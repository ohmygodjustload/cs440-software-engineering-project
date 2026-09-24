# Frontend tests

Unit tests for the Angular app stay next to the code they cover
(`src/frontend/src/**/*.spec.ts`), which is where the Angular CLI and Karma look for them:

```bash
cd src/frontend
npm test -- --watch=false --browsers=ChromeHeadless   # single run
npm test                                             # watch mode
```

This folder mirrors `src/frontend` for **end-to-end tests** (Playwright, Cypress, or `ng e2e` once
a runner is chosen in a follow-up ticket). Nothing lives here yet, so the e2e suite will start from
this directory.
