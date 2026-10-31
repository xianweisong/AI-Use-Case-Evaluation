import test from 'node:test';
import assert from 'node:assert/strict';
import { backupLocalValues, mergeSeedRecords, migrateSeedArray, createGuardedStorageWriter } from '../src/lib/seedMigration';

function storage(values: Record<string, string> = {}) {
  const data = new Map(Object.entries(values));
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, String(value)),
  }});
  return data;
}
test('restoration appends missing examples and preserves every existing record, including orphan metadata', () => {
  const existing = [{id:'a',name:'用户改过的记录',extra:42}, {name:'旧版无ID记录'}];
  const result = mergeSeedRecords<{id?: string; name: string; extra?: number}>(existing, [{id:'a',name:'原始示例'}, {id:'b',name:'补回示例'}], 'id');
  assert.equal(result[0],existing[0]); assert.equal(result[1],existing[1]); assert.equal(result.length,3);
});
test('migration backs up exact original bytes and does not resurrect examples deleted after restoration', () => {
  const raw = '[ {"id":"mine","note":"用户原数据"} ]';
  const data = storage({records: raw});
  const seeds = [{id:'seed',note:'示例'}];
  assert.equal(migrateSeedArray('records',seeds,'id','restore1').length,2);
  assert.equal(JSON.parse(data.get('platform-data-backup:restore1:records')!).value,raw);
  data.set('records','[]');
  assert.deepEqual(migrateSeedArray('records',seeds,'id','restore1'),[]);
  assert.equal(JSON.parse(data.get('platform-data-backup:restore1:records')!).value,raw);
});
test('backup failure and malformed storage never overwrite original data', () => {
  const data = storage({records:'not-json'});
  assert.throws(()=>migrateSeedArray('records',[{id:1}],'id','x'));
  assert.equal(data.get('records'),'not-json');
  const original='[{"id":"mine"}]'; data.set('records',original);
  globalThis.localStorage.setItem=()=>{throw new Error('quota');};
  assert.throws(()=>migrateSeedArray('records',[{id:1}],'id','x'),/quota/);
  assert.equal(data.get('records'),original);
});
test('backup preserves absent values without treating them as empty arrays', () => {
  const data = storage(); backupLocalValues(['missing'],'x');
  assert.equal(JSON.parse(data.get('platform-data-backup:x:missing')!).value,null);
});

test('stale-tab whole-array writes are refused without deleting concurrent records', () => {
  const data = storage({records:'[{"id":"a"}]'});
  Object.defineProperty(globalThis, 'window', {configurable:true, value:{dispatchEvent:()=>true}});
  const save = createGuardedStorageWriter(['records']);
  save('records', [{id:'a',note:'updated'}]);
  const concurrent='[{"id":"a","note":"other-tab"},{"id":"b"}]';
  data.set('records',concurrent);
  assert.throws(()=>save('records',[{id:'a',note:'stale'}]),/其他页面/);
  assert.equal(data.get('records'),concurrent);
});
