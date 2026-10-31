import test from 'node:test';
import assert from 'node:assert/strict';
import { resultRows, resultAnalysis, numericDifference, csvCell } from './resultAnalysis';

test('comparison includes every item and preserves zero and missing', () => {
  const a = { id: 'a', name: 'A', items: [{name: 'zero', value: 0, status: 'success'}, {name: 'only-a', value: '1ms', status: 'success'}] };
  const b = { id: 'b', name: 'B', items: [{name: 'zero', value: 0, status: 'success'}, {name: 'only-b', value: '2ms', status: 'failed'}] };
  const rows = resultRows([a, b]);
  assert.deepEqual(rows.map(row => row.name), ['zero', 'only-a', 'only-b']);
  assert.equal(rows[0].different, false);
  assert.equal(rows[0].items[0]?.value, 0);
  assert.equal(resultAnalysis(a, b).differences.length, 2);
});

test('numeric differences require compatible units', () => {
  assert.equal(numericDifference('120ms', '115ms')?.label, '-5ms');
  assert.equal(numericDifference('0%', '1.5%')?.label, '+1.5%');
  assert.equal(numericDifference('1ms', '2%'), null);
});

test('analysis normalizes unlike units to relative percentages and recognizes status-only change', () => {
  const a = { id: 'a', name: 'A', items: [{name: 'latency', value: '120ms', status: 'success'}, {name: 'rate', value: '98%', status: 'success'}, {name: 'zero', value: 0, status: 'success'}] };
  const b = { id: 'b', name: 'B', items: [{name: 'latency', value: '115ms', status: 'success'}, {name: 'rate', value: '99%', status: 'success'}, {name: 'zero', value: 0, status: 'failed'}] };
  const analysis = resultAnalysis(a, b);
  assert.equal(analysis.rate, 100);
  assert.equal(analysis.maxLabel, '4.17%');
  assert.equal(analysis.averageLabel, '2.59%');
  assert.equal(analysis.differences.find(row => row.name === 'zero')?.label, '状态差异');
  assert.deepEqual(analysis.distribution.map(item => item.value), [2, 1, 0, 0]);
});

test('CSV cells escape quotes and neutralize spreadsheet formulas', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('  +1'), '"\'  +1"');
  assert.equal(csvCell('safe'), '"safe"');
});
