import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// These tests assert the *privacy contract* of the compiled artifact: the
// public ledger exposes only eventName + checkInCount, the private invite
// secret is never a ledger field, and no witness leaks attendee data.
//
// They run against contracts/managed/event-checkin (produced by `npm run compile`).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const infoPath = path.resolve(
  __dirname,
  '..',
  'contracts',
  'managed',
  'event-checkin',
  'compiler',
  'contract-info.json',
);

function loadInfo(): any {
  if (!fs.existsSync(infoPath)) {
    throw new Error(
      `Compiled contract-info.json not found at ${infoPath}. Run \`npm run compile\` first.`,
    );
  }
  return JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
}

test('compiled with the expected Compact compiler version', () => {
  const info = loadInfo();
  assert.equal(info['compiler-version'], '0.31.1');
});

test('public ledger exposes only eventName and checkInCount', () => {
  const info = loadInfo();
  const ledgerNames = (info.ledger as Array<{ name: string; storage: string }>)
    .map((l) => l.name)
    .sort();
  assert.deepEqual(ledgerNames, ['checkInCount', 'eventName']);

  const byName = Object.fromEntries(
    (info.ledger as Array<{ name: string; storage: string }>).map((l) => [l.name, l]),
  );
  assert.equal(byName.checkInCount.storage, 'Counter');
  // The invite secret must never appear on the public ledger.
  assert.equal(ledgerNames.includes('inviteSecret'), false);
});

test('checkIn circuit takes an opaque secret and produces a proof', () => {
  const info = loadInfo();
  const checkIn = (info.circuits as Array<any>).find((c) => c.name === 'checkIn');
  assert.ok(checkIn, 'checkIn circuit must exist');
  assert.equal(checkIn.proof, true, 'checkIn must be a proving circuit');
  assert.equal(checkIn.arguments.length, 1);
  assert.equal(checkIn.arguments[0].name, 'inviteSecret');
  assert.equal(checkIn.arguments[0].type['type-name'], 'Opaque');
});

test('no witnesses are declared (nothing private is persisted off-secret)', () => {
  const info = loadInfo();
  assert.deepEqual(info.witnesses, []);
});
