'use strict';

const express = require('express');

/**
 * Fixed badge catalog. Order is significant — the API always returns badges in
 * this order, locked and unlocked alike. Each badge declares a `milestone`
 * predicate evaluated against a running fold of the ledger (see below); the
 * first ledger entry that satisfies it stamps the badge's `unlockedAt`.
 */
const CATALOG = [
  {
    id: 'first_todo',
    title: 'Getting Started',
    description: 'Complete your first task.',
    // Unlocks on the first todo_completed entry.
    milestone: (s) => s.completed >= 1,
  },
  {
    id: 'ten_todos',
    title: 'On a Roll',
    description: 'Complete ten tasks.',
    // Unlocks on the 10th todo_completed entry.
    milestone: (s) => s.completed >= 10,
  },
  {
    id: 'hundred_stars',
    title: 'Star Collector',
    description: 'Earn 100 stars in total.',
    // Unlocks when lifetime earned stars first reach >= 100.
    milestone: (s) => s.earned >= 100,
  },
  {
    id: 'first_redeem',
    title: 'Treat Yourself',
    description: 'Redeem your first reward.',
    // Unlocks on the first redeem entry.
    milestone: (s) => s.redeemed >= 1,
  },
];

/**
 * Fold the ledger into badge state. Pure: reads the entries array, writes
 * nothing. Walks entries once in `id` order, advancing earn-only counters
 * (`completed`, `earned`) and a `redeemed` count, and records the first `ts`
 * at which each badge's milestone holds. Redemptions (negative deltas) never
 * lower the earned sum, so an unlocked earn badge stays unlocked.
 *
 * @param {Array<object>} entries ledger entries
 * @returns {Array<{ id, title, description, unlocked, unlockedAt }>}
 */
function deriveAchievements(entries) {
  const ordered = [...entries].sort((a, b) => a.id - b.id);

  const state = { completed: 0, earned: 0, redeemed: 0 };
  const unlockedAt = {}; // id -> ts of the entry that first satisfied it

  for (const entry of ordered) {
    if (entry.reason === 'todo_completed') {
      state.completed += 1;
      if (entry.delta > 0) {
        state.earned += entry.delta;
      }
    } else if (entry.reason === 'redeem') {
      state.redeemed += 1;
    }

    for (const badge of CATALOG) {
      if (unlockedAt[badge.id] === undefined && badge.milestone(state)) {
        unlockedAt[badge.id] = entry.ts;
      }
    }
  }

  return CATALOG.map(({ id, title, description }) => ({
    id,
    title,
    description,
    unlocked: unlockedAt[id] !== undefined,
    unlockedAt: unlockedAt[id] ?? null,
  }));
}

/**
 * Build the achievements router: `GET /achievements`.
 *
 * Badge state is *derived* from the append-only ledger — the route reads
 * `ledger.entries()` and computes the full catalog on each request. It appends
 * nothing and persists no badge state.
 *
 * @param {object} deps
 * @param {{ entries: Function }} deps.ledger ledger to derive badges from
 * @returns {import('express').Router}
 */
function createAchievementsRouter({ ledger }) {
  const router = express.Router();

  router.get('/achievements', (req, res) => {
    res.json(deriveAchievements(ledger.entries()));
  });

  return router;
}

module.exports = createAchievementsRouter;
module.exports.createAchievementsRouter = createAchievementsRouter;
module.exports.deriveAchievements = deriveAchievements;
module.exports.CATALOG = CATALOG;
