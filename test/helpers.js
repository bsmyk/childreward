'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const createApp = require('../src/app');

/**
 * Create an app backed by a fresh temp data dir, isolating persistence per
 * test. Returns the app plus the dir and a cleanup function.
 *
 * @returns {{ app: import('express').Express, dataDir: string, cleanup: Function }}
 */
function makeApp() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reward-test-'));
  const app = createApp({ dataDir });
  const cleanup = () => fs.rmSync(dataDir, { recursive: true, force: true });
  return { app, dataDir, cleanup };
}

module.exports = { makeApp };
