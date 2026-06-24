'use strict';

const supabase = require('./supabase');

/**
 * Async data-access layer over Supabase Postgres.
 *
 * Replaces the old file-JSON store. Domain routes use these thin collection
 * helpers instead of talking to the Supabase client directly, so the query
 * shape lives in one place. Every helper returns parsed rows and throws on a
 * Supabase error.
 */

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

module.exports = { list, getById, insert, update, remove };
