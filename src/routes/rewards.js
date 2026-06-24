'use strict';

const express = require('express');

const store = require('../lib/store');

/**
 * Validate and normalize a `cost` value. Returns an integer >= 0 or null when
 * the value is missing/invalid.
 *
 * @param {*} value
 * @returns {number|null}
 */
function normalizeCost(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

/**
 * Build the `/rewards` router. Reward shape: `{ id, name, icon, cost }` with
 * integer `cost >= 0`.
 *
 * @param {object} deps
 * @param {string} deps.file rewards store path
 * @returns {import('express').Router}
 */
function createRewardsRouter({ file = 'rewards.json' }) {
  const router = express.Router();

  const readAll = () => store.read(file, []);
  const writeAll = (rewards) => store.write(file, rewards);
  const nextId = (rewards) =>
    rewards.reduce((max, r) => (r.id > max ? r.id : max), 0) + 1;

  router.get('/', (req, res) => {
    res.json(readAll());
  });

  router.post('/', (req, res) => {
    const { name, icon, cost } = req.body || {};
    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }
    const normalizedCost = normalizeCost(cost);
    if (normalizedCost === null) {
      return res
        .status(400)
        .json({ error: 'cost must be an integer >= 0' });
    }
    const rewards = readAll();
    const reward = {
      id: nextId(rewards),
      name,
      icon: typeof icon === 'string' ? icon : '',
      cost: normalizedCost,
    };
    rewards.push(reward);
    writeAll(rewards);
    return res.status(201).json(reward);
  });

  router.patch('/:id', (req, res) => {
    const rewards = readAll();
    const reward = rewards.find((r) => String(r.id) === String(req.params.id));
    if (!reward) {
      return res.status(404).json({ error: 'reward not found' });
    }
    const { name, icon, cost } = req.body || {};
    if ('name' in (req.body || {})) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'name must be a non-empty string' });
      }
      reward.name = name;
    }
    if ('icon' in (req.body || {})) {
      reward.icon = typeof icon === 'string' ? icon : reward.icon;
    }
    if ('cost' in (req.body || {})) {
      const normalizedCost = normalizeCost(cost);
      if (normalizedCost === null) {
        return res.status(400).json({ error: 'cost must be an integer >= 0' });
      }
      reward.cost = normalizedCost;
    }
    writeAll(rewards);
    return res.json(reward);
  });

  router.delete('/:id', (req, res) => {
    const rewards = readAll();
    const idx = rewards.findIndex(
      (r) => String(r.id) === String(req.params.id)
    );
    if (idx === -1) {
      return res.status(404).json({ error: 'reward not found' });
    }
    rewards.splice(idx, 1);
    writeAll(rewards);
    return res.status(204).end();
  });

  return router;
}

module.exports = createRewardsRouter;
module.exports.createRewardsRouter = createRewardsRouter;
module.exports.normalizeCost = normalizeCost;
