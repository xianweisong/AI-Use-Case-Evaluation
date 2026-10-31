import test from 'node:test';
import assert from 'node:assert/strict';
import { createId } from './id';

test('record IDs use native randomUUID when available', () => {
  const expected='12345678-1234-4321-8123-123456789abc';
  assert.equal(createId({randomUUID:()=>expected,getRandomValues:()=>{throw Error('unexpected fallback');}} as any),expected);
});

test('HTTP intranet fallback generates valid distinct UUIDs without randomUUID', () => {
  const random={getRandomValues:globalThis.crypto.getRandomValues.bind(globalThis.crypto)};
  const ids=Array.from({length:500},()=>createId(random));
  for(const id of ids) assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(new Set(ids).size,ids.length);
});

test('unavailable browser randomness fails explicitly instead of creating duplicate IDs', () => {
  assert.throws(()=>createId({} as any),/记录编号/);
});
