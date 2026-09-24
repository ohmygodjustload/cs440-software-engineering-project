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

- **Backend:** ASP.NET Core 10 (C#) Web API — `src/backend`
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

You need one toolchain per half of the stack. Install everything below before running the site:

| Tool | Version | Why / notes |
|---|---|---|
| [Git](https://git-scm.com/downloads) | any recent | Cloning the repo |
| [.NET SDK 10](https://dotnet.microsoft.com/download/dotnet/10.0) | 10.0.100+ | Builds and runs the API. The exact band is pinned in `global.json` — anything older refuses to build |
| [Node.js 22 LTS](https://nodejs.org/) | 22.x (see `.nvmrc`) | Runs the Angular dev server. Angular 19 does not support odd-numbered Node releases (23, …) |
| [Google Chrome](https://www.google.com/chrome/) | any recent | Only needed for `npm test` (Karma runs headless Chrome) |
| [MongoDB Community Server](https://www.mongodb.com/try/download/community) or Docker | — | **Not needed yet** — the database ticket hasn't landed |

> **VS Code (recommended):** install the extensions in `.vscode/extensions.json` when
> prompted (Angular Language Service, C# Dev Kit, EditorConfig). `.vscode/tasks.json`
> provides `api: build`, `api: test`, `api: run`, `web: start`, and `dev: full stack`.

### 1. Install Git

<table>
<tr><th>macOS</th><th>Windows</th><th>Linux (Debian/Ubuntu)</th></tr>
<tr>
<td>

```bash
brew install git
```

</td>
<td>

Download the installer from
[git-scm.com](https://git-scm.com/downloads),
or:

```powershell
winget install --id Git.Git -e --source winget
```

</td>
<td>

```bash
sudo apt update && sudo apt install -y git
```

</td>
</tr>
</table>

### 2. Install the .NET 10 SDK

`global.json` pins the SDK band (`10.0.100`, rolling forward to newer 10.0.x feature
bands). Verify with `dotnet --list-sdks` — you must see a `10.0.1xx` (or newer 10.0.x)
entry. **Without it, every `dotnet` command fails**, including the VS Code `api:*` tasks
and `scripts/dev.sh`.

<table>
<tr><th>macOS</th><th>Windows</th><th>Linux (Debian/Ubuntu)</th></tr>
<tr>
<td>

```bash
brew install --cask dotnet-sdk
dotnet --list-sdks   # expect 10.0.1xx or newer
```

Or grab the macOS installer from
[dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/10.0).

</td>
<td>

```powershell
winget install --id Microsoft.DotNet.SDK.10 -e --source winget
dotnet --list-sdks   # expect 10.0.1xx or newer
```

Or grab the Windows installer from
[dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/10.0).

</td>
<td>

```bash
# Register the Microsoft package feed first, then install
# (distro-specific steps: https://learn.microsoft.com/dotnet/core/install/linux):
sudo apt update && sudo apt install -y dotnet-sdk-10.0
dotnet --list-sdks   # expect 10.0.1xx or newer
```

</td>
</tr>
</table>

### 3. Install Node.js 22 LTS

The repo pins Node 22 in `.nvmrc`. A version manager is the easiest way to match it:

```bash
nvm install   # reads .nvmrc → Node 22 (macOS / Linux / WSL)
nvm use
node --version   # expect v22.x.x
```

<table>
<tr><th>macOS</th><th>Windows</th><th>Linux (Debian/Ubuntu)</th></tr>
<tr>
<td>

```bash
brew install nvm
# then in a fresh shell:
nvm install   # reads .nvmrc → Node 22
nvm use
```

Or download the **Node 22 LTS** macOS installer from
[nodejs.org](https://nodejs.org/).

</td>
<td>

Install [nvm-windows](https://github.com/coreybutler/nvm-windows/releases),
then in a fresh terminal:

```powershell
cd cs440-software-engineering-project
nvm install 22
nvm use 22
```

Or download the **Node 22 LTS** Windows installer from
[nodejs.org](https://nodejs.org/).

</td>
<td>

Install [nvm](https://github.com/nvm-sh/nvm#installing-and-updating),
then:

```bash
nvm install   # reads .nvmrc → Node 22
nvm use
```

Or use the [NodeSource](https://github.com/nodesource/distributions)
APT setup for Node 22.

</td>
</tr>
</table>

⚠️ **Node version gotcha (we hit this ourselves):** Node v23+ is installed by default on
some machines, but Angular 19 refuses to build on odd-numbered Node releases. If
`ng serve` fails with an engine error, run `node --version` — if it shows v23 or later,
switch to 22 (`nvm use`) and retry.

### 4. Clone the repo

```bash
git clone https://github.com/ohmygodjustload/cs440-software-engineering-project.git
cd cs440-software-engineering-project
```

## Getting started

### Quickstart (first run)

Run these once, in order. Afterwards, the daily command is just step 3.

```bash
# 0. Confirm your toolchains (from the repo root):
dotnet --list-sdks   # must show a 10.0.x SDK (pinned in global.json)
node --version       # must show v22.x (pinned in .nvmrc)
```

```bash
# 1. Restore the backend (downloads NuGet packages):
dotnet restore src/backend/AppointmentScheduler.sln
```

```bash
# 2. Install the frontend dependencies (first time only, ~1 min):
cd src/frontend && npm install && cd ../..
# (scripts/dev.sh does this for you if node_modules/ is missing)
```

```bash
# 3. Start everything:
./scripts/dev.sh
```

Starts the C# API (<http://localhost:5100>) and the Angular dev server (<http://localhost:4200>)
together, then stops both when you press Ctrl+C.

Open <http://localhost:4200> to see the site:

| URL | What it is |
|---|---|
| <http://localhost:4200> | Angular app. `/api/*` requests are proxied to the backend via `src/frontend/proxy.conf.json` |
| <http://localhost:5100/api/health> | API health check — expect `{"status":"ok","service":"AppointmentScheduler.Api",...}` |
| <http://localhost:5100/openapi/v1.json> | Generated OpenAPI document (v3.1, Development only) |

In VS Code, the `dev: full stack` task (`.vscode/tasks.json`) does the same thing — run it
from the Command Palette (**Tasks: Run Task** → `dev: full stack`).

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

### Sanity checks

If something looks wrong, work through these top to bottom:

```bash
dotnet --list-sdks                        # 10.0.x present? If not, Prerequisites step 2
node --version                            # v22.x? If v23+, `nvm use` and reinstall node_modules
curl http://localhost:5100/api/health     # API up? Expect {"status":"ok",...}
```

Common causes:

- **`SDK '10.0.100' not found` / `A compatible SDK was not found`** — the .NET 10 SDK
  isn't installed (Prerequisites step 2). `global.json` pins the 10.0.100 band.
- **`ng serve` engine / version error** — wrong Node major version (see the Node gotcha
  in Prerequisites step 3). Delete `src/frontend/node_modules` and re-run `npm install`
  after switching to Node 22.
- **`EADDRINUSE` / port already in use** — a previous `./scripts/dev.sh` didn't shut down
  cleanly. Kill leftovers on the dev ports, then retry:
  ```bash
  lsof -ti tcp:5100 | xargs kill   # the API
  lsof -ti tcp:4200 | xargs kill   # the Angular dev server
  ```
- **Blank page at :4200 with `/api/health` failing in devtools** — the backend isn't
  running (the dev server proxies `/api` to <http://localhost:5100>). Start it with
  `dotnet run --project src/backend/AppointmentScheduler.Api`.
- **CORS errors calling the API directly from a browser** (bypassing the proxy) — add your
  origin to `Cors:AllowedOrigins` in `appsettings.Development.json` (git-ignored;
  machine-specific overrides live there).

## Jira

<!-- TODO: replace with the real Jira board URL -->

Project board: https://baaa.atlassian.net/jira/software/projects/BAAAM/boards/3/backlog
