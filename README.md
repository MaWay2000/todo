# Local Todo List

[**Open the live to-do app**](https://maway2000.github.io/todo/) · [Source code](https://github.com/MaWay2000/todo)

A simple, device-first task list that saves tasks in your browser. Use it for one-time tasks and recurring daily task templates without creating an account or setting up a backend.

## Features

- Add and edit one-time tasks.
- Create daily templates that can generate a task once per day.
- Mark tasks as complete or delete them.
- Filter the list by **All**, **Active**, **Completed**, **Daily tasks**, and **Deleted**.
- Keep tasks locally using browser storage.

## Getting started

1. [Open the app](https://maway2000.github.io/todo/) in your browser.
2. Use **New** and the input field to add a task.
3. Choose a one-time task or a daily task template.
4. Click a task to edit it, use its checkbox to mark it complete, or choose **Delete**.
5. Use the filters to focus on the tasks you need.

Daily templates can create a new task once per day. They are managed by the app; this is not a background notification or reminder service.

## Where tasks are stored

The app uses `localStorage`:

| Key | Data |
| --- | --- |
| `local-todo-items` | Task items |
| `local-daily-templates` | Daily task templates |

Each browser profile and site address has its own copy. Tasks are not automatically synchronized between your phone and computer, between browsers, or between the live app and a local server.

Clearing browser/site data can remove your list. Private browsing may discard data when the session ends. Do not treat browser storage as a permanent backup of important information.

## Run locally

Install Python 3, then:

```bash
git clone https://github.com/MaWay2000/todo.git
cd todo
python -m http.server 8000
```

Open [http://localhost:8000/](http://localhost:8000/). Stop the server with Ctrl+C when finished. No build tools or database are required.

Keep using the same local address and port if you want to access the same browser-stored list.

## Development and feedback

The application is a static website hosted through GitHub Pages. When changing it, preserve existing storage keys and task data.

To check a change, add and edit a task, mark it complete, exercise each filter, and reload the page to confirm that data persists. Use a separate browser profile for destructive storage tests.

The repository's issue tracker is currently disabled. When sharing a bug report with the maintainer, include your browser, reproduction steps, and whether the problem occurs on the live app or a local copy. Avoid sharing private task contents. Proposed fixes can be submitted through the [repository](https://github.com/MaWay2000/todo).
