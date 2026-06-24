'use strict';

const fs = require('fs');
const path = require('path');

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

module.exports = { read, write, resolvePath, DATA_DIR };
