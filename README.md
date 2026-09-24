# Appointment Scheduler

Software for scheduling and tracking appointments by category — medical, beauty, and fitness.

A group project for CS440 (Software Engineering) at the University of Wisconsin – La Crosse.

## Overview

Users can schedule a variety of appointments and keep track of them over time. The system includes:

- **Home dashboard** — overview of appointments by category, historical records, and trends; access to categorical dashboards, notifications, and user settings (login info and preferences)
- **Calendar** — display upcoming appointments relative to the current date so users can see what times fit their schedule
- **Appointment scheduler** — create, update, and delete appointments (category, date/time, service provider, user, location)
- **Notification system** — email reminders to both the user and the service provider when an appointment is created, edited, or cancelled; reminders one day before and one hour before the appointment
- **Statistics panel** — scheduling trends such as historical appointments by category, day, and time

The product provides a graphical user interface for managing appointments, reminders, login information, and statistics. Data for users, service providers, and admins is stored in a database (appointment details, preferences, personal info, and calendar-related analytics).

### Roles and privacy

- A **user** may only access and modify their own information.
- An **admin** may add, modify, or delete any user’s information or account.

## Team

<!-- TODO: list all team members with their GitHub handles, then mirror them into .github/CODEOWNERS -->

- [@ohmygodjustload](https://github.com/ohmygodjustload)

## Tech stack

- **Backend:** ASP.NET Core 9 (C#) Web API — `src/backend`
- **Frontend:** Angular 19 (TypeScript) single-page app — `src/frontend`
- **Database:** MongoDB (not wired up yet)
- **Version control:** Git + GitHub
- **Project management:** Jira (`BAAAM`)

## Repository layout

```text
.
├── .github/                       # GitHub-specific config (PR template, CODEOWNERS)
├── .vscode/                       # Shared tasks / launch configs for both halves
├── scripts/                       # Helper scripts (dev.sh runs the whole stack)
├── src/
│   ├── backend/
│   │   ├── AppointmentScheduler.Api/     # ASP.NET Core Web API
│   │   └── AppointmentScheduler.sln      # Solution (API + tests)
│   └── frontend/                  # Angular workspace
│       ├── src/app/               # Application code (see below)
│       ├── proxy.conf.json        # Dev-server proxy: /api → http://localhost:5100
│       ├── angular.json           # Workspace/project configuration
│       └── package.json           # Frontend scripts and dependencies
├── tests/
│   ├── backend/
│   │   └── AppointmentScheduler.Api.Tests/   # xUnit tests (mirrors src/backend)
│   └── frontend/                  # Reserved for e2e tests (unit specs live beside the code)
├── .editorconfig                  # Editor-wide formatting rules
├── .gitattributes                 # Line-ending normalization
├── .gitignore                     # Ignored files (.NET, Node/Angular, OS, IDE)
├── .nvmrc                         # Node version for the frontend (22 LTS)
├── global.json                    # .NET SDK version
└── README.md                      # This file
```

The Angular application itself is organized like this:

```text
src/frontend/src/app/
├── core/                          # Cross-cutting code shared by all pages
│   ├── models/health-status.ts    # TypeScript mirror of a backend DTO
│   └── services/health.service.ts # Talks to GET /api/health
├── pages/                         # Routable pages, one folder each
│   ├── home/
│   ├── calendar/
│   ├── appointments/
│   └── statistics/
├── app.component.ts|html|css      # Shell: header, main navigation, router outlet
├── app.config.ts                  # App-wide providers (router, HttpClient)
└── app.routes.ts                  # Routes for the pages above
```

Unit tests sit next to the code they cover (`*.component.spec.ts`, `*.service.spec.ts`), which is
what the Angular CLI expects. `tests/backend/` mirrors `src/backend/` for C# tests, and
`tests/frontend/` is reserved for end-to-end tests.

## Prerequisites

- [Git](https://git-scm.com/downloads)
- [.NET SDK 9](https://dotnet.microsoft.com/download) — the version band is pinned in `global.json`
- [Node.js 22 LTS](https://nodejs.org/) — run `nvm use` (reads `.nvmrc`). Angular 19 does not
  support the odd-numbered Node releases.
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) or Docker — not needed
  until the database ticket lands

## Getting started

```bash
git clone https://github.com/ohmygodjustload/cs440-software-engineering-project.git
cd cs440-software-engineering-project
```

### Run the whole stack with one command

```bash
./scripts/dev.sh
```

Starts the C# API (<http://localhost:5100>) and the Angular dev server (<http://localhost:4200>)
together, then stops both when you press Ctrl+C. Open <http://localhost:4200> to see the site.
In VS Code, the `dev: full stack` task (`.vscode/tasks.json`) does the same thing.

If you would rather run the two halves separately, use the commands below.

### Backend (ASP.NET Core API)

```bash
dotnet run --project src/backend/AppointmentScheduler.Api
```

The API listens on <http://localhost:5100>. Confirm it is up:

```bash
curl http://localhost:5100/api/health
# {"status":"ok","service":"AppointmentScheduler.Api","timestamp":"..."}
```

Settings come from `appsettings.json`; `Cors:AllowedOrigins` lists the frontend origins allowed to
call the API. `appsettings.Development.json` is git-ignored, so put machine-specific settings there.

### Frontend (Angular)

```bash
cd src/frontend
npm install   # first time only
npm start     # ng serve → http://localhost:4200
```

Open <http://localhost:4200>. The UI is deliberately a bare skeleton for now: a top bar with one link
per page, and each page rendering `<Page> Here!`. `ng serve` proxies `/api` to the backend through
`src/frontend/proxy.conf.json`, ready for the first real screens. `npm run build` writes a static
bundle to `src/frontend/dist/`.

### Tests

```bash
dotnet test src/backend/AppointmentScheduler.sln                          # C# / xUnit
cd src/frontend && npm test -- --watch=false --browsers=ChromeHeadless    # Angular / Karma
```

In VS Code, the `dev: full stack` task starts the API and the dev server together; see
`.vscode/tasks.json` for the other tasks (`api: build`, `web: test`, …).

## Jira

<!-- TODO: replace with the real Jira board URL -->

Project board: https://baaa.atlassian.net/jira/software/projects/BAAAM/boards/3/backlog
