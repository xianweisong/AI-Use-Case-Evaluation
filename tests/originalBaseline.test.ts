import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const baseline = (path: string) => execFileSync('git', ['show', `93aac99:${path}`], { encoding: 'utf8' });
const current = (path: string) => readFileSync(path, 'utf8');
const parse = (text: string) => ts.createSourceFile('source.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function collect(text: string, predicate: (node: ts.Node) => boolean) {
  const source = parse(text), found: string[] = [];
  const visit = (node: ts.Node) => { if (predicate(node)) found.push(node.getText(source)); ts.forEachChild(node, visit); };
  visit(source); return found;
}

test('all original page presentation and unrelated modules remain byte-identical', () => {
  for (const path of ['src/App.tsx', 'src/constants.ts', 'src/components/Layout.tsx',
    'src/components/Workbench.tsx', 'src/components/EvaluationManagement.tsx',
    'src/components/InterfaceEvaluation.tsx', 'src/components/ResourceEvaluation.tsx',
    'src/components/DataProcessing.tsx', 'src/components/SystemManagement.tsx', 'src/index.css', 'index.html', 'public/h3c-favicon.svg']) {
    assert.equal(current(path), baseline(path), path);
  }
});

for (const file of ['DataAnnotation', 'ResultVerification']) {
  const path = `src/components/${file}.tsx`;
  test(`${file}: JSX layout, classes, labels and handlers are unchanged`, () => {
    const jsx = (node: ts.Node) => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node);
    assert.deepEqual(collect(current(path), jsx), collect(baseline(path), jsx));
  });
  test(`${file}: original identified record literals remain unchanged`, () => {
    const record = (node: ts.Node) => ts.isObjectLiteralExpression(node) && node.properties.some(property =>
      ts.isPropertyAssignment(property) && property.name.getText() === 'id' &&
      (ts.isStringLiteral(property.initializer) || ts.isNumericLiteral(property.initializer)));
    assert.deepEqual(collect(current(path), record), collect(baseline(path), record));
  });
}

test('result comparison preserves chosen record and adds a distinct existing partner', () => {
  const source = parse(current('src/components/ResultVerification.tsx'));
  let expression = '';
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'displayList') expression = node.initializer!.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(expression);
  const code = ts.transpile(`globalThis.result = (${expression});`);
  const records = [{id:'first'}, {id:'second'}, {id:'third'}];
  for (const chosen of [[], [records[2]], [records[1], records[2]]]) {
    const context = {compareList:chosen, MOCK_RESULTS:records, result:undefined as any};
    vm.runInNewContext(code, context);
    assert.equal(context.result.length,2);
    assert.equal(context.result[0].id,chosen[0]?.id || 'first');
    assert.notEqual(context.result[0].id,context.result[1].id);
  }
});

test('result compare hooks are unconditional and action views are routed', () => {
  const source = current('src/components/ResultVerification.tsx');
  const render = source.slice(source.indexOf('const renderCompare'),source.indexOf('const renderAnalysis'));
  assert.doesNotMatch(render,/\buse(?:State|Effect|Memo)\s*\(/);
  assert.match(source,/view === 'compare'\) return renderCompare\(\)/);
  assert.match(source,/view === 'analysis'\) return renderAnalysis\(\)/);
});

function annotationStorage(values: Record<string,string> = {}) {
  const source = parse(current('src/components/DataAnnotation.tsx'));
  const selected = new Set(['getSavedData', 'saveChangedData', 'filesForStorage']);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && selected.has(node.name.getText(source))) {
      declarations.push(`globalThis.${node.name.getText(source)} = ${node.initializer!.getText(source)};`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const data = new Map(Object.entries(values));
  const context = {
    storageGuard: {originals:new Map(Object.entries(values)),blocked:new Set(),firstValues:new Map(),backups:new Set()},
    localStorage:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}},
    console:{warn:()=>{},error:()=>{}},showAlert:()=>{},
    getSavedData:undefined as any,saveChangedData:undefined as any,filesForStorage:undefined as any,
  };
  vm.runInNewContext(ts.transpile(declarations.join('\n')),context);
  return {data,context};
}

test('opening original data preserves raw bytes and empty values without writing', () => {
  const raw='[ {"id":101,"name":"原文件","url":"data:image/png;base64,ORIGINAL"} ]';
  const {data,context:c}=annotationStorage({records:raw,empty:'[]',boxes:'{}'});
  const records=c.getSavedData('records',[]);
  c.saveChangedData('records',records);c.saveChangedData('records',records);
  assert.equal(data.get('records'),raw);assert.equal(data.size,3);
  assert.equal(c.getSavedData('empty',[]).length,0);
  assert.equal(Object.keys(c.getSavedData('boxes',null)).length,0);
});

test('actual edits back up raw values and stale-tab writes cannot overwrite newer records', () => {
  const raw='[ {"id":"mine","name":"原记录"} ]';
  const {data,context:c}=annotationStorage({records:raw});
  c.saveChangedData('records',JSON.parse(raw));
  c.saveChangedData('records',[{id:'mine',name:'已修改'}]);
  const backups=[...data].filter(([key])=>key.startsWith('as-eval-original-backup:'));
  assert.equal(backups.length,1);assert.equal(JSON.parse(backups[0][1]).value,raw);
  const concurrent='[{"id":"mine","name":"另一页面修改"},{"id":"new"}]';
  data.set('records',concurrent);c.saveChangedData('records',[]);
  assert.equal(data.get('records'),concurrent);
});

test('malformed data and failed backup are never replaced by fallback lists', () => {
  const {data,context:c}=annotationStorage({records:'invalid-json'});
  assert.equal(c.getSavedData('records',[]).length,0);
  c.saveChangedData('records',[]);c.saveChangedData('records',[{id:'replacement'}]);
  assert.equal(data.get('records'),'invalid-json');
  const {data:other,context:d}=annotationStorage({records:'[]'});
  d.saveChangedData('records',[]);d.localStorage.setItem=()=>{throw new Error('quota')};
  d.saveChangedData('records',[{id:'new'}]);assert.equal(other.get('records'),'[]');
});

test('file serialization retains embedded originals and does not persist temporary Blob URLs', () => {
  const originals=[{id:101,url:'data:image/png;base64,ORIGINAL'},{id:102,url:'blob:old-expired'},{id:103,name:'stored-in-indexeddb'}];
  const {context:c}=annotationStorage({files:JSON.stringify(originals)});
  const files=[originals[0],{id:102,url:'blob:new-decoded'},{id:103,name:'stored-in-indexeddb',url:'blob:new-source'}];
  const serialized=c.filesForStorage('files',files);
  assert.equal(serialized[0].url,originals[0].url);
  assert.equal(serialized[1].url,originals[1].url);
  assert.equal(Object.hasOwn(serialized[2],'url'),false);
});
