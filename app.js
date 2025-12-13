const STORAGE_KEY = "local-todo-items";
let todos = [];
let filter = "active";

const listEl = document.getElementById("todo-list");
const formEl = document.getElementById("todo-form");
const inputEl = document.getElementById("todo-input");
const commentEl = document.getElementById("todo-comment");
const openAddEl = document.getElementById("open-add");
const cancelAddEl = document.getElementById("cancel-add");
const dialogEl = document.getElementById("add-dialog");
const filterButtons = document.querySelectorAll(".filter-button");
const countAllEl = document.getElementById("count-all");
const countActiveEl = document.getElementById("count-active");
const canvasMinHeight = 360;
const DEFAULT_CARD_WIDTH = 260;
const DEFAULT_AUTO_WIDTH = true;
const DEFAULT_POSITION = { x: 12, y: 12 };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const formatDateTime = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

function getContentMinSize(item) {
  const style = window.getComputedStyle(item);
  const paddingX =
    parseFloat(style.paddingLeft || 0) + parseFloat(style.paddingRight || 0);
  const paddingY =
    parseFloat(style.paddingTop || 0) + parseFloat(style.paddingBottom || 0);

  const shell = item.querySelector(".todo-shell");
  const actions = item.querySelector(".action-row");
  const details = item.querySelector(".todo-details");

  const shellWidth = shell?.scrollWidth ?? 0;
  const actionsWidth = actions?.scrollWidth ?? 0;
  const detailsWidth = item.classList.contains("details-open")
    ? details?.scrollWidth ?? 0
    : 0;

  const shellHeight = shell?.offsetHeight ?? 0;
  const actionsHeight =
    item.classList.contains("actions-visible") && actions
      ? actions.offsetHeight
      : 0;
  const detailsHeight =
    item.classList.contains("details-open") && details ? details.offsetHeight : 0;

  const minWidth = Math.ceil(
    Math.max(shellWidth, actionsWidth, detailsWidth) + paddingX
  );
  const minHeight = Math.ceil(shellHeight + actionsHeight + detailsHeight + paddingY);

  return { minWidth, minHeight };
}

function adjustItemSizeToContent(item, todo) {
  const { minWidth, minHeight } = getContentMinSize(item);
  item.style.minWidth = `${minWidth}px`;
  item.style.minHeight = `${minHeight}px`;

  const hasFixedHeight = todo.size?.height !== null && todo.size?.height !== undefined;
  const currentWidth = parseFloat(item.style.width) || item.offsetWidth || minWidth;
  const currentHeight = hasFixedHeight
    ? parseFloat(item.style.height) || item.offsetHeight || minHeight
    : item.offsetHeight || minHeight;

  const prefersAutoWidth = todo.size?.autoWidth ?? DEFAULT_AUTO_WIDTH;
  const width = prefersAutoWidth ? minWidth : Math.max(currentWidth, minWidth);
  const height = hasFixedHeight ? Math.max(currentHeight, minHeight) : null;

  item.style.width = `${width}px`;
  if (hasFixedHeight) {
    item.style.height = `${height}px`;
  } else {
    item.style.height = "";
  }

  const nextSize = { width, height, autoWidth: prefersAutoWidth };
  if (
    todo.size.width !== nextSize.width ||
    todo.size.height !== nextSize.height ||
    todo.size.autoWidth !== nextSize.autoWidth
  ) {
    todos = todos.map((entry) =>
      entry.id === todo.id ? { ...entry, size: nextSize } : entry
    );
    return true;
  }
  return false;
}

function ensureLayoutDefaults() {
  let mutated = false;
  todos = todos.map((todo, index) => {
    const position = todo.position ?? { x: 12, y: index * 90 };
    const size = {
      width:
        Number.isFinite(todo.size?.width) && todo.size.width > 0
          ? todo.size.width
          : DEFAULT_CARD_WIDTH,
      height:
        todo.size?.height === null || todo.size?.height === undefined
          ? null
          : Math.max(todo.size.height, 0),
      autoWidth: todo.size?.autoWidth ?? DEFAULT_AUTO_WIDTH,
    };
    const createdAt = todo.createdAt ?? new Date().toISOString();
    const comments = todo.comments ?? "";
    const showActions = todo.showActions ?? false;
    const deleted = todo.deleted ?? false;
    const deletedAt = todo.deletedAt ?? (deleted ? createdAt : null);
    const needsPositioning = todo.needsPositioning ?? false;
    if (!todo.position || !todo.size) {
      mutated = true;
    }
    if (
      !todo.createdAt ||
      todo.comments === undefined ||
      todo.showActions === undefined ||
      todo.deleted === undefined ||
      todo.deletedAt === undefined ||
      todo.needsPositioning === undefined ||
      todo.size.autoWidth === undefined
    ) {
      mutated = true;
    }
    return {
      ...todo,
      position,
      size,
      createdAt,
      comments,
      showActions,
      deleted,
      deletedAt,
      needsPositioning,
    };
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
  const visibleTodos = todos.filter((todo) => !todo.deleted);
  countAllEl.textContent = `${visibleTodos.length} total`;
  const active = visibleTodos.filter((todo) => !todo.completed).length;
  countActiveEl.textContent = `${active} active`;
}

function renderTodos() {
  listEl.innerHTML = "";
  const includeDeleted = filter === "deleted";
  listEl.classList.toggle("stacked-layout", includeDeleted);
  const filtered = todos
    .filter((todo) => (includeDeleted ? todo.deleted : !todo.deleted))
    .filter((todo) => {
      if (filter === "active") return !todo.completed;
      if (filter === "completed") return todo.completed;
      return true;
    });

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    const emptyMessages = {
      active: "No active tasks. Add something above!",
      completed: "No completed tasks yet.",
      deleted: "No deleted tasks.",
      all: "No tasks yet. Add something above!",
    };
    empty.textContent = emptyMessages[filter] ?? emptyMessages.all;
    listEl.appendChild(empty);
    listEl.style.height = includeDeleted ? "" : `${canvasMinHeight}px`;
    updateCounts();
    return;
  }

  let sizeAdjusted = false;

  filtered.forEach((todo) => {
    const item = document.createElement("li");
    item.className =
      "todo-item" +
      (todo.completed && !todo.deleted ? " completed" : "") +
      (todo.deleted ? " deleted" : "");
    if (todo.needsPositioning) {
      item.classList.add("is-new");
    }
    item.dataset.id = todo.id;
    if (includeDeleted) {
      item.style.left = "";
      item.style.top = "";
      item.style.width = "";
      item.style.height = "";
    } else {
      item.style.left = `${todo.position.x}px`;
      item.style.top = `${todo.position.y}px`;
      item.style.width = `${todo.size.width}px`;
      if (todo.size.height) {
        item.style.height = `${todo.size.height}px`;
      }
    }

    const shell = document.createElement("div");
    shell.className = "todo-shell";

    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent = todo.deleted ? "Deleted" : todo.completed ? "Done" : "";

    const title = document.createElement("span");
    title.className = "todo-title";
    title.textContent = todo.text;

    shell.appendChild(status);
    shell.appendChild(title);

    if (todo.deleted) {
      const metaRow = document.createElement("div");
      metaRow.className = "deleted-meta";
      const createdChip = document.createElement("span");
      createdChip.className = "meta-chip";
      createdChip.textContent = `Created ${formatDateTime(todo.createdAt)}`;
      const deletedChip = document.createElement("span");
      deletedChip.className = "meta-chip danger";
      deletedChip.textContent = todo.deletedAt
        ? `Deleted ${formatDateTime(todo.deletedAt)}`
        : "Deleted time unknown";
      metaRow.appendChild(createdChip);
      metaRow.appendChild(deletedChip);
      shell.appendChild(metaRow);
    }

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

      let updatedTodo = todo;
      todos = todos.map((entry) => {
        if (entry.id !== todo.id) return entry;
        updatedTodo = {
          ...entry,
          size: {
            ...entry.size,
            height: isOpen ? null : entry.size.height,
          },
        };
        return updatedTodo;
      });

      const sizeChanged = adjustItemSizeToContent(item, updatedTodo);
      if (sizeChanged) {
        saveTodos();
      }
      updateCanvasHeight();
    });

    if (todo.deleted) {
      editBtn.disabled = true;
      toggleBtn.disabled = true;
      detailsBtn.disabled = true;
    }

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
    const deletedMeta = document.createElement("div");
    if (todo.deleted) {
      deletedMeta.innerHTML = `<strong>Deleted:</strong> ${
        todo.deletedAt ? formatDateTime(todo.deletedAt) : "Unknown"
      }`;
    }
    const comments = document.createElement("div");
    const hasComment = todo.comments && todo.comments.trim().length > 0;
    comments.innerHTML = `<strong>Comments:</strong> ${
      hasComment ? todo.comments : "No comments"
    }`;
    details.appendChild(created);
    if (todo.deleted) {
      details.appendChild(deletedMeta);
    }
    details.appendChild(comments);

    const resizeHandle = document.createElement("span");
    resizeHandle.className = "resize-handle";
    resizeHandle.setAttribute("aria-label", "Resize task");

    item.appendChild(shell);
    item.appendChild(actions);
    item.appendChild(details);
    item.appendChild(resizeHandle);

    if (!includeDeleted) {
      sizeAdjusted = adjustItemSizeToContent(item, todo) || sizeAdjusted;
    }
    attachDrag(item, item, todo.id, {
      onTap: () => {
        if (todo.deleted) return;
        toggleActionsVisibility(todo.id);
      },
    });
    attachResize(resizeHandle, item, todo.id);
    listEl.appendChild(item);
  });

  if (sizeAdjusted) {
    saveTodos();
  }

  updateCounts();
  updateCanvasHeight();
}

function addTodo(text, comments = "") {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const cleanedComments = comments.trim();
  const id = crypto.randomUUID();
  todos.unshift({
    id,
    text: trimmed,
    completed: false,
    position: DEFAULT_POSITION,
    size: { width: DEFAULT_CARD_WIDTH, height: null, autoWidth: DEFAULT_AUTO_WIDTH },
    createdAt: new Date().toISOString(),
    comments: cleanedComments,
    showActions: false,
    deleted: false,
    needsPositioning: true,
  });
  saveTodos();
  renderTodos();
  return true;
}

function toggleActionsVisibility(id) {
  todos = todos.map((todo) =>
    todo.id === id && !todo.deleted
      ? { ...todo, showActions: !todo.showActions }
      : todo
  );
  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  todos = todos.map((todo) =>
    todo.id === id && !todo.deleted
      ? { ...todo, completed: !todo.completed }
      : todo
  );
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  let changed = false;
  todos = todos.flatMap((todo) => {
    if (todo.id !== id) return [todo];
    changed = true;
    if (todo.deleted) {
      return [];
    }
    return [
      {
        ...todo,
        deleted: true,
        deletedAt: new Date().toISOString(),
        showActions: false,
      },
    ];
  });
  if (!changed) return;
  saveTodos();
  renderTodos();
}

function editTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo || todo.deleted) return;
  const nextText = prompt("Edit task", todo.text);
  if (nextText === null) return;
  const trimmed = nextText.trim();
  if (!trimmed) return;
  todos = todos.map((t) => (t.id === id ? { ...t, text: trimmed } : t));
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

    const interactiveSelector =
      "button, .resize-handle, input, textarea, select, option, a";
    if (event.target.closest(interactiveSelector)) return;

    const todo = todos.find((t) => t.id === id);
    if (!todo || todo.deleted) return;
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
      if (
        !isDragging &&
        (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold)
      ) {
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
        if (todo.needsPositioning) {
          item.classList.remove("is-new");
        }
        todos = todos.map((todoItem) =>
          todoItem.id === id
            ? {
                ...todoItem,
                position: { x: left, y: top },
                needsPositioning: false,
              }
            : todoItem
        );
        saveTodos();
        updateCanvasHeight();
      }

      if (!isDragging) {
        callbacks.onTap?.();
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
    if (!todo || todo.deleted) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = item.offsetWidth;
    const startHeight = item.offsetHeight;
    const { minWidth: contentMinWidth, minHeight: contentMinHeight } =
      getContentMinSize(item);

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

      const nextWidth = Math.max(startWidth + deltaX, contentMinWidth);
      const nextHeight = Math.max(startHeight + deltaY, contentMinHeight);

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
            ? { ...todoItem, size: { width, height, autoWidth: false } }
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

  handle.addEventListener("dblclick", () => {
    const todo = todos.find((t) => t.id === id);
    if (!todo || todo.deleted) return;

    const { minWidth, minHeight } = getContentMinSize(item);
    const containerRect = listEl.getBoundingClientRect();
    const containerWidth = listEl.clientWidth || containerRect.width;
    const left = parseFloat(item.style.left) || 0;
    const availableWidth = Math.max(0, containerWidth - left - 8);
    const nextWidth = Math.max(minWidth, availableWidth);

    item.style.width = `${nextWidth}px`;
    item.style.height = `${minHeight}px`;

    todos = todos.map((todoItem) =>
      todoItem.id === id
        ? {
            ...todoItem,
            size: { width: nextWidth, height: minHeight, autoWidth: true },
          }
        : todoItem
    );

    saveTodos();
    updateCanvasHeight();
  });
}

function updateCanvasHeight() {
  if (listEl.classList.contains("stacked-layout")) {
    listEl.style.height = "";
    return;
  }
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
setFilter(filter);
