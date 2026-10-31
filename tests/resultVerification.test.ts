import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { compareResultItems, initialComparison, parseResultTime } from '../src/components/ResultVerification';

const item = (name: string, value: string | number, status: 'success' | 'failed' | 'warning' = 'success') => ({ name, value, status });

test('result time filters accept legacy Chinese locale, local ISO and zoned ISO dates', () => {
  const expected = new Date(2026, 9, 31, 19, 5, 2).getTime();
  assert.equal(parseResultTime('2026/10/31 19:05:02'), expected);
  assert.equal(parseResultTime('2026-10-31 19:05:02'), expected);
  assert.equal(parseResultTime('2026-10-31T19:05:02'), expected);
  assert.equal(parseResultTime('2026年10月31日 下午7:05:02'), expected);
  assert.equal(parseResultTime('2026-10-31T11:05:02Z'), Date.parse('2026-10-31T11:05:02Z'));
  assert.equal(parseResultTime('2026-10-31T19:05:02+08:00'), Date.parse('2026-10-31T19:05:02+08:00'));
  assert.ok(Number.isNaN(parseResultTime('2026/02/31 19:05:02')));
  assert.ok(Number.isNaN(parseResultTime('invalid')));
});

test('selected third result stays first and gets a distinct comparison partner', () => {
  const results = [{ id: 'one' }, { id: 'two' }, { id: 'three' }];
  assert.deepEqual(initialComparison(results[2], results).map(result => result.id), ['three', 'one']);
  assert.deepEqual(initialComparison(results[0], [results[0]]), [results[0]]);
});

test('comparison includes union, missing fields, zero values and status-only changes', () => {
  const rows = compareResultItems([
    { items: [item('zero', 0), item('status', 'same'), item('left', 1)] },
    { items: [item('zero', 0), item('status', 'same', 'failed'), item('right', 2)] },
  ]);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].items[0]?.value, 0);
  assert.equal(rows[0].isDifferent, false);
  assert.equal(rows[1].diff, '状态不同');
  assert.equal(rows[2].diff, '测试项缺失');
  assert.equal(rows[3].isDifferent, true);
});

test('numeric deltas use matching units and never treat incompatible fields as comparable', () => {
  const rows = compareResultItems([
    { items: [item('latency', '120ms'), item('memory', '4.2GB'), item('unit', '1ms'), item('baseline', 0)] },
    { items: [item('latency', '115ms'), item('memory', '4.5GB'), item('unit', '1s'), item('baseline', 1)] },
  ]);
  assert.equal(rows[0].diff, '-5ms');
  assert.equal(rows[1].diff, '+0.3GB');
  assert.equal(rows[2].numeric, false);
  assert.equal(rows[3].relative, null);
  assert.equal(compareResultItems([{ items: [] }]).length, 0);
  assert.equal(compareResultItems([{ items: [item('single', 1)] }])[0].isDifferent, false);
});

test('comparison against itself is identical and changed values update calculated differences', () => {
  const a = { items: [item('accuracy', '98.5%'), item('latency', '120ms')] };
  const b = { items: [item('accuracy', '99.2%'), item('latency', '115ms')] };
  assert.equal(compareResultItems([a, a]).filter(row => row.isDifferent).length, 0);
  const differences = compareResultItems([a, b]).filter(row => row.isDifferent);
  assert.equal(differences.length, 2);
  assert.equal(differences[0].delta, 0.7);
});

test('render helpers do not declare conditional hooks; routes follow selected view', () => {
  const source = readFileSync(new URL('../src/components/ResultVerification.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('ResultVerification.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function inspect(node: ts.Node, inRenderHelper = false) {
    const helper = inRenderHelper || (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^render/.test(node.name.text));
    if (helper && ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      assert.equal(/^use[A-Z]/.test(node.expression.text), false, 'conditional render helper must not call hooks');
    }
    ts.forEachChild(node, child => inspect(child, helper));
  }
  inspect(ast);
  assert.match(source, /switch \(view\)/);
  assert.match(source, /case 'compare': return renderCompare\(\)/);
  assert.match(source, /case 'analysis': return renderAnalysis\(\)/);
  assert.match(source, /checked=\{onlyDifferences\}/);
});
