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
