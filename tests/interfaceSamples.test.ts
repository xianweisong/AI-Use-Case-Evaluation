import assert from 'node:assert/strict';
import test from 'node:test';
import { createInterfaceSample, runInterfaceSample, compareVersionSamples, matchesInterfaceReport } from '../src/lib/interfaceSamples';
import { resourceSample, sampleCycleMs } from '../src/components/ResourceEvaluation';
import { localReportsToResults } from '../src/components/ResultVerification';

test('HTTP, WS and gRPC execute distinct offline fixture assertions without network', () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (() => { throw new Error('network forbidden'); }) as typeof fetch;
  try {
    for (const protocol of ['HTTP', 'WS', 'gRPC'] as const) {
      const result = runInterfaceSample(createInterfaceSample(protocol));
      assert.equal(result.mode, 'local-sample');
      assert.equal(result.failed, 0);
      assert.ok(result.checks.some(check => check.item.startsWith(`${protocol}样例`)));
      assert.equal(result.passed, result.checks.length);
    }
  } finally { globalThis.fetch = oldFetch; }
});

test('real targets and unbounded repeats are blocked before execution', () => {
  const config = createInterfaceSample();
  assert.throws(() => runInterfaceSample({ ...config, address: 'https://example.com' }), /不会发送请求/);
  assert.throws(() => runInterfaceSample({ ...config, repeat: 101 }), /1–100/);
  assert.throws(() => runInterfaceSample({ ...config, timeout: 0 }), /无效/);
});

test('bad status, malformed body and changed proto produce actual failed checks', () => {
  assert.ok(runInterfaceSample({ ...createInterfaceSample(), expectedStatus: '404' }).failed > 0);
  assert.ok(runInterfaceSample({ ...createInterfaceSample('WS'), body: '{invalid' }).failed > 0);
  assert.ok(runInterfaceSample({ ...createInterfaceSample('gRPC'), service: 'MissingService' }).failed > 0);
});

test('current interface status only accepts reports with matching full config snapshots', () => {
  const config = createInterfaceSample();
  const report = { taskId: config.id, run: runInterfaceSample(config), sampleConfig: { ...config, url: config.address, status: 'none', time: 'list decoration' } };
  assert.equal(matchesInterfaceReport(report, config), true);
  assert.equal(matchesInterfaceReport(report, { ...config, body: '{"image_base64":"changed"}' }), false);
  assert.equal(matchesInterfaceReport(report, { ...config, expectedStatus: '404' }), false);
  assert.equal(matchesInterfaceReport(report, { ...config, headers: [{ key: 'x-test', value: 'different' }] }), false);
  assert.equal(matchesInterfaceReport({ ...report, sampleConfig: undefined }, config), false);
  assert.equal(matchesInterfaceReport({ ...report, sampleConfig: { ...config, headers: [null] } }, config), false);
});

test('resource profiles and cycle controls are deterministic', () => {
  assert.deepEqual(resourceSample(30, 1), resourceSample(30, 1));
  assert.notDeepEqual(resourceSample(30, 1), resourceSample(30, 3));
  assert.equal(sampleCycleMs('1s'), 1000);
  assert.equal(sampleCycleMs('60s'), 60000);
  assert.equal(sampleCycleMs('bad'), 5000);
});

test('version sample selections calculate actual schema changes', () => {
  const v13 = compareVersionSamples('v1.2.0', 'v1.3.0');
  const v14 = compareVersionSamples('v1.2.0', 'v1.4.0-beta');
  assert.equal(v13.length, 4);
  assert.equal(v14.length, 5);
  assert.equal(compareVersionSamples('v1.2.0', 'v1.2.0').length, 0);
});

test('platform reports map actual local checks into selectable results', () => {
  const run = runInterfaceSample({ ...createInterfaceSample(), expectedStatus: '404' });
  const results = localReportsToResults([{ id: 'REP-1', taskId: 'sample-HTTP', name: '离线测试', type: '接口测试', time: '2026-10-31 12:00:00', run }]);
  assert.equal(results.length, 1);
  assert.equal(results[0].status, 'failed');
  assert.ok(results[0].name.includes('本地样例'));
  assert.equal(results[0].items.length, run.checks.length + 1);
  assert.equal(localReportsToResults([{}, { id: 'bad', run: { mode: 'remote' } }]).length, 0);
});
