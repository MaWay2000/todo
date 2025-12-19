const STORAGE_KEY = "local-todo-items";
const DAILY_STORAGE_KEY = "local-daily-templates";
const CATEGORY_STORAGE_KEY = "local-categories";
let todos = [];
let dailyTasks = [];
let categories = [];
let filter = "active";

const listEl = document.getElementById("todo-list");
const formEl = document.getElementById("todo-form");
const inputEl = document.getElementById("todo-input");
const commentEl = document.getElementById("todo-comment");
const startEl = document.getElementById("todo-start");
const endEl = document.getElementById("todo-end");
const startOffsetDaysEl = document.getElementById("todo-start-offset-days");
const startOffsetHoursEl = document.getElementById("todo-start-offset-hours");
const startOffsetMinsEl = document.getElementById("todo-start-offset-mins");
const endDaysEl = document.getElementById("todo-end-days");
const endHoursEl = document.getElementById("todo-end-hours");
const endMinsEl = document.getElementById("todo-end-mins");

if (endEl) {
  endEl.dataset.synced = "true";
}
const colorEl = document.getElementById("todo-color");
const colorTriggerEl = document.querySelector("[data-color-trigger='todo-color']");
const colorToggleEl = document.getElementById("todo-color-toggle");
const categoryEl = document.getElementById("todo-category");
const typeSelectEl = document.getElementById("todo-type");
const dailyOptionsEl = document.getElementById("daily-options");
const dailyWeekdayInputs = document.querySelectorAll(
  "input[name='daily-weekday']"
);
const dailyIntervalToggleEl = document.getElementById("daily-interval-enabled");
const dailyIntervalDaysEl = document.getElementById("daily-interval-days");
const openAddEl = document.getElementById("open-add");
const cancelAddEl = document.getElementById("cancel-add");
const dialogEl = document.getElementById("add-dialog");
const addDialogTitleEl = dialogEl?.querySelector(".modal-title");
const editDialogEl = document.getElementById("edit-dialog");
const editFormEl = document.getElementById("edit-form");
const editInputEl = document.getElementById("edit-input");
const editCommentEl = document.getElementById("edit-comment");
const editStartEl = document.getElementById("edit-start");
const editEndEl = document.getElementById("edit-end");
const editColorEl = document.getElementById("edit-color");
const editColorTriggerEl = document.querySelector(
  "[data-color-trigger='edit-color']"
);
const editColorToggleEl = document.getElementById("edit-color-toggle");
const editCategoryEl = document.getElementById("edit-category");
const cancelEditEl = document.getElementById("cancel-edit");
const dailyEditDialogEl = document.getElementById("daily-edit-dialog");
const dailyEditFormEl = document.getElementById("daily-edit-form");
const dailyEditInputEl = document.getElementById("daily-edit-input");
const dailyEditCommentEl = document.getElementById("daily-edit-comment");
const dailyEditStartEl = document.getElementById("daily-edit-start");
const dailyEditEndDaysEl = document.getElementById("daily-edit-end-days");
const dailyEditEndHoursEl = document.getElementById("daily-edit-end-hours");
const dailyEditEndMinsEl = document.getElementById("daily-edit-end-mins");
const dailyEditColorEl = document.getElementById("daily-edit-color");
const dailyEditColorTriggerEl = document.querySelector(
  "[data-color-trigger='daily-edit-color']"
);
const dailyEditColorToggleEl = document.getElementById("daily-edit-color-toggle");
const dailyEditCategoryEl = document.getElementById("daily-edit-category");
const dailyEditWeekdayInputs = document.querySelectorAll(
  "input[name='daily-edit-weekday']"
);
const dailyEditIntervalToggleEl = document.getElementById("daily-edit-interval-enabled");
const dailyEditIntervalDaysEl = document.getElementById("daily-edit-interval-days");
const cancelDailyEditEl = document.getElementById("cancel-daily-edit");
const filterButtons = document.querySelectorAll(".filter-button");
const categoryPanelEl = document.getElementById("category-panel");
const categoryFormEl = document.getElementById("category-form");
const categoryNameEl = document.getElementById("category-name");
const categoryColorEl = document.getElementById("category-color");
const categoryListEl = document.getElementById("category-list");
const canvasMinHeight = 360;
const DEFAULT_CARD_WIDTH = 260;
const DEFAULT_AUTO_WIDTH = true;
const DEFAULT_POSITION = { x: 12, y: 12 };
const DEFAULT_COLOR = "#38bdf8";
const CATEGORY_COLOR_PALETTE = [
  "#f59e0b",
  "#38bdf8",
  "#a855f7",
  "#22c55e",
  "#f97316",
  "#f472b6",
  "#14b8a6",
  "#fb7185",
];
const DEFAULT_CATEGORY_COLOR = CATEGORY_COLOR_PALETTE[0];
const DEFAULT_TASK_PLACEHOLDER = "Task name";
const EMPTY_SIZE_STATES = { compact: null, expanded: null };
const TIME_REFRESH_INTERVAL = 30000;
const DURATION_INPUT_MAX_LENGTH = 5;
const DRAG_PERSIST_INTERVAL = 200;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const UNCATEGORIZED_LABEL = "Uncategorized";
let activeEditId = null;
let activeDailyEditId = null;
let activeCategoryEditId = null;
let timeRefreshHandle = null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const formatDateTime = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: "short",
  }).format(date);
};

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

const getTimeLeftInfo = (end, referenceDate = null) => {
  if (!end) return null;
  const endDate = new Date(end);
  if (!Number.isFinite(endDate.getTime())) return null;

  const reference = referenceDate ? new Date(referenceDate) : new Date();
  const effectiveReference = Number.isFinite(reference.getTime())
    ? reference
    : new Date();

  const diffMs = endDate - effectiveReference;
  const isPast = diffMs < 0;
  const remainingSeconds = Math.abs(Math.floor(diffMs / 1000));
  const units = [
    { label: "d", seconds: 86400 },
    { label: "h", seconds: 3600 },
    { label: "m", seconds: 60 },
  ];

  let remaining = remainingSeconds;
  const parts = [];
  for (const unit of units) {
    const value = Math.floor(remaining / unit.seconds);
    if (value > 0 || parts.length > 0) {
      parts.push(`${value}${unit.label}`);
    }
    remaining -= value * unit.seconds;
    if (parts.length === 2) break;
  }

  if (!parts.length) return { text: isPast ? "Overdue" : "Due soon", isPast };
  return {
    text: isPast ? `${parts.join(" ")} overdue` : `${parts.join(" ")} left`,
    isPast,
  };
};

function parseDateInput(value) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function pickPaletteColor(seed = 0) {
  return CATEGORY_COLOR_PALETTE[Math.abs(seed) % CATEGORY_COLOR_PALETTE.length];
}

function pickCategoryColor(name, seed = 0) {
  if (!name) return pickPaletteColor(seed);
  const normalized = name.trim().toLowerCase();
  let hash = 0;
  for (const char of normalized) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return pickPaletteColor(hash + seed);
}

function normalizeCategories(list = []) {
  let mutated = false;
  const normalized = list.map((category, index) => {
    const name = category.name?.trim() ?? "";
    const color = category.color?.trim() || pickCategoryColor(name, index);
    const createdAt = category.createdAt ?? new Date().toISOString();
    if (name !== category.name || category.color !== color || category.createdAt !== createdAt) {
      mutated = true;
    }
    return {
      ...category,
      name,
      color,
      createdAt,
    };
  });

  return { normalized, mutated };
}

function getCategoryColor(name) {
  const normalized = name?.trim().toLowerCase();
  if (!normalized) return null;
  const match = categories.find(
    (category) => category.name.trim().toLowerCase() === normalized
  );
  return match?.color ?? null;
}

function setColorEnabled(toggle, input) {
  if (!input) return;
  const enabled = toggle?.checked ?? true;
  input.disabled = !enabled;
  const row = input.closest(".color-input-row");
  row?.classList.toggle("is-disabled", !enabled);
}

function syncColorToggleSwatch(toggle, input) {
  if (!toggle) return;
  const color = input?.value?.trim() || DEFAULT_COLOR;
  toggle.style.setProperty("--color-swatch", color);
}

function updateColorTriggerLabel(trigger, name, fallback = DEFAULT_TASK_PLACEHOLDER) {
  if (!trigger) return;
  const label = name?.trim();
  trigger.textContent = label || fallback;
}

function openColorPicker(input) {
  if (!input) return;
  if (typeof input.showPicker === "function") {
    input.showPicker();
  } else {
    input.click();
  }
}

function attachColorPickerTrigger(trigger, input, toggle) {
  if (!trigger || !input) return;

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    if (toggle && !toggle.checked) {
      toggle.checked = true;
      setColorEnabled(toggle, input);
    }
    openColorPicker(input);
  });
}

function formatDateForInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function normalizeDurationParts(daysValue, hoursValue, minsValue) {
  let days = Number.parseInt(daysValue, 10) || 0;
  let hours = Number.parseInt(hoursValue, 10) || 0;
  let mins = Number.parseInt(minsValue, 10) || 0;

  if (days < 0 || hours < 0 || mins < 0) return null;

  const extraHoursFromMins = Math.floor(mins / 60);
  mins = mins % 60;
  hours += extraHoursFromMins;

  const extraDaysFromHours = Math.floor(hours / 24);
  hours = hours % 24;
  days += extraDaysFromHours;

  if (days === 0 && hours === 0 && mins === 0) return null;

  return { days, hours, mins };
}

const parseDurationParts = normalizeDurationParts;
const parseOffsetParts = normalizeDurationParts;

function computeStartFromOffset(daysValue, hoursValue, minsValue) {
  const duration = parseOffsetParts(daysValue, hoursValue, minsValue);
  if (!duration) return null;

  const totalMs =
    duration.days * 86400000 + duration.hours * 3600000 + duration.mins * 60000;

  return new Date(Date.now() + totalMs).toISOString();
}

function computeEndFromDuration(start, daysValue, hoursValue, minsValue) {
  if (!start) return null;
  const duration = parseDurationParts(daysValue, hoursValue, minsValue);
  if (!duration) return null;

  const startDate = new Date(start);
  if (!Number.isFinite(startDate.getTime())) return null;

  const totalMs =
    duration.days * 86400000 + duration.hours * 3600000 + duration.mins * 60000;

  return new Date(startDate.getTime() + totalMs).toISOString();
}

function updateStartFromOffsetPreview() {
  const offsetStart = computeStartFromOffset(
    startOffsetDaysEl.value,
    startOffsetHoursEl.value,
    startOffsetMinsEl.value
  );

  if (offsetStart) {
    startEl.value = formatDateForInput(offsetStart);
  } else if (!startEl.value) {
    startEl.value = formatDateForInput(new Date().toISOString());
  }

  syncEndTimeWithStart();
}

function syncEndTimeWithStart() {
  if (!startEl || !endEl) return;

  const startValue = parseDateInput(startEl.value);
  if (!startValue) return;

  const derivedEnd = computeEndFromDuration(
    startValue,
    endDaysEl.value,
    endHoursEl.value,
    endMinsEl.value
  );

  if (derivedEnd) {
    endEl.value = formatDateForInput(derivedEnd);
    endEl.dataset.synced = "true";
    return;
  }

  if (endEl.dataset.synced === "true") {
    endEl.value = formatDateForInput(startValue);
  }
}

function deriveDurationFromRange(start, end) {
  if (!start || !end) return null;

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
    return null;
  }

  const diffMs = endDate - startDate;
  if (diffMs <= 0) return null;

  let remainingSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(remainingSeconds / 86400);
  remainingSeconds -= days * 86400;
  const hours = Math.floor(remainingSeconds / 3600);
  remainingSeconds -= hours * 3600;
  const mins = Math.floor(remainingSeconds / 60);

  return { days, hours, mins };
}

function parseSelectedWeekdays(inputs) {
  return Array.from(inputs)
    .filter((input) => input.checked)
    .map((input) => Number.parseInt(input.value, 10))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
}

function setSelectedWeekdays(inputs, values = []) {
  const set = new Set(values ?? []);
  inputs.forEach((input) => {
    input.checked = set.has(Number.parseInt(input.value, 10));
  });
}

function parseIntervalValue(toggle, input) {
  const enabled = toggle?.checked ?? true;
  if (!enabled) return null;
  const parsed = Number.parseInt(input?.value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function setIntervalEnabled(toggle, input, enabled) {
  if (toggle) toggle.checked = enabled;
  if (input) {
    input.disabled = !enabled;
    if (enabled && (!input.value || Number.parseInt(input.value, 10) <= 0)) {
      input.value = "1";
    }
  }
}

function syncIntervalWithWeekdays(weekdays, toggle, input) {
  const anySelected = Array.from(weekdays).some((inputEl) => inputEl.checked);
  if (anySelected) {
    setIntervalEnabled(toggle, input, false);
  } else if (toggle && !toggle.disabled && toggle.dataset.userDisabled !== "true") {
    setIntervalEnabled(toggle, input, true);
  }
}

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

function updateDailyOptionsVisibility() {
  updateAddDialogTitle();
  const isDailyTask = typeSelectEl.value === "daily";
  dailyOptionsEl.hidden = !isDailyTask;
  if (isDailyTask) {
    setIntervalEnabled(dailyIntervalToggleEl, dailyIntervalDaysEl, true);
    if (!dailyIntervalDaysEl.value) {
      dailyIntervalDaysEl.value = "1";
    }
    handleDailyWeekdayChange();
  }
}

function updateAddDialogTitle() {
  if (!addDialogTitleEl) return;
  const isDailyTask = typeSelectEl.value === "daily";
  addDialogTitleEl.textContent = isDailyTask ? "New daily task" : "New task";
}

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
    const startTime = todo.startTime ?? null;
    const endTime = todo.endTime ?? null;
    const comments = todo.comments ?? "";
    const category = todo.category ?? "";
    const color = todo.color ?? null;
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
      todo.startTime === undefined ||
      todo.endTime === undefined ||
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
      startTime,
      endTime,
      comments,
      color,
      category,
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

function loadCategories() {
  try {
    const stored = localStorage.getItem(CATEGORY_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    const { normalized, mutated } = normalizeCategories(parsed);
    categories = normalized;
    if (mutated) {
      saveCategories();
    }
  } catch (error) {
    console.error("Failed to load categories", error);
    categories = [];
  }
}

function saveCategories() {
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
}

function sortCategories(list) {
  return [...list].sort((first, second) =>
    first.name.localeCompare(second.name, undefined, { sensitivity: "base" })
  );
}

function isDuplicateCategoryName(name, ignoreId = null) {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return false;
  return categories.some(
    (category) =>
      category.id !== ignoreId && category.name.trim().toLowerCase() === normalized
  );
}

function createCategory(name, color = null) {
  const resolvedColor = color?.trim() || pickCategoryColor(name, categories.length);
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    color: resolvedColor,
    createdAt: new Date().toISOString(),
  };
}

function syncCategoriesFromTodos() {
  const known = new Set(
    categories.map((category) => category.name.trim().toLowerCase()).filter(Boolean)
  );
  const discovered = [];
  [...todos, ...dailyTasks].forEach((entry) => {
    const category = entry.category?.trim();
    if (!category) return;
    const normalized = category.toLowerCase();
    if (!known.has(normalized)) {
      known.add(normalized);
      discovered.push(createCategory(category));
    }
  });

  if (discovered.length > 0) {
    categories = [...categories, ...sortCategories(discovered)];
    saveCategories();
    renderCategoryOptions();
  }
}

function renderCategoryOptions() {
  const selects = [categoryEl, editCategoryEl, dailyEditCategoryEl];
  const sorted = sortCategories(categories);

  selects.forEach((select) => {
    if (!select) return;
    const previousValue = select.value ?? "";
    const normalizedPrevious = previousValue.trim().toLowerCase();
    select.innerHTML = "";

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "No category";
    select.appendChild(emptyOption);

    sorted.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.name;
      option.textContent = category.name;
      select.appendChild(option);
    });

    const hasExistingMatch = sorted.some(
      (category) => category.name.trim().toLowerCase() === normalizedPrevious
    );

    if (previousValue && !hasExistingMatch) {
      const missingOption = document.createElement("option");
      missingOption.value = previousValue;
      missingOption.textContent = `${previousValue} (missing category)`;
      select.appendChild(missingOption);
    }

    select.value = previousValue;
  });
}

function hasTaskStarted(task, referenceDate = new Date()) {
  if (!task.startTime) return true;
  const start = new Date(task.startTime);
  const reference = new Date(referenceDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(reference.getTime())) {
    return true;
  }
  return reference >= start;
}

function renderTodos() {
  listEl.innerHTML = "";
  const showingDeleted = filter === "deleted";
  const isCategoryView = filter === "categories";
  const stackedLayout =
    showingDeleted || filter === "completed" || filter === "all" || isCategoryView;
  const isCompletedView = filter === "completed";
  listEl.classList.toggle("stacked-layout", stackedLayout);
  const filtered = todos
    .filter((todo) => (showingDeleted ? todo.deleted : !todo.deleted))
    .filter((todo) => {
      if (filter === "active") return !todo.completed && hasTaskStarted(todo);
      if (filter === "completed") return todo.completed;
      if (filter === "daily") return isToday(todo.createdAt);
      if (filter === "categories") return true;
      return true;
    });

  if (isCompletedView) {
    filtered.sort((first, second) => {
      const firstEnd = first.completedAt ?? first.endTime;
      const secondEnd = second.completedAt ?? second.endTime;

      const firstTime = (() => {
        const value = firstEnd ? new Date(firstEnd).getTime() : NaN;
        return Number.isFinite(value) ? value : -Infinity;
      })();

      const secondTime = (() => {
        const value = secondEnd ? new Date(secondEnd).getTime() : NaN;
        return Number.isFinite(value) ? value : -Infinity;
      })();

      return secondTime - firstTime;
    });
  }

  if (filter === "all") {
    filtered.sort((first, second) =>
      (second.createdAt ?? "").localeCompare(first.createdAt ?? "")
    );
  }

  if (isCategoryView) {
    filtered.sort((first, second) => {
      const firstCategory = (first.category?.trim() || UNCATEGORIZED_LABEL).toLowerCase();
      const secondCategory = (second.category?.trim() || UNCATEGORIZED_LABEL).toLowerCase();
      if (firstCategory === secondCategory) {
        return (second.createdAt ?? "").localeCompare(first.createdAt ?? "");
      }
      return firstCategory.localeCompare(secondCategory);
    });
  }

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    const emptyMessages = {
      active: "No active tasks. Add something above!",
      completed: "No completed tasks yet.",
      daily: "No tasks added today.",
      categories: "No categorized tasks yet.",
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
    item.classList.toggle("has-color", Boolean(todo.color));
    if (todo.color) {
      item.style.setProperty("--task-color", todo.color);
    } else {
      item.style.removeProperty("--task-color");
    }
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

    if (todo.color) {
      const colorDot = document.createElement("span");
      colorDot.className = "color-dot";
      colorDot.style.backgroundColor = todo.color;
      colorDot.title = `Task color ${todo.color}`;
      shell.appendChild(colorDot);
    }

    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent = todo.deleted ? "Deleted" : todo.completed ? "Done" : "";

    const categoryName = todo.category?.trim() || "";
    const categoryColor = getCategoryColor(categoryName);
    const categoryBadge = document.createElement("span");
    categoryBadge.className = "category-pill";
    categoryBadge.dataset.empty = categoryName ? "false" : "true";
    categoryBadge.textContent = categoryName || UNCATEGORIZED_LABEL;
    if (categoryColor) {
      categoryBadge.classList.add("has-color");
      categoryBadge.style.setProperty("--category-color", categoryColor);
      const categoryColorDot = document.createElement("span");
      categoryColorDot.className = "category-color-dot";
      categoryColorDot.style.setProperty("--category-color", categoryColor);
      categoryBadge.prepend(categoryColorDot);
    }

    const title = document.createElement("span");
    title.className = "todo-title";
    title.textContent = todo.text;

    shell.appendChild(status);
    shell.appendChild(title);
    if (categoryName || isCategoryView) {
      shell.appendChild(categoryBadge);
    }

    const hasSchedule = Boolean(todo.endTime);
    if (hasSchedule) {
      const schedule = document.createElement("div");
      schedule.className = "time-meta";

      if (todo.endTime) {
        const timeLeftReference =
          todo.completed && todo.completedAt ? todo.completedAt : null;
        const timeLeftInfo = getTimeLeftInfo(todo.endTime, timeLeftReference);
        if (timeLeftInfo) {
          const timeLeftChip = document.createElement("span");
          timeLeftChip.className = "meta-chip accent";
          timeLeftChip.textContent = timeLeftInfo.text;
          if (timeLeftInfo.isPast) {
            timeLeftChip.classList.add("danger");
          }
          schedule.appendChild(timeLeftChip);
        }
      }

      if (schedule.childElementCount > 0) {
        shell.appendChild(schedule);
      }
    }

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
    const colorMeta = document.createElement("div");
    if (todo.color) {
      colorMeta.innerHTML = `<strong>Color:</strong> <span style="display: inline-flex; align-items: center; gap: 0.35rem;"><span class="color-dot" aria-hidden="true" style="background-color: ${todo.color}; box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2);"></span> ${todo.color}</span>`;
    } else {
      colorMeta.innerHTML = `<strong>Color:</strong> None`;
    }
    const startMeta = document.createElement("div");
    if (todo.startTime && todo.endTime) {
      startMeta.innerHTML = `<strong>Start:</strong> ${formatDateTime(
        todo.startTime
      )}`;
    }
    const categoryMeta = document.createElement("div");
    categoryMeta.innerHTML = `<strong>Category:</strong> ${
      categoryName || UNCATEGORIZED_LABEL
    }`;
    const timeLeftMeta = document.createElement("div");
    const timeLeftReference =
      todo.completed && todo.completedAt ? todo.completedAt : null;
    const timeLeftInfo = getTimeLeftInfo(todo.endTime, timeLeftReference);
    if (timeLeftInfo) {
      timeLeftMeta.innerHTML = `<strong>Time left:</strong> ${timeLeftInfo.text}`;
      if (timeLeftInfo.isPast) {
        timeLeftMeta.classList.add("overdue-text");
      }
    } else {
      timeLeftMeta.innerHTML = `<strong>Finish time:</strong> 00 days 00 hours 00 mins`;
    }
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
    details.appendChild(colorMeta);
    details.appendChild(categoryMeta);
    if (todo.startTime) {
      details.appendChild(startMeta);
    }
    if (timeLeftInfo || !todo.endTime) {
      details.appendChild(timeLeftMeta);
    }
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

function toggleDailyDetails(id, item, button) {
  dailyTasks = dailyTasks.map((task) => {
    if (task.id !== id) return task;
    const nextShowDetails = !task.showDetails;
    if (nextShowDetails) {
      item.classList.add("details-open");
      button.textContent = "▣";
      button.setAttribute("aria-label", "Hide info");
    } else {
      item.classList.remove("details-open");
      button.textContent = "▢";
      button.setAttribute("aria-label", "Expand info");
    }
    return { ...task, showDetails: nextShowDetails };
  });
  saveDailyTasks();
}

function editDailyTask(id) {
  const task = dailyTasks.find((entry) => entry.id === id);
  if (!task) return;

  activeDailyEditId = id;
  dailyEditInputEl.value = task.text ?? "";
  dailyEditCommentEl.value = task.comments ?? "";
  dailyEditStartEl.value = formatDateForInput(task.startTime);
  const duration = deriveDurationFromRange(task.startTime, task.endTime);
  dailyEditEndDaysEl.value = duration?.days ?? "";
  dailyEditEndHoursEl.value = duration?.hours ?? "";
  dailyEditEndMinsEl.value = duration?.mins ?? "";
  dailyEditColorEl.value = task.color ?? DEFAULT_COLOR;
  syncColorToggleSwatch(dailyEditColorToggleEl, dailyEditColorEl);
  if (dailyEditColorToggleEl) {
    dailyEditColorToggleEl.checked = Boolean(task.color);
    setColorEnabled(dailyEditColorToggleEl, dailyEditColorEl);
  }
  if (dailyEditCategoryEl) {
    dailyEditCategoryEl.value = task.category ?? "";
  }
  setSelectedWeekdays(dailyEditWeekdayInputs, task.triggerDays ?? []);
  const hasInterval = Number.isFinite(task.intervalDays) && task.intervalDays > 0;
  setIntervalEnabled(dailyEditIntervalToggleEl, dailyEditIntervalDaysEl, hasInterval);
  dailyEditIntervalToggleEl.dataset.userDisabled = hasInterval ? "false" : "true";
  dailyEditIntervalDaysEl.value = hasInterval ? task.intervalDays : "1";
  handleDailyEditWeekdayChange();
  dailyEditColorEl.dataset.touched = "false";
  updateColorTriggerLabel(dailyEditColorTriggerEl, task.text);
  dailyEditDialogEl.showModal();
  dailyEditInputEl.focus();
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
    item.className = "todo-item daily-template actions-visible";
    if (task.color) {
      item.classList.add("has-color");
      item.style.setProperty("--task-color", task.color);
    }

    const shell = document.createElement("div");
    shell.className = "todo-shell";

    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent = "Daily";

    const title = document.createElement("span");
    title.className = "todo-title";
    title.textContent = task.text;

    if (task.color) {
      const colorDot = document.createElement("span");
      colorDot.className = "color-dot";
      colorDot.style.backgroundColor = task.color;
      colorDot.title = `Task color ${task.color}`;
      shell.appendChild(colorDot);
    }

    shell.appendChild(status);
    shell.appendChild(title);

    const startLabel = formatTime(task.startTime);
    const endLabel = formatTime(task.endTime);
    const hasStartTime = Boolean(startLabel);
    const hasEndTime = Boolean(endLabel);
    if (hasStartTime || hasEndTime) {
      const timeChip = document.createElement("span");
      timeChip.className = "time-range-chip";
      const formattedStart = hasStartTime ? startLabel : "—";
      const formattedEnd = hasEndTime ? endLabel : "—";
      timeChip.textContent = `${formattedStart} - ${formattedEnd}`;
      shell.appendChild(timeChip);
    }

    const meta = document.createElement("div");
    meta.className = "todo-details";
    const lastTrigger = task.lastTriggeredAt
      ? `Last triggered ${formatDateTime(task.lastTriggeredAt)}`
      : "Not triggered yet";
    const created = task.createdAt
      ? `Created ${formatDateTime(task.createdAt)}`
      : "Creation time unknown";
    const categoryName = task.category?.trim() || UNCATEGORIZED_LABEL;
    const scheduleParts = [];
    if (task.startTime) {
      scheduleParts.push(`<div><strong>Start:</strong> ${formatDateTime(task.startTime)}</div>`);
    }
    if (task.endTime) {
      const duration = task.startTime
        ? formatDuration(task.startTime, task.endTime)
        : null;
      const endMeta = duration
        ? `${formatDateTime(task.endTime)} (${duration})`
        : formatDateTime(task.endTime);
      scheduleParts.push(`<div><strong>End:</strong> ${endMeta}</div>`);
    }
    scheduleParts.push(`<div><strong>Schedule:</strong> ${describeDailySchedule(task)}</div>`);
    const comments = task.comments?.trim()
      ? task.comments
      : "No comments";
    const colorMeta = task.color
      ? [
          '<div><strong>Color:</strong> <span style="display: inline-flex; align-items: center; gap: 0.35rem;">',
          `<span class="color-dot" aria-hidden="true" style="background-color: ${task.color}; box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2);"></span> ${task.color}`,
          "</span></div>",
        ].join("")
      : `<div><strong>Color:</strong> None</div>`;
    meta.innerHTML = [
      `<div><strong>${lastTrigger}</strong></div>`,
      `<div>${created}</div>`,
      `<div><strong>Category:</strong> ${categoryName}</div>`,
      ...scheduleParts,
      colorMeta,
      `<div><strong>Comments:</strong> ${comments}</div>`,
    ].join("");

    const actions = document.createElement("div");
    actions.className = "action-row";
    const alreadyTriggered = task.lastTriggeredAt && isToday(task.lastTriggeredAt);
    const canTrigger = canTriggerDailyTaskToday(task);
    const triggerBtn = makeActionButton(
      "➕",
      alreadyTriggered
        ? "Already created today"
        : canTrigger
          ? "Create today's task"
          : "Not scheduled today",
      () => triggerDailyTask(task.id)
    );
    triggerBtn.disabled = alreadyTriggered || !canTrigger;

    const infoBtn = makeActionButton(
      task.showDetails ? "▣" : "▢",
      task.showDetails ? "Hide info" : "Expand info",
      () => toggleDailyDetails(task.id, item, infoBtn)
    );

    const editBtn = makeActionButton("✏️", "Edit daily task", () => editDailyTask(task.id));

    const deleteBtn = makeActionButton(
      "🗑️",
      "Delete daily task",
      () => deleteDailyTask(task.id),
      "danger"
    );

    if (task.showDetails) {
      item.classList.add("details-open");
    }

    actions.appendChild(triggerBtn);
    actions.appendChild(infoBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(shell);
    item.appendChild(actions);
    item.appendChild(meta);

    listEl.appendChild(item);
  });

  listEl.style.height = "";
}

function getCategoryUsageCount(name) {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return 0;
  return todos.filter((todo) => {
    if (todo.deleted) return false;
    const todoCategory = todo.category?.trim().toLowerCase();
    return todoCategory === normalized;
  }).length;
}

function startCategoryEdit(id) {
  activeCategoryEditId = id;
  renderCategories();
}

function cancelCategoryEdit() {
  activeCategoryEditId = null;
  renderCategories();
}

function updateCategory(id, nextName, nextColor) {
  const trimmed = nextName.trim();
  const target = categories.find((category) => category.id === id);
  if (!target || !trimmed || isDuplicateCategoryName(trimmed, id)) return;

  const previousName = target.name.trim();
  const previousNormalized = previousName.toLowerCase();
  const nextNormalized = trimmed.toLowerCase();
  const color = nextColor?.trim() || pickCategoryColor(trimmed);

  categories = categories.map((category) =>
    category.id === id ? { ...category, name: trimmed, color } : category
  );

  if (previousNormalized !== nextNormalized) {
    const rename = (value) => {
      const normalized = value?.trim().toLowerCase();
      return normalized === previousNormalized ? trimmed : value;
    };

    todos = todos.map((todo) => ({ ...todo, category: rename(todo.category ?? "") }));
    dailyTasks = dailyTasks.map((task) => ({
      ...task,
      category: rename(task.category ?? ""),
    }));
    saveTodos();
    saveDailyTasks();
  }

  saveCategories();
  renderCategoryOptions();
  activeCategoryEditId = null;
  renderCurrentView();
}

function removeCategory(id) {
  const target = categories.find((category) => category.id === id);
  if (!target) return;

  const normalized = target.name.trim().toLowerCase();
  categories = categories.filter((category) => category.id !== id);

  todos = todos.map((todo) => {
    const todoNormalized = todo.category?.trim().toLowerCase();
    if (todoNormalized === normalized) {
      return { ...todo, category: "" };
    }
    return todo;
  });

  dailyTasks = dailyTasks.map((task) => {
    const taskNormalized = task.category?.trim().toLowerCase();
    if (taskNormalized === normalized) {
      return { ...task, category: "" };
    }
    return task;
  });

  saveCategories();
  saveTodos();
  saveDailyTasks();
  renderCategoryOptions();
  activeCategoryEditId = null;
  renderCurrentView();
}

function renderCategories() {
  if (!categoryPanelEl) return;
  const isCategoryView = filter === "categories";
  if (!isCategoryView) return;

  categoryPanelEl.hidden = false;
  listEl.hidden = true;
  categoryListEl.innerHTML = "";
  const sorted = sortCategories(categories);

  if (sorted.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No categories yet. Add one above!";
    categoryListEl.appendChild(empty);
    return;
  }

  sorted.forEach((category) => {
    const item = document.createElement("li");
    item.className = "category-item";

    if (category.id === activeCategoryEditId) {
      const form = document.createElement("form");
      form.className = "category-inline-form";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const nextNameInput = form.elements.namedItem("next-name");
        const nextColorInput = form.elements.namedItem("next-color");
        const nextName = nextNameInput.value.trim();
        const nextColor = nextColorInput?.value?.trim() || pickCategoryColor(nextName);
        if (!nextName) {
          nextNameInput.reportValidity();
          return;
        }
        if (isDuplicateCategoryName(nextName, category.id)) {
          nextNameInput.setCustomValidity("Category already exists.");
          nextNameInput.reportValidity();
          return;
        }
        nextNameInput.setCustomValidity("");
        updateCategory(category.id, nextName, nextColor);
      });

      const label = document.createElement("label");
      label.className = "sr-only";
      label.setAttribute("for", `category-edit-${category.id}`);
      label.textContent = "Category name";

      const input = document.createElement("input");
      input.id = `category-edit-${category.id}`;
      input.name = "next-name";
      input.value = category.name;
      input.required = true;
      input.addEventListener("input", () => input.setCustomValidity(""));

      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.name = "next-color";
      colorInput.className = "category-inline-color";
      colorInput.value = category.color ?? pickCategoryColor(category.name);

      const actions = document.createElement("div");
      actions.className = "category-inline-actions";

      const saveBtn = document.createElement("button");
      saveBtn.type = "submit";
      saveBtn.textContent = "Save";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "secondary";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", cancelCategoryEdit);

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      form.appendChild(label);
      form.appendChild(input);
      form.appendChild(colorInput);
      form.appendChild(actions);

      item.appendChild(form);
    } else {
      const info = document.createElement("div");
      info.className = "category-info";
      const nameRow = document.createElement("div");
      nameRow.className = "category-name-row";
      const colorDot = document.createElement("span");
      colorDot.className = "category-color-dot";
      colorDot.style.setProperty(
        "--category-color",
        category.color ?? DEFAULT_CATEGORY_COLOR
      );
      const name = document.createElement("span");
      name.className = "category-name";
      name.textContent = category.name;
      nameRow.appendChild(colorDot);
      nameRow.appendChild(name);
      const usage = document.createElement("span");
      usage.className = "category-usage";
      const usageCount = getCategoryUsageCount(category.name);
      usage.textContent =
        usageCount === 1 ? "Used by 1 task" : `Used by ${usageCount} tasks`;
      info.appendChild(nameRow);
      info.appendChild(usage);

      const actions = document.createElement("div");
      actions.className = "category-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "secondary";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => startCategoryEdit(category.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "danger";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => removeCategory(category.id));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      item.appendChild(info);
      item.appendChild(actions);
    }

    categoryListEl.appendChild(item);
  });
}

function renderCurrentView() {
  const isCategoryView = filter === "categories";
  if (categoryPanelEl) {
    categoryPanelEl.hidden = !isCategoryView;
  }
  listEl.hidden = isCategoryView;
  if (isCategoryView) {
    renderCategories();
    return;
  }

  if (filter === "daily") {
    renderDailyTasks();
    return;
  }
  renderTodos();
}

function addTodo(
  text,
  comments = "",
  startTime = null,
  endTime = null,
  color = null,
  category = ""
) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const cleanedComments = comments.trim();
  const cleanedCategory = (category ?? "").trim();
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
    startTime,
    endTime,
    comments: cleanedComments,
    color,
    category: cleanedCategory,
    showActions: false,
    deleted: false,
    needsPositioning: true,
  });
  saveTodos();
  renderCurrentView();
  return true;
}

function addDailyTask(
  text,
  comments = "",
  startTime = null,
  endTime = null,
  color = null,
  category = "",
  triggerDays = [],
  intervalDays = null
) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const cleanedComments = comments.trim();
  const cleanedCategory = (category ?? "").trim();
  dailyTasks.unshift({
    id: crypto.randomUUID(),
    text: trimmed,
    comments: cleanedComments,
    startTime,
    endTime,
    color,
    category: cleanedCategory,
    triggerDays: triggerDays ?? [],
    intervalDays: intervalDays ?? null,
    createdAt: new Date().toISOString(),
    lastTriggeredAt: null,
    showDetails: false,
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

function rebaseDateTimeToReference(sourceIso, referenceDate = new Date()) {
  if (!sourceIso) return null;
  const source = new Date(sourceIso);
  const reference = new Date(referenceDate);
  if (!Number.isFinite(source.getTime()) || !Number.isFinite(reference.getTime()))
    return null;

  const rebased = new Date(reference);
  rebased.setHours(
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds()
  );
  return rebased.toISOString();
}

function computeRebasedEnd(startIso, endIso, rebasedStartIso) {
  if (!endIso) return null;
  const originalStart = startIso ? new Date(startIso) : null;
  const originalEnd = new Date(endIso);
  if (!Number.isFinite(originalEnd.getTime())) return null;

  if (originalStart && Number.isFinite(originalStart.getTime())) {
    const rebasedStart = new Date(rebasedStartIso);
    if (!Number.isFinite(rebasedStart.getTime())) return null;
    const durationMs = originalEnd - originalStart;
    if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
    return new Date(rebasedStart.getTime() + durationMs).toISOString();
  }

  const fallbackReference = rebasedStartIso
    ? new Date(rebasedStartIso)
    : new Date();
  return rebaseDateTimeToReference(endIso, fallbackReference);
}

function getStartOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isStartTimeEligible(task, referenceDate = new Date()) {
  if (!task.startTime) return true;
  const rebasedStartIso = rebaseDateTimeToReference(task.startTime, referenceDate);
  if (!rebasedStartIso) return true;

  const start = new Date(rebasedStartIso);
  const reference = new Date(referenceDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(reference.getTime())) {
    return true;
  }
  return reference >= start;
}

function isIntervalEligible(task, referenceDate = new Date()) {
  const interval = task.intervalDays;
  if (!Number.isFinite(interval) || interval <= 0) return true;

  const baseline = task.lastTriggeredAt;
  if (!baseline) return true;

  const last = getStartOfDay(new Date(baseline));
  const reference = getStartOfDay(referenceDate);
  const diffDays = Math.floor((reference - last) / 86400000);
  return diffDays >= interval;
}

function isWeekdayEligible(task, referenceDate = new Date()) {
  if (!task.triggerDays || task.triggerDays.length === 0) return true;
  const today = new Date(referenceDate).getDay();
  return task.triggerDays.includes(today);
}

function canTriggerDailyTaskToday(task, referenceDate = new Date()) {
  return (
    isWeekdayEligible(task, referenceDate) &&
    isIntervalEligible(task, referenceDate) &&
    isStartTimeEligible(task, referenceDate)
  );
}

function maybeAutoTriggerDailyTasks(referenceDate = new Date()) {
  // Daily templates are evaluated against today's date rather than their original save date.
  const now = new Date(referenceDate);
  if (!Number.isFinite(now.getTime())) return;

  const pendingTriggers = dailyTasks.filter((task) => {
    if (task.lastTriggeredAt && isToday(task.lastTriggeredAt)) return false;
    if (!canTriggerDailyTaskToday(task, now)) return false;

    if (!task.startTime) return true;
    const scheduledStartIso = rebaseDateTimeToReference(task.startTime, now);
    const scheduledStart = scheduledStartIso ? new Date(scheduledStartIso) : null;
    if (!scheduledStart || !Number.isFinite(scheduledStart.getTime())) return true;
    return now >= scheduledStart;
  });

  pendingTriggers.forEach((task) => triggerDailyTask(task.id));
}

function describeDailySchedule(task) {
  const parts = [];
  if (task.triggerDays?.length) {
    const ordered = [...task.triggerDays].sort((a, b) => a - b);
    parts.push(`Weekdays: ${ordered.map((day) => WEEKDAY_LABELS[day] ?? day).join(", ")}`);
  }
  if (Number.isFinite(task.intervalDays) && task.intervalDays > 0) {
    const suffix = task.intervalDays === 1 ? "day" : "days";
    parts.push(`Every ${task.intervalDays} ${suffix}`);
  }
  if (parts.length === 0) return "Every day";
  return parts.join(" · ");
}

function triggerDailyTask(id) {
  const template = dailyTasks.find((task) => task.id === id);
  if (!template) return;
  if (!canTriggerDailyTaskToday(template)) return;
  if (template.lastTriggeredAt && isToday(template.lastTriggeredAt)) return;

  const now = new Date();
  const startTime =
    rebaseDateTimeToReference(template.startTime, now) ?? now.toISOString();
  const endTime = computeRebasedEnd(template.startTime, template.endTime, startTime);

  const created = addTodo(
    template.text,
    template.comments ?? "",
    startTime,
    endTime,
    template.color ?? null,
    template.category ?? ""
  );
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
  editStartEl.value = formatDateForInput(todo.startTime);
  editEndEl.value = formatDateForInput(todo.endTime);
  editColorEl.value = todo.color ?? DEFAULT_COLOR;
  syncColorToggleSwatch(editColorToggleEl, editColorEl);
  if (editColorToggleEl) {
    editColorToggleEl.checked = Boolean(todo.color);
    setColorEnabled(editColorToggleEl, editColorEl);
  }
  editCategoryEl.value = todo.category ?? "";
  editColorEl.dataset.touched = "false";
  updateColorTriggerLabel(editColorTriggerEl, todo.text);
  editDialogEl.showModal();
  editInputEl.focus();
}

function closeDailyEditDialog() {
  activeDailyEditId = null;
  dailyEditColorEl.dataset.touched = "false";
  dailyEditDialogEl.close();
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
    let lastPersist = 0;

    const persistPosition = (x, y, finalize = false) => {
      let changed = false;
      todos = todos.map((todoItem) => {
        if (todoItem.id !== id) return todoItem;
        const nextNeedsPositioning = finalize ? false : todoItem.needsPositioning;
        if (
          todoItem.position?.x === x &&
          todoItem.position?.y === y &&
          todoItem.needsPositioning === nextNeedsPositioning
        ) {
          return todoItem;
        }
        changed = true;
        return {
          ...todoItem,
          position: { x, y },
          needsPositioning: nextNeedsPositioning,
        };
      });

      if (changed) {
        saveTodos();
      }
    };

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

      if (isDragging) {
        const now = Date.now();
        if (now - lastPersist > DRAG_PERSIST_INTERVAL) {
          persistPosition(nextX, nextY);
          lastPersist = now;
        }
      }
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
        persistPosition(left, top, true);
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
  const offsetStartTime = computeStartFromOffset(
    startOffsetDaysEl.value,
    startOffsetHoursEl.value,
    startOffsetMinsEl.value
  );
  const startTime = offsetStartTime ?? parseDateInput(startEl.value) ?? new Date().toISOString();
  const explicitEndTime = parseDateInput(endEl?.value);
  const endTime = explicitEndTime ?? computeEndFromDuration(
    startTime,
    endDaysEl.value,
    endHoursEl.value,
    endMinsEl.value
  );
  const colorEnabled = colorToggleEl?.checked ?? true;
  const color = colorEnabled ? colorEl.value?.trim() || null : null;
  const category = categoryEl.value?.trim() ?? "";
  const triggerDays = taskType === "daily" ? parseSelectedWeekdays(dailyWeekdayInputs) : [];
  const intervalDays =
    taskType === "daily" ? parseIntervalValue(dailyIntervalToggleEl, dailyIntervalDaysEl) : null;
  const added =
    taskType === "daily"
      ? addDailyTask(
          inputEl.value,
          commentEl.value,
          startTime,
          endTime,
          color,
          category,
          triggerDays,
          intervalDays
        )
      : addTodo(inputEl.value, commentEl.value, startTime, endTime, color, category);
  if (added) {
    inputEl.value = "";
    commentEl.value = "";
    startEl.value = formatDateForInput(new Date().toISOString());
    startOffsetDaysEl.value = "";
    startOffsetHoursEl.value = "";
    startOffsetMinsEl.value = "";
    endEl.value = startEl.value;
    endEl.dataset.synced = "true";
    endDaysEl.value = "";
    endHoursEl.value = "";
    endMinsEl.value = "";
    colorEl.value = DEFAULT_COLOR;
    syncColorToggleSwatch(colorToggleEl, colorEl);
    if (colorToggleEl) {
      colorToggleEl.checked = true;
      setColorEnabled(colorToggleEl, colorEl);
    }
    updateColorTriggerLabel(colorTriggerEl, "");
    categoryEl.value = "";
    typeSelectEl.value = "one-time";
    dailyWeekdayInputs.forEach((input) => {
      input.checked = false;
    });
    setIntervalEnabled(dailyIntervalToggleEl, dailyIntervalDaysEl, true);
    dailyIntervalDaysEl.value = "1";
    updateDailyOptionsVisibility();
    dialogEl.close();
  }
});

openAddEl.addEventListener("click", () => {
  inputEl.value = "";
  commentEl.value = "";
  const startValue = formatDateForInput(new Date().toISOString());
  startEl.value = startValue;
  if (endEl) {
    endEl.value = startValue;
    endEl.dataset.synced = "true";
  }
  startOffsetDaysEl.value = "";
  startOffsetHoursEl.value = "";
  startOffsetMinsEl.value = "";
  endDaysEl.value = "";
  endHoursEl.value = "";
  endMinsEl.value = "";
  colorEl.value = DEFAULT_COLOR;
  syncColorToggleSwatch(colorToggleEl, colorEl);
  if (colorToggleEl) {
    colorToggleEl.checked = true;
    setColorEnabled(colorToggleEl, colorEl);
  }
  updateColorTriggerLabel(colorTriggerEl, inputEl.value);
  categoryEl.value = "";
  typeSelectEl.value = "one-time";
  dailyWeekdayInputs.forEach((input) => {
    input.checked = false;
  });
  setIntervalEnabled(dailyIntervalToggleEl, dailyIntervalDaysEl, true);
  dailyIntervalDaysEl.value = "1";
  updateDailyOptionsVisibility();
  dialogEl.showModal();
  inputEl.focus();
});

cancelAddEl.addEventListener("click", () => {
  dialogEl.close();
});

[
  startOffsetDaysEl,
  startOffsetHoursEl,
  startOffsetMinsEl,
].forEach((input) => {
  input?.addEventListener("input", updateStartFromOffsetPreview);
  input?.addEventListener("change", updateStartFromOffsetPreview);
});

startEl?.addEventListener("input", () => {
  if (endEl && !endEl.dataset.synced) {
    endEl.dataset.synced = "true";
  }
  syncEndTimeWithStart();
});
startEl?.addEventListener("change", syncEndTimeWithStart);

[endDaysEl, endHoursEl, endMinsEl].forEach((input) => {
  input?.addEventListener("input", () => {
    if (endEl) {
      endEl.dataset.synced = "true";
    }
    syncEndTimeWithStart();
  });
});

endEl?.addEventListener("input", () => {
  endEl.dataset.synced = "false";
});

typeSelectEl.addEventListener("change", updateDailyOptionsVisibility);

const handleDailyWeekdayChange = () =>
  syncIntervalWithWeekdays(dailyWeekdayInputs, dailyIntervalToggleEl, dailyIntervalDaysEl);
const handleDailyEditWeekdayChange = () =>
  syncIntervalWithWeekdays(
    dailyEditWeekdayInputs,
    dailyEditIntervalToggleEl,
    dailyEditIntervalDaysEl
  );

function enforceMaxLength(input, maxLength = DURATION_INPUT_MAX_LENGTH) {
  if (!input) return;
  const limit =
    Number.isInteger(input.maxLength) && input.maxLength > 0 ? input.maxLength : maxLength;
  input.addEventListener("input", () => {
    const value = input.value;
    if (value && value.length > limit) {
      input.value = value.slice(0, limit);
    }
  });
}

document.querySelectorAll(".duration-inputs input[type='number']").forEach((input) => {
  enforceMaxLength(input);
});

dailyWeekdayInputs.forEach((input) => {
  input.addEventListener("change", handleDailyWeekdayChange);
});

dailyEditWeekdayInputs.forEach((input) => {
  input.addEventListener("change", handleDailyEditWeekdayChange);
});

dailyIntervalToggleEl?.addEventListener("change", () => {
  const enabled = dailyIntervalToggleEl.checked;
  dailyIntervalToggleEl.dataset.userDisabled = enabled ? "false" : "true";
  setIntervalEnabled(dailyIntervalToggleEl, dailyIntervalDaysEl, enabled);
  handleDailyWeekdayChange();
});

dailyEditIntervalToggleEl?.addEventListener("change", () => {
  const enabled = dailyEditIntervalToggleEl.checked;
  dailyEditIntervalToggleEl.dataset.userDisabled = enabled ? "false" : "true";
  setIntervalEnabled(dailyEditIntervalToggleEl, dailyEditIntervalDaysEl, enabled);
  handleDailyEditWeekdayChange();
});

const clampIntervalInput = (toggle, input) => {
  const value = Number.parseInt(input.value, 10);
  if (!Number.isFinite(value) || value <= 0) {
    input.value = "";
    setIntervalEnabled(toggle, input, false);
    if (toggle) toggle.dataset.userDisabled = "true";
  } else {
    setIntervalEnabled(toggle, input, true);
    if (toggle) toggle.dataset.userDisabled = "false";
  }
};

dailyIntervalDaysEl?.addEventListener("change", () =>
  clampIntervalInput(dailyIntervalToggleEl, dailyIntervalDaysEl)
);
dailyEditIntervalDaysEl?.addEventListener("change", () =>
  clampIntervalInput(dailyEditIntervalToggleEl, dailyEditIntervalDaysEl)
);

updateDailyOptionsVisibility();
setIntervalEnabled(dailyIntervalToggleEl, dailyIntervalDaysEl, true);
if (dailyIntervalToggleEl) dailyIntervalToggleEl.dataset.userDisabled = "false";
if (dailyIntervalDaysEl && !dailyIntervalDaysEl.value) dailyIntervalDaysEl.value = "1";

setColorEnabled(colorToggleEl, colorEl);
setColorEnabled(editColorToggleEl, editColorEl);
setColorEnabled(dailyEditColorToggleEl, dailyEditColorEl);

syncColorToggleSwatch(colorToggleEl, colorEl);
syncColorToggleSwatch(editColorToggleEl, editColorEl);
syncColorToggleSwatch(dailyEditColorToggleEl, dailyEditColorEl);

attachColorPickerTrigger(colorTriggerEl, colorEl, colorToggleEl);
attachColorPickerTrigger(editColorTriggerEl, editColorEl, editColorToggleEl);
attachColorPickerTrigger(
  dailyEditColorTriggerEl,
  dailyEditColorEl,
  dailyEditColorToggleEl
);

colorToggleEl?.addEventListener("change", () => {
  setColorEnabled(colorToggleEl, colorEl);
});

editColorToggleEl?.addEventListener("change", () => {
  setColorEnabled(editColorToggleEl, editColorEl);
});

dailyEditColorToggleEl?.addEventListener("change", () => {
  setColorEnabled(dailyEditColorToggleEl, dailyEditColorEl);
});

colorEl?.addEventListener("input", () => {
  syncColorToggleSwatch(colorToggleEl, colorEl);
});

editColorEl.addEventListener("input", () => {
  editColorEl.dataset.touched = "true";
  syncColorToggleSwatch(editColorToggleEl, editColorEl);
});

dailyEditColorEl.addEventListener("input", () => {
  dailyEditColorEl.dataset.touched = "true";
  syncColorToggleSwatch(dailyEditColorToggleEl, dailyEditColorEl);
});

inputEl?.addEventListener("input", () => {
  updateColorTriggerLabel(colorTriggerEl, inputEl.value);
});

editInputEl?.addEventListener("input", () => {
  updateColorTriggerLabel(editColorTriggerEl, editInputEl.value);
});

dailyEditInputEl?.addEventListener("input", () => {
  updateColorTriggerLabel(dailyEditColorTriggerEl, dailyEditInputEl.value);
});

  editFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = editInputEl.value.trim();
    const comments = editCommentEl.value.trim();
    const startTime = parseDateInput(editStartEl.value);
    const endTime = parseDateInput(editEndEl.value);
    const currentTodo = todos.find((todo) => todo.id === activeEditId);
    const category = editCategoryEl.value.trim();
    const colorEnabled = editColorToggleEl?.checked ?? true;
    const color = colorEnabled
      ? editColorEl.dataset.touched === "true"
        ? editColorEl.value?.trim() || null
        : currentTodo?.color ?? (editColorEl.value?.trim() || null)
      : null;

  if (!activeEditId || !text) return;

  let changed = false;
  todos = todos.map((todo) => {
    if (todo.id !== activeEditId || todo.deleted) return todo;
    if (
      todo.text !== text ||
      (todo.comments ?? "") !== comments ||
      todo.startTime !== startTime ||
      todo.endTime !== endTime ||
      (todo.color ?? null) !== color ||
      (todo.category ?? "") !== category
    ) {
      changed = true;
      return { ...todo, text, comments, startTime, endTime, color, category };
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
  editColorEl.dataset.touched = "false";
  editDialogEl.close();
});

editDialogEl.addEventListener("close", () => {
  activeEditId = null;
  editColorEl.dataset.touched = "false";
  setColorEnabled(editColorToggleEl, editColorEl);
});

dailyEditFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = dailyEditInputEl.value.trim();
  const comments = dailyEditCommentEl.value.trim();
  const startTime = parseDateInput(dailyEditStartEl.value);
  const currentTask = dailyTasks.find((task) => task.id === activeDailyEditId);
  const endTime =
    computeEndFromDuration(
      startTime,
      dailyEditEndDaysEl.value,
      dailyEditEndHoursEl.value,
      dailyEditEndMinsEl.value
    ) ?? currentTask?.endTime ?? null;
  const triggerDays = parseSelectedWeekdays(dailyEditWeekdayInputs);
  const intervalDays = parseIntervalValue(dailyEditIntervalToggleEl, dailyEditIntervalDaysEl);
  const category = dailyEditCategoryEl?.value?.trim() ?? "";
  const colorEnabled = dailyEditColorToggleEl?.checked ?? true;
  const color = colorEnabled
      ? dailyEditColorEl.dataset.touched === "true"
        ? dailyEditColorEl.value?.trim() || null
        : currentTask?.color ?? (dailyEditColorEl.value?.trim() || null)
      : null;

  if (!activeDailyEditId || !text) return;

  let changed = false;
  dailyTasks = dailyTasks.map((task) => {
    if (task.id !== activeDailyEditId) return task;
    if (
      task.text !== text ||
      (task.comments ?? "") !== comments ||
      task.startTime !== startTime ||
      task.endTime !== endTime ||
      (task.color ?? null) !== color ||
      (task.category ?? "") !== category ||
      JSON.stringify(task.triggerDays ?? []) !== JSON.stringify(triggerDays) ||
      (task.intervalDays ?? null) !== (intervalDays ?? null)
    ) {
      changed = true;
      return {
        ...task,
        text,
        comments,
        startTime,
        endTime,
        color,
        category,
        triggerDays,
        intervalDays,
      };
    }
    return task;
  });

  closeDailyEditDialog();

  if (changed) {
    saveDailyTasks();
    renderCurrentView();
  }
});

cancelDailyEditEl.addEventListener("click", () => {
  closeDailyEditDialog();
});

dailyEditDialogEl.addEventListener("close", () => {
  activeDailyEditId = null;
  dailyEditFormEl.reset();
  dailyEditColorEl.dataset.touched = "false";
  setColorEnabled(dailyEditColorToggleEl, dailyEditColorEl);
  setIntervalEnabled(dailyEditIntervalToggleEl, dailyEditIntervalDaysEl, true);
  if (dailyEditIntervalToggleEl) dailyEditIntervalToggleEl.dataset.userDisabled = "false";
  if (dailyEditIntervalDaysEl) dailyEditIntervalDaysEl.value = "1";
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

if (categoryFormEl) {
  categoryFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = categoryNameEl.value.trim();
    const color = categoryColorEl?.value?.trim() || DEFAULT_CATEGORY_COLOR;
    if (!name) {
      categoryNameEl.reportValidity();
      return;
    }
    if (isDuplicateCategoryName(name)) {
      categoryNameEl.setCustomValidity("Category already exists.");
      categoryNameEl.reportValidity();
      return;
    }
    categoryNameEl.setCustomValidity("");
    categories = [...categories, createCategory(name, color)];
    saveCategories();
    renderCategoryOptions();
    categoryNameEl.value = "";
    if (categoryColorEl) {
      categoryColorEl.value = pickCategoryColor(name, categories.length);
    }
    renderCategories();
  });

  categoryNameEl.addEventListener("input", () => {
    categoryNameEl.setCustomValidity("");
  });
}

loadDailyTasks();
loadTodos();
loadCategories();
ensureLayoutDefaults();
syncCategoriesFromTodos();
renderCategoryOptions();
maybeAutoTriggerDailyTasks();
setFilter(filter);

if (timeRefreshHandle) {
  clearInterval(timeRefreshHandle);
}
timeRefreshHandle = setInterval(() => {
  maybeAutoTriggerDailyTasks();
  renderCurrentView();
}, TIME_REFRESH_INTERVAL);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    maybeAutoTriggerDailyTasks();
    renderCurrentView();
  }
});
