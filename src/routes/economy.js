'use strict';

const express = require('express');

const store = require('../lib/store');

/**
 * Build the economy router: `GET /balance` and `POST /redemptions`.
 *
 * Balance is always derived from the ledger. Redeeming a reward appends one
 * negative ledger entry of `-cost`, guarded against overspending. An unknown
 * reward or an insufficient balance writes nothing to the ledger.
 *
 * @param {object} deps
 * @param {{ append: Function, balance: Function }} deps.ledger
 * @param {string} deps.rewardsFile rewards store path
 * @returns {import('express').Router}
 */
function createEconomyRouter({ ledger, rewardsFile = 'rewards.json' }) {
  const router = express.Router();

  router.get('/balance', (req, res) => {
    res.json({ stars: ledger.balance() });
  });

  router.post('/redemptions', (req, res) => {
    const { rewardId } = req.body || {};
    if (rewardId === undefined || rewardId === null || rewardId === '') {
      return res.status(400).json({ error: 'rewardId is required' });
    }

    const rewards = store.read(rewardsFile, []);
    const reward = rewards.find((r) => String(r.id) === String(rewardId));
    if (!reward) {
      return res.status(404).json({ error: 'reward not found' });
    }

    const balance = ledger.balance();
    if (reward.cost > balance) {
      return res.status(400).json({ error: 'insufficient balance' });
    }

    ledger.append({ delta: -reward.cost, reason: 'redeem', refId: reward.id });
    return res.json({ balance: ledger.balance() });
  });

  return router;
}

module.exports = createEconomyRouter;
module.exports.createEconomyRouter = createEconomyRouter;
