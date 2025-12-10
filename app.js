const STORAGE_KEY = "local-todo-items";
let todos = [];
let filter = "all";

const listEl = document.getElementById("todo-list");
const formEl = document.getElementById("todo-form");
const inputEl = document.getElementById("todo-input");
const commentEl = document.getElementById("todo-comment");
const clearAllEl = document.getElementById("clear-all");
const openAddEl = document.getElementById("open-add");
const cancelAddEl = document.getElementById("cancel-add");
const dialogEl = document.getElementById("add-dialog");
const filterButtons = document.querySelectorAll(".filter-button");
const countAllEl = document.getElementById("count-all");
const countActiveEl = document.getElementById("count-active");
const canvasMinHeight = 360;
const DEFAULT_CARD_WIDTH = 260;
const MIN_CARD_WIDTH = 180;
const MAX_CARD_WIDTH = 320;
const MIN_CARD_HEIGHT = 96;
const MAX_CARD_HEIGHT = 460;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const formatDateTime = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

function ensureLayoutDefaults() {
  let mutated = false;
  todos = todos.map((todo, index) => {
    const position = todo.position ?? { x: 12, y: index * 90 };
    const size = {
      width: clamp(todo.size?.width ?? DEFAULT_CARD_WIDTH, MIN_CARD_WIDTH, MAX_CARD_WIDTH),
      height: todo.size?.height
        ? clamp(todo.size.height, MIN_CARD_HEIGHT, MAX_CARD_HEIGHT)
        : null,
    };
    const createdAt = todo.createdAt ?? new Date().toISOString();
    const comments = todo.comments ?? "";
    const showActions = todo.showActions ?? false;
    if (!todo.position || !todo.size) {
      mutated = true;
    }
    if (!todo.createdAt || todo.comments === undefined || todo.showActions === undefined) {
      mutated = true;
    }
    return { ...todo, position, size, createdAt, comments, showActions };
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

    const shell = document.createElement("div");
    shell.className = "todo-shell";

    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent = todo.completed ? "Done" : "";

    const title = document.createElement("span");
    title.className = "todo-title";
    title.textContent = todo.text;
    title.addEventListener("pointerdown", (event) => event.stopPropagation());
    title.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleActionsVisibility(todo.id);
    });

    shell.appendChild(status);
    shell.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "action-row";
    item.classList.toggle("actions-visible", todo.showActions);

    const makeActionButton = (icon, label, handler, extraClass = "") => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `action-button ${extraClass}`.trim();
      button.textContent = icon;
      button.setAttribute("aria-label", label);
      button.addEventListener("click", handler);
      return button;
    };

    const editBtn = makeActionButton("✏️", "Edit", () => editTodo(todo.id));
    const deleteBtn = makeActionButton("❌", "Delete", () => deleteTodo(todo.id));
    const toggleBtn = makeActionButton(
      todo.completed ? "↩️" : "✅",
      todo.completed ? "Mark active" : "Mark done",
      () => toggleTodo(todo.id)
    );

    const detailsBtn = makeActionButton("▢", "Expand info", () => {
      item.classList.toggle("details-open");
      const isOpen = item.classList.contains("details-open");
      detailsBtn.textContent = isOpen ? "▣" : "▢";
      detailsBtn.setAttribute("aria-label", isOpen ? "Hide info" : "Expand info");
      updateCanvasHeight();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(toggleBtn);
    actions.appendChild(detailsBtn);

    const details = document.createElement("div");
    details.className = "todo-details";
    const created = document.createElement("div");
    created.innerHTML = `<strong>Created:</strong> ${formatDateTime(
      todo.createdAt
    )}`;
    const comments = document.createElement("div");
    const hasComment = todo.comments && todo.comments.trim().length > 0;
    comments.innerHTML = `<strong>Comments:</strong> ${
      hasComment ? todo.comments : "No comments"
    }`;
    details.appendChild(created);
    details.appendChild(comments);

    const resizeHandle = document.createElement("span");
    resizeHandle.className = "resize-handle";
    resizeHandle.setAttribute("aria-label", "Resize task");

    item.appendChild(shell);
    item.appendChild(actions);
    item.appendChild(details);
    item.appendChild(resizeHandle);
    attachDrag(shell, item, todo.id);
    attachResize(resizeHandle, item, todo.id);
    listEl.appendChild(item);
  });

  updateCounts();
  updateCanvasHeight();
}

function addTodo(text, comments = "") {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const defaultPosition = { x: 12, y: todos.length * 90 };
  const cleanedComments = comments.trim();
  todos.unshift({
    id: crypto.randomUUID(),
    text: trimmed,
    completed: false,
    position: defaultPosition,
    size: { width: DEFAULT_CARD_WIDTH, height: null },
    createdAt: new Date().toISOString(),
    comments: cleanedComments,
    showActions: false,
  });
  saveTodos();
  renderTodos();
  return true;
}

function toggleActionsVisibility(id) {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, showActions: !todo.showActions } : todo
  );
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

function attachDrag(handle, item, id, callbacks = {}) {
  const startDrag = (event) => {
    if (event.button !== 0) return;

    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const containerRect = listEl.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = todo.position?.x ?? 0;
    const startTop = todo.position?.y ?? 0;

    handle.setPointerCapture(event.pointerId);

    let isDragging = false;
    const dragThreshold = 3;

    const onMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      if (!isDragging) {
        const hasMoved =
          Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold;
        if (!hasMoved) {
          return;
        }
        isDragging = true;
        callbacks.onDragStart?.();
        item.classList.add("dragging");
      }

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

      if (isDragging) {
        const left = parseFloat(item.style.left) || 0;
        const top = parseFloat(item.style.top) || 0;
        todos = todos.map((todoItem) =>
          todoItem.id === id
            ? { ...todoItem, position: { x: left, y: top } }
            : todoItem
        );
        saveTodos();
        updateCanvasHeight();
      }

      callbacks.onDragEnd?.(isDragging);

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

function attachResize(handle, item, id) {
  const startResize = (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;

    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = item.offsetWidth;
    const startHeight = item.offsetHeight;

    handle.setPointerCapture(event.pointerId);

    let isResizing = false;
    const onMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      if (!isResizing && (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1)) {
        isResizing = true;
        item.classList.add("resizing");
      }

      if (!isResizing) return;

      const nextWidth = clamp(
        startWidth + deltaX,
        MIN_CARD_WIDTH,
        MAX_CARD_WIDTH
      );
      const nextHeight = clamp(
        startHeight + deltaY,
        MIN_CARD_HEIGHT,
        MAX_CARD_HEIGHT
      );

      item.style.width = `${nextWidth}px`;
      item.style.height = `${nextHeight}px`;
      updateCanvasHeight();
    };

    const onUp = () => {
      handle.releasePointerCapture(event.pointerId);
      if (isResizing) {
        const width = parseFloat(item.style.width) || startWidth;
        const height = parseFloat(item.style.height) || startHeight;
        todos = todos.map((todoItem) =>
          todoItem.id === id
            ? { ...todoItem, size: { width, height } }
            : todoItem
        );
        saveTodos();
        updateCanvasHeight();
      }
      item.classList.remove("resizing");

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
  const added = addTodo(inputEl.value, commentEl.value);
  if (added) {
    inputEl.value = "";
    commentEl.value = "";
    dialogEl.close();
  }
});

clearAllEl.addEventListener("click", clearAll);

openAddEl.addEventListener("click", () => {
  inputEl.value = "";
  commentEl.value = "";
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
