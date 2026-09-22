# CS440 Software Engineering Project

<!-- TODO(BAAAM-18): replace with the real project name and one-line description once decided by the team -->

> One-line project description goes here.

A group project for CS440 (Software Engineering) at the University of Wisconsin - La Crosse.

## Team

<!-- TODO(BAAAM-18): list all team members with their GitHub handles, then mirror them into .github/CODEOWNERS -->

- [@ohmygodjustload](https://github.com/ohmygodjustload)

## Tech stack

- **Backend:** C# / .NET
- **Database:** MongoDB
- **Frontend:** Angular (tentative)
- **Version control:** Git + GitHub
- **Project management:** Jira

## Repository layout

```text
.
├── .github/                       # GitHub-specific config (PR template, CODEOWNERS)
├── src/
│   ├── backend/                   # C# / .NET solution (added in a follow-up ticket)
│   └── frontend/                  # Angular app (added in a follow-up ticket)
├── tests/
│   ├── backend/                   # .NET test projects (mirrors src/backend)
│   └── frontend/                  # Angular tests / e2e (mirrors src/frontend)
├── .editorconfig                  # Editor-wide formatting rules
├── .gitattributes                 # Line-ending normalization
├── .gitignore                     # Ignored files (.NET, Node/Angular, OS, IDE)
├── CONTRIBUTING.md                # Branching, commits, PR process
└── README.md                      # This file
```

`tests/` mirrors `src/` so each area's tests live in the parallel path.

## Prerequisites

- [Git](https://git-scm.com/downloads)
- [.NET SDK](https://dotnet.microsoft.com/download) (exact version confirmed when the backend is scaffolded)
- [Node.js](https://nodejs.org/) LTS (for Angular)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) or Docker to run MongoDB locally

## Getting started

<!-- TODO: expand once the backend and frontend are scaffolded in follow-up tickets -->

```bash
git clone https://github.com/ohmygodjustload/cs440-software-engineering-project.git
cd cs440-software-engineering-project
```

Backend and frontend run instructions will be added in the tickets that scaffold each project.

## Contributing

All contributions must follow the conventions in [CONTRIBUTING.md](CONTRIBUTING.md). Those conventions are enforced at the GitHub level (branch protection, required checks, squash-merge-only), so the wrong workflow is blocked at the merge button rather than caught in review.

## Jira

<!-- TODO(BAAAM-18): replace with the real Jira board URL -->

Project board: `https://<your-jira-host>/jira/software/projects/BAAAM/board`
