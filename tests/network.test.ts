import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  resolveNetwork,
  isNetworkId,
  getOrCreateSeed,
  recordDeployment,
  getDeployment,
  setActiveNetwork,
  NETWORK_IDS,
} from '../src/network';

function tmpCwd(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aec-test-'));
}

test('isNetworkId accepts known networks and rejects others', () => {
  for (const id of NETWORK_IDS) {
    assert.equal(isNetworkId(id), true);
  }
  assert.equal(isNetworkId('prepro'), false);
  assert.equal(isNetworkId('mainnet'), false);
  assert.equal(isNetworkId(42), false);
});

test('resolveNetwork honors the --network flag', () => {
  const cwd = tmpCwd();
  const r = resolveNetwork({ argv: ['node', 'script', '--network', 'preprod'], env: {}, cwd });
  assert.equal(r.network, 'preprod');
  assert.equal(r.source, 'flag');
  assert.equal(r.config.networkId, 'preprod');
});

test('resolveNetwork defaults to undeployed with no flag or state', () => {
  const cwd = tmpCwd();
  const r = resolveNetwork({ argv: ['node', 'script'], env: {}, cwd });
  assert.equal(r.network, 'undeployed');
  assert.equal(r.source, 'default');
});

test('resolveNetwork applies environment endpoint overrides', () => {
  const cwd = tmpCwd();
  const r = resolveNetwork({
    argv: ['node', 'script', '--network', 'preview'],
    env: { MIDNIGHT_INDEXER_URL: 'https://example.test/graphql' },
    cwd,
  });
  assert.equal(r.config.indexer, 'https://example.test/graphql');
});

test('seed is generated once per network then reused (persistence round-trip)', () => {
  const cwd = tmpCwd();
  const first = getOrCreateSeed('preprod', { env: {}, cwd });
  const second = getOrCreateSeed('preprod', { env: {}, cwd });
  assert.equal(first, second, 'second call must reuse the persisted seed');
  assert.match(first, /^[0-9a-f]{64}$/, 'seed is 32-byte hex');
});

test('deployment records round-trip through the state file', () => {
  const cwd = tmpCwd();
  setActiveNetwork('preprod', { cwd });
  assert.equal(getDeployment('preprod', { cwd }), null);

  recordDeployment('preprod', 'deadbeef00', 'mn_addr_test', { cwd });
  const dep = getDeployment('preprod', { cwd });
  assert.ok(dep);
  assert.equal(dep!.address, 'deadbeef00');
  assert.equal(dep!.deployer, 'mn_addr_test');
});
