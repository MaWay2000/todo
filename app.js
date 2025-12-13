const STORAGE_KEY = "local-todo-items";
const DAILY_STORAGE_KEY = "local-daily-templates";
let todos = [];
let dailyTasks = [];
let filter = "active";

const listEl = document.getElementById("todo-list");
const formEl = document.getElementById("todo-form");
const inputEl = document.getElementById("todo-input");
const commentEl = document.getElementById("todo-comment");
const typeSelectEl = document.getElementById("todo-type");
const openAddEl = document.getElementById("open-add");
const cancelAddEl = document.getElementById("cancel-add");
const dialogEl = document.getElementById("add-dialog");
const editDialogEl = document.getElementById("edit-dialog");
const editFormEl = document.getElementById("edit-form");
const editInputEl = document.getElementById("edit-input");
const editCommentEl = document.getElementById("edit-comment");
const cancelEditEl = document.getElementById("cancel-edit");
const filterButtons = document.querySelectorAll(".filter-button");
const canvasMinHeight = 360;
const DEFAULT_CARD_WIDTH = 260;
const DEFAULT_AUTO_WIDTH = true;
const DEFAULT_POSITION = { x: 12, y: 12 };
const EMPTY_SIZE_STATES = { compact: null, expanded: null };
let activeEditId = null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const formatDateTime = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatDuration = (start, end) => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate - startDate;

  if (!Number.isFinite(diffMs) || diffMs < 0) return null;

  const units = [
    { label: "d", seconds: 86400 },
    { label: "h", seconds: 3600 },
    { label: "m", seconds: 60 },
    { label: "s", seconds: 1 },
  ];

  let remaining = Math.floor(diffMs / 1000);
  const parts = [];

  for (const unit of units) {
    const value = Math.floor(remaining / unit.seconds);
    if (value > 0 || parts.length > 0) {
      parts.push(`${value}${unit.label}`);
    }
    remaining -= value * unit.seconds;
    if (parts.length === 2) break;
  }

  return parts.length ? parts.join(" ") : "0s";
};

function makeActionButton(icon, label, handler, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `action-button ${extraClass}`.trim();
  button.textContent = icon;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", handler);
  return button;
}

const isToday = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

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
      entry.id === todo.id
        ? {
            ...entry,
            size: nextSize,
            sizeStates: {
              ...(entry.sizeStates ?? EMPTY_SIZE_STATES),
              [entry.showActions ? "expanded" : "compact"]: nextSize,
            },
          }
        : entry
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
    const completedAt = todo.completedAt ?? (todo.completed ? createdAt : null);
    const comments = todo.comments ?? "";
    const showActions = todo.showActions ?? false;
    const deleted = todo.deleted ?? false;
    const deletedAt = todo.deletedAt ?? (deleted ? createdAt : null);
    const needsPositioning = todo.needsPositioning ?? false;
    const sizeStates = todo.sizeStates ?? EMPTY_SIZE_STATES;
    if (!todo.position || !todo.size || !todo.sizeStates) {
      mutated = true;
    }
    if (
      !todo.createdAt ||
      todo.completedAt === undefined ||
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
      completedAt,
      comments,
      showActions,
      deleted,
      deletedAt,
      needsPositioning,
      sizeStates,
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

function loadDailyTasks() {
  try {
    const stored = localStorage.getItem(DAILY_STORAGE_KEY);
    dailyTasks = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load daily tasks", error);
    dailyTasks = [];
  }
}

function saveDailyTasks() {
  localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(dailyTasks));
}

function renderTodos() {
  listEl.innerHTML = "";
  const showingDeleted = filter === "deleted";
  const stackedLayout = showingDeleted || filter === "completed";
  const isCompletedView = filter === "completed";
  listEl.classList.toggle("stacked-layout", stackedLayout);
  const filtered = todos
    .filter((todo) => (showingDeleted ? todo.deleted : !todo.deleted))
    .filter((todo) => {
      if (filter === "active") return !todo.completed;
      if (filter === "completed") return todo.completed;
      if (filter === "daily") return isToday(todo.createdAt);
      return true;
    });

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    const emptyMessages = {
      active: "No active tasks. Add something above!",
      completed: "No completed tasks yet.",
      daily: "No tasks added today.",
      deleted: "No deleted tasks.",
      all: "No tasks yet. Add something above!",
    };
    empty.textContent = emptyMessages[filter] ?? emptyMessages.all;
    listEl.appendChild(empty);
    listEl.style.height = stackedLayout ? "" : `${canvasMinHeight}px`;
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
    if (stackedLayout) {
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

    if (todo.completed && !todo.deleted && isCompletedView) {
      const duration = document.createElement("span");
      const durationText = formatDuration(todo.createdAt, todo.completedAt);
      duration.className = "completion-duration";
      duration.textContent = durationText
        ? `· ${durationText}`
        : "· Duration unknown";
      shell.appendChild(duration);
    }

    if (todo.completed && !todo.deleted) {
      const metaRow = document.createElement("div");
      metaRow.className = "deleted-meta";

      const createdChip = document.createElement("span");
      createdChip.className = "meta-chip";
      createdChip.textContent = `Created ${formatDateTime(todo.createdAt)}`;

      const completedChip = document.createElement("span");
      completedChip.className = "meta-chip";
      completedChip.textContent = todo.completedAt
        ? `Ended ${formatDateTime(todo.completedAt)}`
        : "Ended time unknown";

      metaRow.appendChild(createdChip);
      metaRow.appendChild(completedChip);
      shell.appendChild(metaRow);
    }

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

    const editBtn = makeActionButton("✏️", "Edit", () => editTodo(todo.id));
    const deleteBtn = makeActionButton(
      todo.deleted ? "🗑️" : "❌",
      todo.deleted ? "Delete permanently" : "Delete",
      () => (todo.deleted ? purgeTodo(todo.id) : deleteTodo(todo.id)),
      todo.deleted ? "danger" : ""
    );
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
    const completedMeta = document.createElement("div");
    if (todo.completed && !todo.deleted) {
      completedMeta.innerHTML = `<strong>Completed:</strong> ${
        todo.completedAt ? formatDateTime(todo.completedAt) : "Unknown"
      }`;
    }
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
    if (todo.completed && !todo.deleted) {
      details.appendChild(completedMeta);
    }
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

    listEl.appendChild(item);

    if (!stackedLayout) {
      sizeAdjusted = adjustItemSizeToContent(item, todo) || sizeAdjusted;
    }
    attachDrag(item, item, todo.id, {
      onTap: () => {
        if (todo.deleted) return;
        toggleActionsVisibility(todo.id);
      },
    });
    attachResize(resizeHandle, item, todo.id);
  });

  if (sizeAdjusted) {
    saveTodos();
  }

  updateCanvasHeight();
}

function renderDailyTasks() {
  listEl.innerHTML = "";
  listEl.classList.add("stacked-layout");
  const sortedTasks = [...dailyTasks].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  );

  if (sortedTasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No daily tasks. Add one above!";
    listEl.appendChild(empty);
    listEl.style.height = `${canvasMinHeight}px`;
    return;
  }

  sortedTasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "todo-item daily-template";

    const shell = document.createElement("div");
    shell.className = "todo-shell";

    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent = "Daily";

    const title = document.createElement("span");
    title.className = "todo-title";
    title.textContent = task.text;

    shell.appendChild(status);
    shell.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "todo-details";
    const lastTrigger = task.lastTriggeredAt
      ? `Last triggered ${formatDateTime(task.lastTriggeredAt)}`
      : "Not triggered yet";
    const created = task.createdAt
      ? `Created ${formatDateTime(task.createdAt)}`
      : "Creation time unknown";
    const comments = task.comments?.trim()
      ? task.comments
      : "No comments";
    meta.innerHTML = `<div><strong>${lastTrigger}</strong></div><div>${created}</div><div><strong>Comments:</strong> ${comments}</div>`;

    const actions = document.createElement("div");
    actions.className = "action-row";
    const alreadyTriggered = task.lastTriggeredAt && isToday(task.lastTriggeredAt);
    const triggerBtn = makeActionButton(
      "✨",
      alreadyTriggered ? "Already created today" : "Create today's task",
      () => triggerDailyTask(task.id)
    );
    triggerBtn.disabled = alreadyTriggered;

    const deleteBtn = makeActionButton(
      "🗑️",
      "Delete daily task",
      () => deleteDailyTask(task.id),
      "danger"
    );

    actions.appendChild(triggerBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(shell);
    item.appendChild(actions);
    item.appendChild(meta);

    listEl.appendChild(item);
  });

  listEl.style.height = "";
}

function renderCurrentView() {
  if (filter === "daily") {
    renderDailyTasks();
    return;
  }
  renderTodos();
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
    completedAt: null,
    position: DEFAULT_POSITION,
    size: { width: DEFAULT_CARD_WIDTH, height: null, autoWidth: DEFAULT_AUTO_WIDTH },
    sizeStates: EMPTY_SIZE_STATES,
    createdAt: new Date().toISOString(),
    comments: cleanedComments,
    showActions: false,
    deleted: false,
    needsPositioning: true,
  });
  saveTodos();
  renderCurrentView();
  return true;
}

function addDailyTask(text, comments = "") {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const cleanedComments = comments.trim();
  dailyTasks.unshift({
    id: crypto.randomUUID(),
    text: trimmed,
    comments: cleanedComments,
    createdAt: new Date().toISOString(),
    lastTriggeredAt: null,
  });
  saveDailyTasks();
  renderCurrentView();
  return true;
}

function deleteDailyTask(id) {
  const originalLength = dailyTasks.length;
  dailyTasks = dailyTasks.filter((task) => task.id !== id);
  if (dailyTasks.length === originalLength) return;
  saveDailyTasks();
  renderCurrentView();
}

function triggerDailyTask(id) {
  const template = dailyTasks.find((task) => task.id === id);
  if (!template) return;
  if (template.lastTriggeredAt && isToday(template.lastTriggeredAt)) return;

  const created = addTodo(template.text, template.comments ?? "");
  if (!created) return;

  dailyTasks = dailyTasks.map((task) =>
    task.id === id ? { ...task, lastTriggeredAt: new Date().toISOString() } : task
  );
  saveDailyTasks();
  renderCurrentView();
}

function toggleActionsVisibility(id) {
  todos = todos.map((todo) => {
    if (todo.id !== id || todo.deleted) return todo;
    const sizeStates = todo.sizeStates ?? EMPTY_SIZE_STATES;
    const nextShowActions = !todo.showActions;

    if (nextShowActions) {
      return {
        ...todo,
        showActions: true,
        sizeStates: {
          ...sizeStates,
          compact: sizeStates.compact ?? todo.size,
          expanded: sizeStates.expanded ?? todo.size,
        },
        size: sizeStates.expanded ?? todo.size,
      };
    }

    const compactSize = sizeStates.compact ?? todo.size;
    return {
      ...todo,
      showActions: false,
      sizeStates: { ...sizeStates, expanded: todo.size },
      size: compactSize,
    };
  });
  saveTodos();
  renderCurrentView();
}

function toggleTodo(id) {
  todos = todos.map((todo) =>
    todo.id === id && !todo.deleted
      ? {
          ...todo,
          completed: !todo.completed,
          completedAt: todo.completed ? null : new Date().toISOString(),
          showActions: false,
        }
      : todo
  );
  saveTodos();
  renderCurrentView();
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
  renderCurrentView();
}

function purgeTodo(id) {
  const originalLength = todos.length;
  todos = todos.filter((todo) => todo.id !== id);
  if (todos.length === originalLength) return;
  saveTodos();
  renderCurrentView();
}

function editTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo || todo.deleted) return;
  activeEditId = id;
  editInputEl.value = todo.text;
  editCommentEl.value = todo.comments ?? "";
  editDialogEl.showModal();
  editInputEl.focus();
}

function setFilter(nextFilter) {
  filter = nextFilter;

  if (nextFilter === "completed") {
    let collapsed = false;
    todos = todos.map((todo) => {
      if (!todo.completed || todo.showActions === false) return todo;
      collapsed = true;
      return { ...todo, showActions: false };
    });
    if (collapsed) {
      saveTodos();
    }
  }

  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });
  renderCurrentView();
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
        todos = todos.map((todoItem) => {
          if (todoItem.id !== id) return todoItem;
          const size = { width, height, autoWidth: false };
          const sizeStates = todoItem.sizeStates ?? EMPTY_SIZE_STATES;
          const stateKey = todo.showActions ? "expanded" : "compact";
          return {
            ...todoItem,
            size,
            sizeStates: { ...sizeStates, [stateKey]: size },
          };
        });
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

    todos = todos.map((todoItem) => {
      if (todoItem.id !== id) return todoItem;
      const size = { width: nextWidth, height: minHeight, autoWidth: true };
      const sizeStates = todoItem.sizeStates ?? EMPTY_SIZE_STATES;
      const stateKey = todo.showActions ? "expanded" : "compact";
      return {
        ...todoItem,
        size,
        sizeStates: { ...sizeStates, [stateKey]: size },
      };
    });

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
  const taskType = typeSelectEl.value;
  const added =
    taskType === "daily"
      ? addDailyTask(inputEl.value, commentEl.value)
      : addTodo(inputEl.value, commentEl.value);
  if (added) {
    inputEl.value = "";
    commentEl.value = "";
    typeSelectEl.value = "one-time";
    dialogEl.close();
  }
});

openAddEl.addEventListener("click", () => {
  inputEl.value = "";
  commentEl.value = "";
  typeSelectEl.value = "one-time";
  dialogEl.showModal();
  inputEl.focus();
});

cancelAddEl.addEventListener("click", () => {
  dialogEl.close();
});

editFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = editInputEl.value.trim();
  const comments = editCommentEl.value.trim();

  if (!activeEditId || !text) return;

  let changed = false;
  todos = todos.map((todo) => {
    if (todo.id !== activeEditId || todo.deleted) return todo;
    if (todo.text !== text || (todo.comments ?? "") !== comments) {
      changed = true;
      return { ...todo, text, comments };
    }
    return todo;
  });

  activeEditId = null;
  editDialogEl.close();

  if (changed) {
    saveTodos();
    renderCurrentView();
  }
});

cancelEditEl.addEventListener("click", () => {
  activeEditId = null;
  editDialogEl.close();
});

editDialogEl.addEventListener("close", () => {
  activeEditId = null;
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

loadDailyTasks();
loadTodos();
ensureLayoutDefaults();
setFilter(filter);
