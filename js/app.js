import { TodoApiClient } from './apiClient.js';

const api = new TodoApiClient();
const todoList = document.getElementById('todo-list');
const form = document.getElementById('todo-form');
const errorBox = document.getElementById('error-box');
const loading = document.getElementById('loading');

const showError = (message) => {
  if (!message) {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    return;
  }
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
};

const toggleLoading = (state) => {
  loading.style.display = state ? 'block' : 'none';
};

const renderTodos = (todos) => {
  todoList.innerHTML = '';
  todos.forEach((todo) => {
    const li = document.createElement('li');
    li.dataset.id = todo.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!todo.done;
    checkbox.addEventListener('change', async () => {
      try {
        toggleLoading(true);
        const updated = await api.updateTodo(todo.id, { ...todo, done: checkbox.checked });
        todo.done = updated.done;
      } catch (err) {
        checkbox.checked = !checkbox.checked;
        showError(err.message);
      } finally {
        toggleLoading(false);
      }
    });

    const title = document.createElement('span');
    title.textContent = todo.title;
    title.className = todo.done ? 'done' : '';

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = todo.title;
    editInput.classList.add('edit-input');

    const editButton = document.createElement('button');
    editButton.textContent = 'Update';
    editButton.addEventListener('click', async () => {
      const newTitle = editInput.value.trim();
      if (!newTitle) return;
      try {
        toggleLoading(true);
        const updated = await api.updateTodo(todo.id, { ...todo, title: newTitle });
        todo.title = updated.title;
        title.textContent = updated.title;
        title.className = updated.done ? 'done' : '';
        editInput.value = updated.title;
        showError('');
      } catch (err) {
        showError(err.message);
      } finally {
        toggleLoading(false);
      }
    });

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', async () => {
      try {
        toggleLoading(true);
        await api.deleteTodo(todo.id);
        li.remove();
      } catch (err) {
        showError(err.message);
      } finally {
        toggleLoading(false);
      }
    });

    li.appendChild(checkbox);
    li.appendChild(title);
    li.appendChild(editInput);
    li.appendChild(editButton);
    li.appendChild(deleteButton);
    todoList.appendChild(li);
  });
};

const loadTodos = async () => {
  try {
    toggleLoading(true);
    const todos = await api.listTodos();
    renderTodos(todos);
    showError('');
  } catch (err) {
    showError(err.message);
  } finally {
    toggleLoading(false);
  }
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const titleInput = document.getElementById('todo-title');
  const title = titleInput.value.trim();
  if (!title) return;
  try {
    toggleLoading(true);
    const newTodo = await api.createTodo({ title, done: false });
    renderTodos([...todoList.querySelectorAll('li')].map((li) => ({
      id: Number(li.dataset.id),
      title: li.querySelector('span').textContent,
      done: li.querySelector('input[type="checkbox"]').checked
    })).concat([newTodo]));
    titleInput.value = '';
    showError('');
  } catch (err) {
    showError(err.message);
  } finally {
    toggleLoading(false);
  }
});

loadTodos();
