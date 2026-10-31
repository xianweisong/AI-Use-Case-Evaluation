import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskInput, compareSampleResponses } from '../src/lib/taskConfig';
import { runLocalEvaluation } from '../src/lib/localEvaluation';
import { buildReportHtml } from '../src/lib/reportExport';

test('task configuration is retained and rejects non-object JSON', () => {
  assert.equal(createTaskInput({name:' test ',type:'接口测试',target:' sample ',config:'{"expectedStatus":400}'}).config, '{"expectedStatus":400}');
  for (const config of ['[]', 'null', '{bad']) assert.throws(() => createTaskInput({name:'t',type:'x',target:'t',config}));
});
test('sample assertions really distinguish pass and fail without any network', () => {
  const pass = runLocalEvaluation({type:'接口测试'});
  const fail = runLocalEvaluation({type:'接口测试',config:'{"expectedStatus":500}'});
  assert.equal(pass.mode, 'local-sample'); assert.equal(pass.passed, 3);
  assert.equal(fail.failed, 1); assert.equal(fail.checks[0].result,'failed');
});
test('local performance work is bounded and measures its own execution', () => {
  assert.throws(()=>runLocalEvaluation({type:'性能测试',config:'{"iterations":10001}'}));
  const r = runLocalEvaluation({type:'性能测试',config:'{"iterations":10}'});
  assert.equal(r.passed,1); assert.ok(r.durationMs >= 0);
});
test('reports escape imported content and respect selected sections', () => {
  const r = {name:'<script>alert(1)</script>',run:{passed:1,failed:0,checks:[{item:'A',result:'success',cost:'1ms',error:'-'}]}};
  const html = buildReportHtml([r],['results'],'simple');
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('<td>A</td>')); assert.ok(!html.includes('通过 1 项'));
});
test('version comparison calculates additions deletions and nested value changes', () => {
  const diff = compareSampleResponses({data:{id:0, old:true}}, {data:{id:1, fresh:false}});
  assert.deepEqual(diff.map(d => d.type).sort(), ['added','deleted','modified']);
  assert.deepEqual(compareSampleResponses({a:[]}, {a:[]}), []);
  assert.equal(compareSampleResponses({'a.b':1}, {a:{b:1}}).length, 2);
});
test('deep valid JSON is rejected before rendering or executing', () => {
  const config = '{"x":'.repeat(5000) + '0' + '}'.repeat(5000);
  assert.throws(() => createTaskInput({name:'deep',type:'接口测试',target:'local',config}), /过于复杂/);
  assert.throws(() => compareSampleResponses(JSON.parse(config), {}), /过于复杂/);
});
