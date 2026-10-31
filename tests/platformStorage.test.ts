import test from 'node:test';
import assert from 'node:assert/strict';
import {createModuleStore} from '../src/lib/platformStorage';
function setup(entries: Record<string,string> = {}) {
  const data = new Map(Object.entries(entries));
  Object.assign(globalThis,{localStorage:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)},window:{dispatchEvent:()=>true},CustomEvent:class{}});
  return data;
}
test('store does not write on read, preserves intentional empty records, backs up before mutation',()=>{
  const data=setup({records:' [ ] '}); const store=createModuleStore('records',[{id:1}]);
  assert.deepEqual(store.initial,[]); store.save([]); assert.equal(data.get('records'),' [ ] ');
  store.save([{id:2}]); assert.equal(data.size,2);
  assert.equal(JSON.parse([...data].find(([key])=>key.startsWith('as-eval-original-backup:'))![1]).value,' [ ] ');
});
test('malformed, stale-tab and quota errors never overwrite previous records',()=>{
  let data=setup({records:'invalid'}); let store=createModuleStore('records',[{id:1}]);
  assert.throws(()=>store.save([{id:2}])); assert.equal(data.get('records'),'invalid');
  data=setup({records:'[]'}); store=createModuleStore('records',[{id:1}]); data.set('records','[{"id":3}]');
  assert.throws(()=>store.save([{id:2}])); assert.equal(data.get('records'),'[{"id":3}]');
  assert.throws(()=>store.save([]), /其他页面/);
  data=setup({records:'[]'}); store=createModuleStore('records',[{id:1}]); globalThis.localStorage.setItem=()=>{throw new Error('quota');};
  assert.throws(()=>store.save([{id:2}])); assert.equal(data.get('records'),'[]');
});
