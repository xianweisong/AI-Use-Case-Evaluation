import test from 'node:test';
import assert from 'node:assert/strict';
import { planImageNames, type NamingRule } from '../src/lib/dataProcessing.ts';
import { createZip, crc32 } from '../src/lib/zip.ts';
import { PROCESSING_SEEDS } from '../src/lib/processingSeeds.ts';
import { readFileSync } from 'node:fs';

test('all six historical image IDs and names have local decodable SVG sources', () => {
  assert.deepEqual(PROCESSING_SEEDS.map(seed => [seed.id, seed.name]), [
    ['1', 'IMG_20240101_001.jpg'], ['2', 'IMG_20240101_002.jpg'],
    ['3', 'IMG_20240101_003.jpg'], ['4', 'IMG_20240101_004.jpg'],
    ['5', 'IMG_20240101_005.jpg'], ['6', 'IMG_20240101_006.jpg'],
  ]);
  for (const seed of PROCESSING_SEEDS) {
    const svg = readFileSync(new URL(`../public${seed.asset}`, import.meta.url), 'utf8');
    assert.match(svg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /<\/svg>/);
  }
});

const rule: NamingRule = { prefix: '图片_', suffix: '', startNumber: 1, digits: 3, useTimestamp: false, useOriginalName: false, duplicateHandling: 'rename' };
test('preserves multi-dot source names, extension and a frozen timestamp', () => {
  const result = planImageNames([{ id: '1', name: 'scene.part.jpg' }], [], { ...rule, useOriginalName: true, useTimestamp: true }, '20261030');
  assert.equal(result[0].newName, '图片_scene.part20261030001.jpg');
});
test('resolves case-insensitive collisions using each selected duplicate policy', () => {
  const source = { id: '1', name: 'original.jpg' };
  const existing = [source, { id: '2', name: '图片_001.JPG' }, { id: '3', name: '图片_001_1.jpg' }];
  assert.equal(planImageNames([source], existing, rule, '')[0].newName, '图片_001_2.jpg');
  assert.equal(planImageNames([source], existing, { ...rule, duplicateHandling: 'skip' }, '')[0].status, 'error');
  assert.equal(planImageNames([source], existing, { ...rule, duplicateHandling: 'overwrite' }, '')[0].newName, '图片_001.jpg');
});
test('renaming a file to its own name is not a collision', () => {
  const source = { id: '1', name: '图片_001.jpg' };
  assert.equal(planImageNames([source], [source], { ...rule, duplicateHandling: 'skip' }, '')[0].status, 'success');
});
test('a skipped source stays reserved so a later result cannot silently delete it', () => {
  const sources = [{ id: '1', name: '图片_002.jpg' }, { id: '2', name: 'other.jpg' }];
  const results = planImageNames(sources, [...sources, { id: '3', name: '图片_001.jpg' }], { ...rule, duplicateHandling: 'skip' }, '');
  assert.deepEqual(results.map(result => result.status), ['error', 'error']);
});
test('rejects unsafe rules rather than creating invalid archive paths', () => {
  assert.throws(() => planImageNames([], [], { ...rule, prefix: '../' }, ''), /禁用字符/);
  assert.throws(() => planImageNames([], [], { ...rule, startNumber: -1 }, ''), /非负整数/);
  assert.throws(() => planImageNames([{ id: '1', name: 'a.png' }], [], { ...rule, prefix: '长'.repeat(100) }, ''), /255 字节/);
});
test('ZIP local entry, CRC, UTF-8 name, data and central offset match original bytes', async () => {
  const payload = new TextEncoder().encode('123456789');
  assert.equal(crc32(payload), 0xcbf43926);
  const zip = createZip([{ name: '图片.jpg', data: payload }]);
  const bytes = new Uint8Array(await zip.arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint16(6, true), 0x0800);
  const length = view.getUint16(26, true);
  assert.equal(new TextDecoder().decode(bytes.slice(30, 30 + length)), '图片.jpg');
  assert.deepEqual(bytes.slice(30 + length, 30 + length + payload.length), payload);
  assert.equal(view.getUint32(14, true), crc32(payload));
  const central = view.getUint32(bytes.length - 6, true);
  assert.equal(view.getUint32(central, true), 0x02014b50);
  assert.equal(view.getUint32(central + 42, true), 0);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
});
test('ZIP rejects duplicate names, absolute paths and traversal paths', () => {
  const data = new Uint8Array();
  assert.throws(() => createZip([{ name: '../bad', data }]), /无效/);
  assert.throws(() => createZip([{ name: 'a', data }, { name: 'a', data }]), /重复/);
  for (const name of ['/bad', 'a//b', 'a/./b', 'a/../b', 'C:/bad', 'a\\b']) assert.throws(() => createZip([{ name, data }]), /无效/);
});
test('annotation directory paths produce a standard ZIP that Python can actually extract', async () => {
  const { spawnSync } = await import('node:child_process');
  const zip = createZip([
    { name: 'labels/图片.txt', data: new TextEncoder().encode('0 0.5 0.5 1 1') },
    { name: 'images/图片.png', data: new Uint8Array([137, 80, 78, 71]) },
    { name: 'Annotations/图片.xml', data: new TextEncoder().encode('<annotation/>') },
  ]);
  const check = spawnSync('python3', ['-c', 'import sys,io,zipfile,tempfile,pathlib; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None\nwith tempfile.TemporaryDirectory() as d:\n z.extractall(d)\n assert pathlib.Path(d,"labels/图片.txt").read_text()=="0 0.5 0.5 1 1"\n assert pathlib.Path(d,"images/图片.png").read_bytes()==bytes([137,80,78,71])\n assert pathlib.Path(d,"Annotations/图片.xml").read_text()=="<annotation/>"'], { input: Buffer.from(await zip.arrayBuffer()) });
  assert.equal(check.status, 0, check.stderr.toString());
});
