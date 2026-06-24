'use strict';

const express = require('express');

const store = require('../lib/store');

// Fixed, configurable star award for completing a todo. Overridable via env.
const EARN_STARS = Number.parseInt(process.env.EARN_STARS, 10) || 10;

/**
 * Build the `/todos` router.
 *
 * Todo shape: `{ id, title, completed }`. The first time a todo transitions
 * from incomplete → complete, exactly one positive ledger entry is appended.
 * A persisted `awarded` guard ensures re-completing never double-awards.
 *
 * @param {object} deps
 * @param {string} deps.file todos store path
 * @param {{ append: Function }} deps.ledger ledger to credit on completion
 * @returns {import('express').Router}
 */
function createTodosRouter({ file = 'todos.json', ledger }) {
  const router = express.Router();

  const readAll = () => store.read(file, []);
  const writeAll = (todos) => store.write(file, todos);
  const nextId = (todos) =>
    todos.reduce((max, t) => (t.id > max ? t.id : max), 0) + 1;

  // Strip internal guard field from API responses.
  const present = ({ id, title, completed }) => ({ id, title, completed });

  router.get('/', (req, res) => {
    res.json(readAll().map(present));
  });

  router.post('/', (req, res) => {
    const { title } = req.body || {};
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'title is required' });
    }
    const todos = readAll();
    const todo = { id: nextId(todos), title, completed: false, awarded: false };
    todos.push(todo);
    writeAll(todos);
    return res.status(201).json(present(todo));
  });

  router.get('/:id', (req, res) => {
    const todo = readAll().find((t) => String(t.id) === String(req.params.id));
    if (!todo) {
      return res.status(404).json({ error: 'todo not found' });
    }
    return res.json(present(todo));
  });

  // Shared update logic for PATCH and the dedicated complete action.
  function applyUpdate(req, res, changes) {
    const todos = readAll();
    const todo = todos.find((t) => String(t.id) === String(req.params.id));
    if (!todo) {
      return res.status(404).json({ error: 'todo not found' });
    }

    if ('title' in changes) {
      if (typeof changes.title !== 'string' || changes.title.trim() === '') {
        return res.status(400).json({ error: 'title must be a non-empty string' });
      }
      todo.title = changes.title;
    }

    let justCompleted = false;
    if ('completed' in changes) {
      const next = Boolean(changes.completed);
      if (next && !todo.completed) {
        justCompleted = true;
      }
      todo.completed = next;
    }

    // Earn exactly once on the first incomplete → complete transition.
    if (justCompleted && !todo.awarded) {
      ledger.append({
        delta: EARN_STARS,
        reason: 'todo_completed',
        refId: todo.id,
      });
      todo.awarded = true;
    }

    writeAll(todos);
    return res.json(present(todo));
  }

  router.patch('/:id', (req, res) => applyUpdate(req, res, req.body || {}));

  // Dedicated complete action — same single-award guarantee as PATCH.
  router.post('/:id/complete', (req, res) =>
    applyUpdate(req, res, { completed: true })
  );

  router.delete('/:id', (req, res) => {
    const todos = readAll();
    const idx = todos.findIndex((t) => String(t.id) === String(req.params.id));
    if (idx === -1) {
      return res.status(404).json({ error: 'todo not found' });
    }
    todos.splice(idx, 1);
    writeAll(todos);
    return res.status(204).end();
  });

  return router;
}

module.exports = createTodosRouter;
module.exports.createTodosRouter = createTodosRouter;
module.exports.EARN_STARS = EARN_STARS;
