# Contributing

This document defines the conventions every contributor follows when working in this repository. These rules are enforced at the GitHub level (branch protection, required reviews, and repo merge settings). The goal is that the wrong thing is impossible to do, not merely discouraged.

## Branching strategy

We use **GitHub Flow**:

- `main` is always deployable. It is protected, and no one pushes directly to it.
- All work happens on **short-lived feature branches** created from the latest `main`.
- When work is ready, open a **pull request** targeting `main`.
- Merges to `main` are **squash-merge only**. The head branch is deleted automatically.

We do **not** use a long-lived `develop` branch. Squash-merging through an integration branch loses history at every hop, and for a project of this size the extra ceremony is not worth it.

### Branch naming

All feature branches must match this regex:

```text
^[A-Z]+-\d+/[a-z0-9-]+$
```

Structure:

- Prefix with the Jira ticket key (e.g. `BAAAM-42`)
- Followed by `/`
- Followed by a short kebab-case slug describing the work

Examples:

- `BAAAM-18/setup-repository`
- `BAAAM-42/add-login-form`
- `BAAAM-101/fix-mongodb-connection`

A CI check will be added in a follow-up ticket to enforce this pattern automatically.

## Commit conventions

We follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

### Format

```text
<type>(<optional scope>): <short summary>

<optional body>

<optional footer(s)>
```

### Allowed types

| Type       | Use for                                                       |
| ---------- | ------------------------------------------------------------- |
| `feat`     | A new feature                                                 |
| `fix`      | A bug fix                                                     |
| `docs`     | Documentation-only changes                                    |
| `style`    | Formatting, whitespace, missing semicolons (no logic change)  |
| `refactor` | Code change that neither fixes a bug nor adds a feature       |
| `perf`     | Performance improvement                                       |
| `test`     | Adding or updating tests                                      |
| `build`    | Build system or dependency changes (npm, NuGet)               |
| `ci`       | CI configuration changes                                      |
| `chore`    | Repo housekeeping / tooling / non-user-facing changes         |
| `revert`   | Reverting a previous commit                                   |

### Examples

```text
feat(auth): add JWT-based login endpoint
fix(mongo): reconnect on transient connection loss
docs(readme): document backend run instructions
chore(repo): scaffold conventions, docs, and directory skeleton (BAAAM-18)
```

Because we squash-merge, **the PR title is what ends up on `main`** as the commit subject. PR titles must therefore also follow Conventional Commits. A CI check will enforce this in a follow-up ticket.

## Pull request process

1. Create a branch from an up-to-date `main` matching the branch naming regex above.
2. Open the PR as a **draft** early. This signals intent and unblocks feedback.
3. Fill out the [pull request template](.github/pull_request_template.md) completely. Every checklist item must be checked before requesting review.
4. Every PR must reference its Jira ticket using `Closes BAAAM-XX` in the description so Jira auto-transitions the ticket on merge.
5. Request at least one review from a teammate. Reviews from [CODEOWNERS](.github/CODEOWNERS) are required.
6. Address all review comments and resolve all conversations before merging.
7. Merge using **Squash and merge** only. The merge button will not offer other options.
8. The branch will be deleted automatically on merge.

### Code review expectations

- Reviewers should respond within one business day when possible.
- Keep PRs small and focused on a single ticket. If a PR grows beyond a few hundred lines of meaningful diff, split it.
- Approve only when you would be comfortable owning the code.

## Local setup

See [README.md](README.md) for prerequisites and getting started.

## Deferred to follow-up tickets

The following enforcement pieces are intentionally not in place yet and will be added in later tickets:

- Required CI status checks (Conventional Commits check, branch name check, .NET build/test, Angular build/test)
- Automated linting / formatting on push
- MongoDB dev environment (Docker Compose, Testcontainers)
- Deployment workflows

Until those land, contributors are responsible for following the conventions manually. Reviewers should reject PRs that violate them.
