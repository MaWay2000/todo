# Local Todo List

A simple, device-first todo list that keeps tasks in your browser's local storage. Nothing leaves your machine, so your list stays with you on your phone or computer.

## Usage

1. Open `index.html` in any modern browser, or serve the folder with a simple server (for example `python -m http.server 8000`).
2. Add tasks with the input field. Click a task to edit, check the box to mark complete, and use **Delete** to remove it.
3. Switch between **All**, **Active**, and **Completed** filters. Use **Clear all** to wipe the list stored locally.

## Storage

Todos are saved under the `local-todo-items` key in `localStorage`, so each device keeps its own copy.
