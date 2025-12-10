const STORAGE_KEY = "local-todo-items";
let todos = [];
let filter = "all";

const listEl = document.getElementById("todo-list");
const formEl = document.getElementById("todo-form");
const inputEl = document.getElementById("todo-input");
const clearAllEl = document.getElementById("clear-all");
const openAddEl = document.getElementById("open-add");
const cancelAddEl = document.getElementById("cancel-add");
const dialogEl = document.getElementById("add-dialog");
const filterButtons = document.querySelectorAll(".filter-button");
const countAllEl = document.getElementById("count-all");
const countActiveEl = document.getElementById("count-active");
const canvasMinHeight = 360;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function ensureLayoutDefaults() {
  let mutated = false;
  todos = todos.map((todo, index) => {
    const position = todo.position ?? { x: 12, y: index * 90 };
    const size = todo.size ?? { width: 340, height: null };
    if (!todo.position || !todo.size) {
      mutated = true;
    }
    return { ...todo, position, size };
  });

  if (mutated) {
    saveTodos();
  }
}

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
    listEl.style.height = `${canvasMinHeight}px`;
    updateCounts();
    return;
  }

  filtered.forEach((todo) => {
    const item = document.createElement("li");
    item.className = "todo-item" + (todo.completed ? " completed" : "");
    item.dataset.id = todo.id;
    item.style.left = `${todo.position.x}px`;
    item.style.top = `${todo.position.y}px`;
    item.style.width = `${todo.size.width}px`;
    if (todo.size.height) {
      item.style.height = `${todo.size.height}px`;
    }

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

    const dragHandle = document.createElement("button");
    dragHandle.className = "icon-button drag-handle";
    dragHandle.type = "button";
    dragHandle.title = "Drag task";
    dragHandle.setAttribute("aria-label", "Drag task");
    dragHandle.textContent = "Move";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-button";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

    actions.appendChild(dragHandle);
    actions.appendChild(deleteBtn);

    const resizeHandle = document.createElement("button");
    resizeHandle.className = "resize-handle";
    resizeHandle.type = "button";
    resizeHandle.setAttribute("aria-label", "Resize task");

    item.appendChild(checkbox);
    item.appendChild(text);
    item.appendChild(actions);
    item.appendChild(resizeHandle);
    attachDrag(item, dragHandle, todo.id);
    attachResize(item, resizeHandle, todo.id);
    listEl.appendChild(item);
  });

  updateCounts();
  updateCanvasHeight();
}

function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const defaultPosition = { x: 12, y: todos.length * 90 };
  todos.unshift({
    id: crypto.randomUUID(),
    text: trimmed,
    completed: false,
    position: defaultPosition,
    size: { width: 340, height: null },
  });
  saveTodos();
  renderTodos();
  return true;
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

function attachDrag(item, handle, id) {
  const startDrag = (event) => {
    event.preventDefault();
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const containerRect = listEl.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = todo.position?.x ?? 0;
    const startTop = todo.position?.y ?? 0;

    handle.setPointerCapture(event.pointerId);
    item.classList.add("dragging");

    const onMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const desiredX = startLeft + deltaX;
      const desiredY = startTop + deltaY;
      const containerWidth = listEl.clientWidth || containerRect.width;
      let containerHeight =
        parseFloat(listEl.style.height) || listEl.clientHeight || canvasMinHeight;

      if (desiredY + item.offsetHeight + 16 > containerHeight) {
        containerHeight = desiredY + item.offsetHeight + 16;
        listEl.style.height = `${containerHeight}px`;
      }

      const maxX = Math.max(0, containerWidth - item.offsetWidth);
      const maxY = Math.max(0, containerHeight - item.offsetHeight);
      const nextX = clamp(desiredX, 0, maxX);
      const nextY = clamp(desiredY, 0, maxY);
      item.style.left = `${nextX}px`;
      item.style.top = `${nextY}px`;
      updateCanvasHeight();
    };

    const onUp = () => {
      handle.releasePointerCapture(event.pointerId);
      item.classList.remove("dragging");
      const left = parseFloat(item.style.left) || 0;
      const top = parseFloat(item.style.top) || 0;
      todos = todos.map((todoItem) =>
        todoItem.id === id
          ? { ...todoItem, position: { x: left, y: top } }
          : todoItem
      );
      saveTodos();
      updateCanvasHeight();
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  handle.addEventListener("pointerdown", startDrag);
}

function attachResize(item, handle, id) {
  const startResize = (event) => {
    event.preventDefault();
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = item.offsetWidth;
    const startHeight = item.offsetHeight;

    handle.setPointerCapture(event.pointerId);
    item.classList.add("resizing");

    const onMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const nextWidth = Math.max(240, startWidth + deltaX);
      const nextHeight = Math.max(80, startHeight + deltaY);
      item.style.width = `${nextWidth}px`;
      item.style.height = `${nextHeight}px`;
      updateCanvasHeight();
    };

    const onUp = () => {
      handle.releasePointerCapture(event.pointerId);
      item.classList.remove("resizing");
      const width = parseFloat(item.style.width) || item.offsetWidth;
      const height = parseFloat(item.style.height) || item.offsetHeight;
      todos = todos.map((todoItem) =>
        todoItem.id === id
          ? { ...todoItem, size: { width, height } }
          : todoItem
      );
      saveTodos();
      updateCanvasHeight();
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  handle.addEventListener("pointerdown", startResize);
}

function updateCanvasHeight() {
  const items = listEl.querySelectorAll(".todo-item");
  if (!items.length) {
    listEl.style.height = `${canvasMinHeight}px`;
    return;
  }
  let maxBottom = 0;
  items.forEach((item) => {
    const top = parseFloat(item.style.top) || 0;
    const height = item.offsetHeight;
    maxBottom = Math.max(maxBottom, top + height);
  });
  listEl.style.height = `${Math.max(maxBottom + 16, canvasMinHeight)}px`;
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const added = addTodo(inputEl.value);
  if (added) {
    inputEl.value = "";
    dialogEl.close();
  }
});

clearAllEl.addEventListener("click", clearAll);

openAddEl.addEventListener("click", () => {
  inputEl.value = "";
  dialogEl.showModal();
  inputEl.focus();
});

cancelAddEl.addEventListener("click", () => {
  dialogEl.close();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

loadTodos();
ensureLayoutDefaults();
renderTodos();
