# Local Todo List

A simple, device-first todo list that keeps tasks in your browser's local storage. Nothing leaves your machine, so your list stays with you on your phone or computer.

## Usage

1. Open `index.html` in any modern browser, or serve the folder with a simple server (for example `python -m http.server 8000`).
2. Add tasks with the New button and input field. Choose between one-time tasks and **Daily tasks** (templates that can spawn a new task once per day). Click a task to edit, check the box to mark complete, and use **Delete** to remove it.
3. Switch between **All**, **Active**, **Completed**, **Daily tasks**, and **Deleted** filters.

## Storage

Todos are saved under the `local-todo-items` key in `localStorage`, while daily task templates live under `local-daily-templates`. Each device keeps its own copy.
