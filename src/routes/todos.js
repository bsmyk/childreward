'use strict';

const express = require('express');

const store = require('../lib/store');
const { badRequest, notFound } = require('../lib/errors');

/**
 * Resolve the JSON file backing the todos collection. Honors the
 * `TODOS_FILE` env var so tests can isolate persistence per run; otherwise
 * falls back to a bare `todos.json` (resolved into the store's default data/
 * directory).
 *
 * @returns {string}
 */
function todosFile() {
  return process.env.TODOS_FILE || 'todos.json';
}

/**
 * Load all todos from disk.
 *
 * @returns {Array<object>}
 */
function readTodos() {
  return store.read(todosFile(), []);
}

/**
 * Persist the full todos array to disk.
 *
 * @param {Array<object>} todos
 */
function writeTodos(todos) {
  store.write(todosFile(), todos);
}

/**
 * Generate a stable, unique id. `:id` lookups compare as strings, so we
 * return a string here too.
 *
 * @param {Array<object>} todos existing todos
 * @returns {string}
 */
function nextId(todos) {
  const max = todos.reduce((acc, t) => Math.max(acc, Number(t.id) || 0), 0);
  return String(max + 1);
}

/**
 * Validate and normalize a `title` value. Throws a 400 on bad input.
 *
 * @param {*} title
 * @returns {string} trimmed title
 */
function validateTitle(title) {
  if (typeof title !== 'string' || title.trim() === '') {
    throw badRequest('invalid_title', 'title must be a non-empty string');
  }
  return title.trim();
}

const router = express.Router();

// POST /todos — create
router.post('/', (req, res) => {
  const body = req.body || {};
  const title = validateTitle(body.title);

  const todos = readTodos();
  const todo = {
    id: nextId(todos),
    title,
    done: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  writeTodos(todos);

  res.status(201).json(todo);
});

// GET /todos — list all
router.get('/', (req, res) => {
  res.status(200).json(readTodos());
});

// GET /todos/:id — read one
router.get('/:id', (req, res) => {
  const todo = readTodos().find((t) => String(t.id) === req.params.id);
  if (!todo) {
    throw notFound(`No todo with id ${req.params.id}`);
  }
  res.status(200).json(todo);
});

// PATCH /todos/:id — partial update
router.patch('/:id', (req, res) => {
  const body = req.body || {};
  const hasTitle = Object.prototype.hasOwnProperty.call(body, 'title');
  const hasDone = Object.prototype.hasOwnProperty.call(body, 'done');

  if (!hasTitle && !hasDone) {
    throw badRequest('no_fields', 'provide at least one of: title, done');
  }

  const patch = {};
  if (hasTitle) {
    patch.title = validateTitle(body.title);
  }
  if (hasDone) {
    if (typeof body.done !== 'boolean') {
      throw badRequest('invalid_done', 'done must be a boolean');
    }
    patch.done = body.done;
  }

  const todos = readTodos();
  const todo = todos.find((t) => String(t.id) === req.params.id);
  if (!todo) {
    throw notFound(`No todo with id ${req.params.id}`);
  }

  Object.assign(todo, patch);
  writeTodos(todos);

  res.status(200).json(todo);
});

// DELETE /todos/:id — remove
router.delete('/:id', (req, res) => {
  const todos = readTodos();
  const index = todos.findIndex((t) => String(t.id) === req.params.id);
  if (index === -1) {
    throw notFound(`No todo with id ${req.params.id}`);
  }

  todos.splice(index, 1);
  writeTodos(todos);

  res.status(204).end();
});

module.exports = router;
