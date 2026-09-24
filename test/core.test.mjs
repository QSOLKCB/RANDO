import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, normalizeSeed, seedHash, VERSION } from '../core.mjs';

test('same seed yields an identical, explicit proposal', () => {
  const first = makeCard('  rando-001  ');
  assert.deepEqual(first, makeCard('rando-001'));
  assert.equal(first.version, VERSION);
  assert.equal(first.status, 'proposed / untested');
  assert.match(first.id, /^RANDO-[A-F0-9]{8}$/);
  assert.ok(first.question.includes(first.ingredients.domain));
  assert.ok(first.falsifier.includes(first.ingredients.failure));
});

test('hash uses UTF-8 bytes and distinguishes a changed seed', () => {
  assert.equal(seedHash('hello'), 0x4f9f2cab);
  assert.notDeepEqual(makeCard('rando-001'), makeCard('rando-002'));
  assert.notEqual(seedHash('é'), seedHash('e'));
});

test('empty and oversized seeds are rejected', () => {
  assert.throws(() => normalizeSeed('  '), RangeError);
  assert.throws(() => normalizeSeed('x'.repeat(81)), RangeError);
  assert.throws(() => normalizeSeed(null), TypeError);
});
