'use strict';

const path = require('path');

const store = require('./store');

/**
 * Create a star ledger backed by a single JSON file.
 *
 * The ledger is append-only: every mutation is a signed `delta` entry. The
 * balance is *derived* (the integer sum of all deltas) and is never stored as a
 * mutable counter. This is the only place a balance is computed.
 *
 * @param {string} [file='ledger.json'] store path (bare filename → default
 *   data dir; absolute/explicitly-relative path honored as given)
 * @returns {{ append: Function, entries: Function, balance: Function }}
 */
function createLedger(file = 'ledger.json') {
  /** @returns {Array<object>} all ledger entries (empty when absent) */
  function entries() {
    return store.read(file, []);
  }

  /**
   * Append one signed entry. Assigns a monotonically increasing `id` and a
   * timestamp. Returns the persisted entry.
   *
   * @param {{ delta: number, reason?: string, refId?: * }} entry
   * @returns {object} the appended entry
   */
  function append({ delta, reason = null, refId = null } = {}) {
    const all = entries();
    const nextId =
      all.reduce((max, e) => (e.id > max ? e.id : max), 0) + 1;
    const record = {
      id: nextId,
      delta,
      reason,
      refId,
      ts: new Date().toISOString(),
    };
    all.push(record);
    store.write(file, all);
    return record;
  }

  /** @returns {number} integer sum of all entry deltas (0 when empty) */
  function balance() {
    return entries().reduce((sum, e) => sum + (e.delta || 0), 0);
  }

  return { append, entries, balance, file };
}

module.exports = createLedger;
module.exports.createLedger = createLedger;
