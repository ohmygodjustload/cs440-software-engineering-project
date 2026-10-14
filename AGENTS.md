# Agent Rules

Rules for AI coding agents working in this repository. They apply to every chat and every team member.

## Allowed without asking

- Read files, search the codebase, and run read-only commands (`git status`, `git log`, `git diff`, `gh pr view`, `gh pr list`).
- Create and edit files inside this repository.
- Build, test, and lint locally (`dotnet build`, `dotnet test`, `ng test`, `ng lint`).

## Ask first

- Any command that changes local git state: `commit`, `checkout`, `switch`, `branch`, `stash`, `merge`, `rebase`, `reset`, `restore`, `clean`.
- Adding, removing, or upgrading a dependency (`npm install <pkg>`, `dotnet add package`).
- Sending requests that create, change, or delete data (POST, PUT, PATCH, DELETE) to an API that is connected to the shared MongoDB database.

## Never do; give step-by-step instructions instead

- `git push`, or anything else that changes GitHub: pull requests, reviews, merges, labels, branches, repository settings, branch protection, rulesets, secrets, or Actions.
- Changes to shared services: MongoDB Atlas (data, users, network access), Jira.

When one of these is needed, write out the exact commands or UI steps for the user to run, then wait for them to confirm before continuing.

## Always

- Never put secrets (connection strings, passwords, tokens) in tracked files.
- Follow [CONTRIBUTING.md](CONTRIBUTING.md) for branching, commit messages, and the pull request process.

## Project context

BAAAM Scheduling System: clients book appointments by category (medical, beauty, fitness) with service providers; admins approve providers and manage accounts.

- **Layout:** `src/backend` (ASP.NET Core, .NET 10), `tests/backend` (mirrors `src/backend`), `src/frontend` (Angular). `scripts/dev.ps1` / `scripts/dev.sh` start the API (port 5100) and the Angular dev server (port 4200) together.
- **Tests:** `dotnet test src/backend/AppointmentScheduler.sln` for the backend; `ng test` in `src/frontend` for the frontend.
- **Data stores:** `Program.cs` uses the Mongo stores only when `MongoDb:ConnectionString` is set (for example in the git-ignored `appsettings.Development.json`); otherwise it uses the in-memory stores.
- **Frontend to API:** pages call the API through services in `src/frontend/src/app/core/services`, following the pattern in `health.service.ts`.
- **Data model:** [docs/DB_Cheatsheet.md](docs/DB_Cheatsheet.md) is the source of truth for collections and field names.
- **Jira:** `docs/Jira.csv` is a point-in-time export and may be out of date. The ticket text given in the chat is authoritative.

### Domain decisions

- A slot is an `Appointment` with status `Available` and `UserId` null. Booking sets `UserId` to the client and the status to `Booked`.
- An appointment's provider and location come from its `AppointmentType`.
- Provider approval uses one `ProviderRequest` per application. Approve: request `IsReviewed` and `IsApproved` true, and `Provider.IsApproved` true. Reject: request `IsReviewed` true, `IsApproved` false, reason in `Notes`. A rejected provider re-applies with a new request.
- Deletes are soft (`IsDeleted`, `DeletedAt`), every query filters `IsDeleted` false, and all times are UTC.
