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

- **Backend:** C# / .NET
- **Database:** MongoDB
- **Frontend:** Angular (tentative)
- **Version control:** Git + GitHub
- **Project management:** Jira (`BAAAM`)

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

`tests/` mirrors `src/` so each area’s tests live in the parallel path.

## Prerequisites

- [Git](https://git-scm.com/downloads)
- [.NET SDK](https://dotnet.microsoft.com/download) (exact version confirmed when the backend is scaffolded)
- [Node.js](https://nodejs.org/) LTS (for Angular)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) or Docker to run MongoDB locally

## Getting started

```bash
git clone https://github.com/ohmygodjustload/cs440-software-engineering-project.git
cd cs440-software-engineering-project
```

Backend and frontend run instructions will be added when each project is scaffolded.

## Contributing

All contributions must follow [CONTRIBUTING.md](CONTRIBUTING.md). Conventions are enforced at the GitHub level (branch protection, squash-merge only).

## Jira

<!-- TODO: replace with the real Jira board URL -->

Project board: `https://<your-jira-host>/jira/software/projects/BAAAM/board`
