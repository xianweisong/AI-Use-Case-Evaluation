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

test('navigation, global styling and brand assets remain byte-identical', () => {
  for (const path of ['src/constants.ts', 'src/index.css', 'index.html', 'public/h3c-favicon.svg']) {
    assert.equal(current(path), baseline(path), path);
  }
});

for (const file of ['DataAnnotation', 'ResultVerification', 'EvaluationManagement', 'InterfaceEvaluation', 'ResourceEvaluation', 'DataProcessing', 'SystemManagement', 'Workbench', 'Layout']) {
  const path = `src/components/${file}.tsx`;
  test(`${file}: established CSS vocabulary is retained while handlers may change`, () => {
    const classes = (node: ts.Node) => ts.isJsxAttribute(node) && node.name.getText() === 'className' && !!node.initializer && ts.isStringLiteral(node.initializer);
    const now = current(path);
    for(const value of new Set(collect(baseline(path), classes))) {
      // Appending disabled-state classes or moving a literal into cn() is not a redesign.
      const css = value.slice('className="'.length,-1);
      if(file === 'DataAnnotation' && css === 'p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 rounded-lg') {
        // The formerly always-selected video tool now uses the same colors conditionally.
        assert.ok(now.includes('cn("p-2 rounded-lg", tool ==='));
        assert.ok(now.includes('"bg-blue-50 text-blue-600 dark:bg-blue-900/30"'));
        continue;
      }
      // A retry control should only show its disabled cursor while it is actually disabled.
      const conditionalCursor = css.includes('cursor-not-allowed') && now.includes(css.replace('cursor-not-allowed', 'disabled:cursor-not-allowed'));
      assert.ok(now.includes(css) || conditionalCursor, `${file}: removed original styling ${value}`);
    }
  });
  test(`${file}: original identified record literals remain unchanged`, () => {
    const inExport = (node: ts.Node): boolean => {
      let parent: ts.Node | undefined = node;
      while(parent) { if(ts.isVariableDeclaration(parent) && parent.name.getText() === 'ExportDatasetModal') return true; parent=parent.parent; }
      return false;
    };
    // ExportDatasetModal used to fabricate unrelated COCO examples; those are output fixtures, not stored user records.
    const record = (node: ts.Node) => !inExport(node) && ts.isObjectLiteralExpression(node) && node.properties.some(property =>
      ts.isPropertyAssignment(property) && property.name.getText() === 'id' &&
      (ts.isStringLiteral(property.initializer) || ts.isNumericLiteral(property.initializer)));
    const literals = collect(current(path), record).map(s => s.replace(/\s/g,''));
    for(const literal of collect(baseline(path), record)) assert.ok(literals.includes(literal.replace(/\s/g,'')), `${file}: original record changed ${literal}`);
  });
}

test('result comparison preserves explicit selection without silently adding an unchosen record', () => {
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
    const context = {compareList:chosen, compareTouched:chosen.length > 0, MOCK_RESULTS:records, result:undefined as any};
    vm.runInNewContext(code, context);
    assert.equal(context.result.length,chosen.length || 2);
    assert.equal(context.result[0].id,chosen[0]?.id || 'first');
    if(context.result.length > 1) assert.notEqual(context.result[0].id,context.result[1].id);
  }
  const empty = {compareList:[], compareTouched:true, MOCK_RESULTS:records, result:undefined as any};
  vm.runInNewContext(code,empty);assert.equal(empty.result.length,0);
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
  const {data:flags,context:f}=annotationStorage({flags:'null'});
  assert.equal(Object.keys(f.getSavedData('flags',{})).length,0);
  f.saveChangedData('flags',{changed:true});assert.equal(flags.get('flags'),'null');
});

test('new video generations use immutable frame ids while original seed keys remain readable', () => {
  const source=parse(current('src/components/DataAnnotation.tsx')); let expression='';
  const visit=(node:ts.Node)=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='videoAnnotationKey') expression=node.initializer!.getText(source);ts.forEachChild(node,visit);};
  visit(source);assert.ok(expression);
  const c={key:undefined as any};vm.runInNewContext(ts.transpile(`globalThis.key=${expression}`),c);
  assert.equal(c.key({id:1},0),'vid_1_0');
  const first=c.key({id:5,frames:[{id:'generation-a'}]},0),second=c.key({id:5,frames:[{id:'generation-b'}]},0);
  assert.notEqual(first,second);assert.match(first,/generation-a/);
});

test('video editor metrics count only current frames and retain legacy file-count semantics', () => {
  const source=parse(current('src/components/DataAnnotation.tsx'));
  let key='',stats='';
  const visit=(node:ts.Node)=>{
    if(ts.isVariableDeclaration(node)) {
      if(node.name.getText(source)==='videoAnnotationKey') key=node.initializer!.getText(source);
      if(node.name.getText(source)==='videoEditorStats' && node.initializer && ts.isCallExpression(node.initializer)) stats=node.initializer.arguments[0].getText(source);
    }
    ts.forEachChild(node,visit);
  };
  visit(source);assert.ok(key&&stats);
  const c={selectedVideo:{id:'v',frames:[{id:'a'},{id:'b'}]} as any,annotations:{vid_v_a:[{}],vid_v_old:[{}]},currentTaskFiles:[{status:'completed'},{status:'pending'},{status:'completed'}],result:undefined as any};
  const evaluate=()=>vm.runInNewContext(ts.transpile(`var videoAnnotationKey=${key};globalThis.result=(${stats})();`),c);
  evaluate();assert.equal(JSON.stringify(c.result),JSON.stringify({total:2,completed:1,pending:1,progress:50}));
  c.selectedVideo={id:'v',frames:[{id:'new-a'},{id:'new-b'}]};evaluate();assert.equal(c.result.completed,0);assert.equal(c.result.pending,2);
  c.selectedVideo={id:1};evaluate();assert.equal(JSON.stringify(c.result),JSON.stringify({total:3,completed:2,pending:1,progress:67}));
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
