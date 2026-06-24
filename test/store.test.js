'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const store = require('../src/lib/store');

describe('store (file-based JSON persistence)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'store-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns the default when the file does not exist', () => {
    const file = path.join(tmpDir, 'missing.json');
    expect(store.read(file)).toEqual([]);
    expect(store.read(file, {})).toEqual({});
  });

  it('creates the parent directory on first write', () => {
    const file = path.join(tmpDir, 'nested', 'deep', 'data.json');
    expect(fs.existsSync(path.dirname(file))).toBe(false);

    store.write(file, { a: 1 });

    expect(fs.existsSync(file)).toBe(true);
  });

  it('round-trips data across simulated process restarts', () => {
    const file = path.join(tmpDir, 'items.json');
    const data = [{ id: 1, name: 'alpha' }, { id: 2, name: 'beta' }];

    store.write(file, data);

    // Fresh require to simulate a new process reading from disk.
    jest.resetModules();
    const reloaded = require('../src/lib/store');
    expect(reloaded.read(file)).toEqual(data);
  });
});
