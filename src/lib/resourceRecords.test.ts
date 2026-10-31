import test from 'node:test';
import assert from 'node:assert/strict';
import { isResourceRecords, resourcePoint, resourceValue } from './resourceRecords';

test('resource record validation and missing values', () => {
  assert.equal(isResourceRecords([{id:'1', name:'local', node:'服务器', source:'local'}]), true);
  assert.equal(isResourceRecords([{id:'1', name:'seed', node:'服务器', source:'seed'}]), false);
  assert.equal(resourceValue(null), '待补充');
  assert.equal(resourceValue('0%'), '0%');
});

test('single recorded point does not fabricate a time series', () => {
  const point = resourcePoint({id:'1', name:'task', node:'本机', cpu:'0%', mem:null, gpu:'28%', duration:null, frameDrop:'0.42%', time:'2026-10-31 12:00', source:'local'});
  assert.equal(point.cpu, 0);
  assert.equal(point.memory, null);
  assert.equal(point.frameDrop, 0.42);
});
