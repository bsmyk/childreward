'use strict';

const fs = require('fs');
const path = require('path');

const supabase = require('./supabase');

/**
 * Data-access layer.
 *
 * Two coexisting surfaces:
 *  - A file-JSON store (`read`/`write`/`resolvePath`/`DATA_DIR`) used by the
 *    ledger and the todos/rewards/economy routes for local persistence.
 *  - An async Supabase collection helper set (`list`/`getById`/`insert`/
 *    `update`/`remove`) for the Postgres-backed migration in progress.
 *
 * Both are exported from this single module so callers have one import for
 * persistence regardless of backend.
 */

// --- File-JSON store -------------------------------------------------------

// Default data location: a `data/` dir at the repo root.
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

/**
 * Resolve a store path. Bare filenames land in the default data/ directory;
 * absolute or explicitly-relative paths are honored as given.
 *
 * @param {string} file
 * @returns {string} absolute-ish path to the JSON file
 */
function resolvePath(file) {
  if (path.isAbsolute(file) || file.includes(path.sep)) {
    return file;
  }
  return path.join(DATA_DIR, file);
}

/**
 * Read and parse JSON from `file`. Returns `defaultValue` when the file does
 * not exist yet.
 *
 * @param {string} file
 * @param {*} [defaultValue=[]] value returned when the file is absent
 * @returns {*} parsed JSON, or the default
 */
function read(file, defaultValue = []) {
  const target = resolvePath(file);
  if (!fs.existsSync(target)) {
    return defaultValue;
  }
  const raw = fs.readFileSync(target, 'utf8');
  return JSON.parse(raw);
}

/**
 * Serialize `data` as JSON to `file`, creating the parent directory if needed.
 *
 * @param {string} file
 * @param {*} data JSON-serializable value
 */
function write(file, data) {
  const target = resolvePath(file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(data, null, 2), 'utf8');
}

// --- Supabase collection helpers ------------------------------------------

/**
 * Throw a descriptive Error when Supabase reports a problem.
 *
 * @param {{message?: string}|null} error Supabase error object
 * @param {string} context human-readable operation description
 */
function assertOk(error, context) {
  if (error) {
    throw new Error(`Supabase ${context} failed: ${error.message || error}`);
  }
}

/**
 * List rows from `table`, optionally narrowed by an equality `filter`.
 *
 * @param {string} table
 * @param {Object<string, *>} [filter={}] column → value equality filters
 * @returns {Promise<Array>} matching rows (empty array when none)
 */
async function list(table, filter = {}) {
  let query = supabase.from(table).select('*');
  for (const [column, value] of Object.entries(filter)) {
    query = query.eq(column, value);
  }
  const { data, error } = await query;
  assertOk(error, `list(${table})`);
  return data || [];
}

/**
 * Fetch a single row by primary key.
 *
 * @param {string} table
 * @param {string} id
 * @returns {Promise<Object|null>} the row, or null when not found
 */
async function getById(table, id) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  assertOk(error, `getById(${table}, ${id})`);
  return data || null;
}

/**
 * Insert a row and return the persisted record.
 *
 * @param {string} table
 * @param {Object} row
 * @returns {Promise<Object>} the inserted row
 */
async function insert(table, row) {
  const { data, error } = await supabase
    .from(table)
    .insert(row)
    .select()
    .single();
  assertOk(error, `insert(${table})`);
  return data;
}

/**
 * Apply `changes` to the row with the given id and return the updated record.
 *
 * @param {string} table
 * @param {string} id
 * @param {Object} changes
 * @returns {Promise<Object>} the updated row
 */
async function update(table, id, changes) {
  const { data, error } = await supabase
    .from(table)
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  assertOk(error, `update(${table}, ${id})`);
  return data;
}

/**
 * Delete the row with the given id.
 *
 * @param {string} table
 * @param {string} id
 * @returns {Promise<void>}
 */
async function remove(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  assertOk(error, `remove(${table}, ${id})`);
}

module.exports = {
  read,
  write,
  resolvePath,
  DATA_DIR,
  list,
  getById,
  insert,
  update,
  remove,
};
