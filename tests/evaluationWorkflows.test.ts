import test from 'node:test';
import assert from 'node:assert/strict';
import { makeReportDocx, makeReportHtml, makeReportLines, parseTaskConfig, taskConcurrency } from '../src/lib/evaluationWorkflows';

test('task config accepts JSON and rejects malformed input', () => {
  assert.equal(parseTaskConfig('{"threshold":0.8}'), true);
  assert.equal(parseTaskConfig('{"threshold":}'), false);
  assert.equal(parseTaskConfig('null'), false);
  assert.equal(parseTaskConfig('4'), false);
  assert.equal(parseTaskConfig('{"threshold":1.1}'), false);
  assert.equal(parseTaskConfig('{"count":2.5}'), false);
  assert.equal(parseTaskConfig('{"concurrency":20}'), true);
});

test('performance list reads configured concurrency without inventing a value', () => {
  assert.equal(taskConcurrency('{"concurrency":12,"count":3}'), 12);
  assert.equal(taskConcurrency('{"count":3}'), undefined);
  assert.equal(taskConcurrency('{"concurrency":0}'), undefined);
  assert.equal(taskConcurrency(), undefined);
});

test('Word report is an OOXML ZIP with escaped selected content', async () => {
  const blob = makeReportDocx({ name: '<车流>', type: '性能测试', template: '简洁版', sections: ['执行统计'] });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  let offset = 0; const files = new Map<string, string>(); const decoder = new TextDecoder();
  while (offset < bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true), nameLength = view.getUint16(offset + 26, true), extraLength = view.getUint16(offset + 28, true);
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength;
    files.set(name, decoder.decode(bytes.subarray(start, start + size)));
    offset = start + size;
  }
  assert.ok(files.has('[Content_Types].xml'));
  assert.ok(files.has('_rels/.rels'));
  assert.match(files.get('word/document.xml') || '', /&lt;车流&gt;/);
  assert.match(files.get('word/document.xml') || '', /执行统计/);
  assert.match(files.get('word/document.xml') || '', /待补充/);
  assert.doesNotMatch(files.get('word/document.xml') || '', /尚无实际测试结果/);
});

test('HTML report records chosen sections without claiming measurements', () => {
  const html = makeReportHtml({ name: '<车辆测试>', type: '接口测试', template: '详细版', sections: ['测试概述', '执行统计'] });
  assert.match(html, /&lt;车辆测试&gt;/);
  assert.match(html, /详细版/);
  assert.match(html, /测试概述/);
  assert.match(html, /执行统计/);
  assert.match(html, /待补充/);
  assert.doesNotMatch(html, /尚无实际测试结果/);
  assert.doesNotMatch(html, /<车辆测试>/);
  assert.doesNotMatch(html, /成功率：\d/);
});

test('report template and selected sections govern detail, with restricted fields omitted', () => {
  const base = { name: '车辆测试', type: '接口测试', target: '/api/vehicle', config: '{"threshold":0.8,"max_iterations":20,"endpoint":"https://internal.test"}', sections: ['测试概述', '详细结果'] };
  const detailed = makeReportLines({ ...base, template: '详细版' }).join('\n');
  const simple = makeReportLines({ ...base, template: '简洁版' }).join('\n');
  assert.match(detailed, /threshold/);
  assert.match(detailed, /max_iterations/);
  assert.doesNotMatch(detailed, /internal\.test|\/api\/vehicle|endpoint/);
  assert.doesNotMatch(simple, /threshold/);
  assert.match(simple, /详细结果/);
  assert.doesNotMatch(simple, /执行统计/);
});
