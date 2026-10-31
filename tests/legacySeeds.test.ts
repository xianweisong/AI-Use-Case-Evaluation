import test from 'node:test';
import assert from 'node:assert/strict';
import { originalEvaluationTasks, originalEvaluationReports, originalWorkbenchTasks } from '../src/lib/evaluationSeeds';
import { originalInterfaceSamples } from '../src/lib/interfaceSeeds';
import { validateInterfaceConfig } from '../src/lib/interfaceSamples';

test('restores original evaluation task, report and category records without changing historical statuses', () => {
  const tasks = originalEvaluationTasks();
  assert.equal(tasks.length, 10);
  assert.deepEqual(tasks.slice(0, 4).map(item => [item.id, item.status]), [
    ['TASK-001', 'completed'], ['TASK-002', 'running'], ['TASK-003', 'failed'], ['TASK-004', 'pending'],
  ]);
  assert.deepEqual(tasks.slice(4).map(item => item.id).sort(), ['REP-001', 'REP-002', 'REP-003', 'REP-004', 'REP-005', 'REP-006']);
  assert.equal(originalEvaluationReports().length, 6);
  assert.deepEqual(originalWorkbenchTasks().map(item => item.id), ['T-1024', 'T-1023', 'T-1022', 'T-1021']);
  assert.ok(tasks.every(item => item.sample));
});

test('restored API, version and protocol fixtures remain local-only executable samples', () => {
  const samples = originalInterfaceSamples();
  assert.deepEqual(['api', 'version', 'protocol'].map(group => samples.filter(item => item.legacyGroup === group).length), [3, 2, 4]);
  assert.deepEqual(samples.filter(item => item.legacyGroup === 'api').map(item => item.legacyStatus), ['success', 'failed', 'none']);
  for (const item of samples) {
    assert.doesNotThrow(() => validateInterfaceConfig(item));
    assert.ok(item.address.startsWith('sample://'));
    assert.equal(item.sample, true);
  }
  assert.equal(samples[0].legacyUrl, '/api/v1/face/detect');
});
