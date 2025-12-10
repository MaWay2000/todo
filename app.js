const STORAGE_KEY = "local-todo-items";
let todos = [];
let filter = "all";

const listEl = document.getElementById("todo-list");
const formEl = document.getElementById("todo-form");
const inputEl = document.getElementById("todo-input");
const clearAllEl = document.getElementById("clear-all");
const filterButtons = document.querySelectorAll(".filter-button");
const countAllEl = document.getElementById("count-all");
const countActiveEl = document.getElementById("count-active");

function loadTodos() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    todos = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load todos", error);
    todos = [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function updateCounts() {
  countAllEl.textContent = `${todos.length} total`;
  const active = todos.filter((todo) => !todo.completed).length;
  countActiveEl.textContent = `${active} active`;
}

function renderTodos() {
  listEl.innerHTML = "";
  const filtered = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No tasks yet. Add something above!";
    listEl.appendChild(empty);
    updateCounts();
    return;
  }

  filtered.forEach((todo) => {
    const item = document.createElement("li");
    item.className = "todo-item" + (todo.completed ? " completed" : "");
    item.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.addEventListener("change", () => toggleTodo(todo.id));

    const text = document.createElement("div");
    text.className = "text";
    text.textContent = todo.text;
    text.title = "Click to edit";
    text.addEventListener("click", () => editTodo(todo.id));

    const actions = document.createElement("div");
    actions.className = "actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-button";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

    actions.appendChild(deleteBtn);

    item.appendChild(checkbox);
    item.appendChild(text);
    item.appendChild(actions);
    listEl.appendChild(item);
  });

  updateCounts();
}

function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos.unshift({ id: crypto.randomUUID(), text: trimmed, completed: false });
  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  saveTodos();
  renderTodos();
}

function editTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  const nextText = prompt("Edit task", todo.text);
  if (nextText === null) return;
  const trimmed = nextText.trim();
  if (!trimmed) return;
  todos = todos.map((t) => (t.id === id ? { ...t, text: trimmed } : t));
  saveTodos();
  renderTodos();
}

function clearAll() {
  if (!todos.length) return;
  const confirmClear = confirm("Clear all tasks?");
  if (!confirmClear) return;
  todos = [];
  saveTodos();
  renderTodos();
}

function setFilter(nextFilter) {
  filter = nextFilter;
  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });
  renderTodos();
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  addTodo(inputEl.value);
  inputEl.value = "";
  inputEl.focus();
});

clearAllEl.addEventListener("click", clearAll);

filterButtons.forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

loadTodos();
renderTodos();
