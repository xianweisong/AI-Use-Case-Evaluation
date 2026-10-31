import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnnotationEntries, clippedBoxes, editorSize, selectDatasetImages, createLocalId, restoreLocalSource, type ExportImage } from '../src/lib/annotationExport.ts';
import { createZip } from '../src/lib/zip.ts';

const image: ExportImage = { id: 10, name: 'sample.png', width: 1600, height: 1200, data: new Uint8Array([1, 2]), boxes: [{ x: 100, y: 150, width: 200, height: 150, label: '车辆' }] };
const content = (entries: ReturnType<typeof buildAnnotationEntries>, name: string) => new TextDecoder().decode(entries.find(entry => entry.name === name)!.data);

test('editor coordinates scale to original dimensions, then clip', () => {
  assert.deepEqual(editorSize(1600, 1200), { width: 800, height: 600 });
  assert.deepEqual(clippedBoxes(image), [{ label: '车辆', x1: 200, y1: 300, x2: 600, y2: 600 }]);
  assert.deepEqual(clippedBoxes({ ...image, boxes: [{ x: -10, y: 590, width: 900, height: 100, label: '边界' }] }), [{ label: '边界', x1: 0, y1: 1180, x2: 1600, y2: 1200 }]);
});
test('YOLO normalizes real boxes with stable class index and preserves empty labels', () => {
  const entries = buildAnnotationEntries([image, { ...image, id: 11, boxes: [] }], ['人脸', '车辆'], 'YOLO', false);
  assert.equal(content(entries, 'labels/1_sample.txt'), '1 0.250000 0.375000 0.250000 0.250000');
  assert.equal(content(entries, 'labels/2_sample.txt'), '');
  assert.equal(content(entries, 'classes.txt'), '人脸\n车辆');
  assert.equal(entries.some(entry => entry.name.startsWith('images/')), false);
});
test('VOC emits separate files, actual sizes, escaped labels and one-based inclusive coordinates', () => {
  const entries = buildAnnotationEntries([{ ...image, boxes: [{ x: 0, y: 0, width: 800, height: 600, label: 'A&B<"' }] }, { ...image, boxes: [] }], [], 'Pascal VOC', true);
  assert.match(content(entries, 'Annotations/1_sample.xml'), /<width>1600<\/width><height>1200<\/height>/);
  assert.match(content(entries, 'Annotations/1_sample.xml'), /<name>A&amp;B&lt;&quot;<\/name>/);
  assert.match(content(entries, 'Annotations/1_sample.xml'), /<xmin>1<\/xmin><ymin>1<\/ymin><xmax>1600<\/xmax><ymax>1200<\/ymax>/);
  assert.doesNotMatch(content(entries, 'Annotations/2_sample.xml'), /<object>/);
  assert.deepEqual(entries.find(entry => entry.name === 'images/1_sample.png')!.data, image.data);
});
test('invalid dimensions, nonfinite boxes and missing requested images fail clearly', () => {
  assert.throws(() => clippedBoxes({ ...image, width: 0 }), /尺寸/);
  assert.throws(() => clippedBoxes({ ...image, boxes: [{ ...image.boxes[0], x: NaN }] }), /坐标/);
  assert.throws(() => buildAnnotationEntries([{ ...image, data: undefined }], [], 'YOLO', true), /缺少图片/);
  assert.throws(() => buildAnnotationEntries([], [], 'YOLO', false), /没有可导出/);
  assert.throws(() => buildAnnotationEntries([image], [], 'unknown', false), /格式/);
});
test('negative rectangles normalize, off-canvas and zero-area rectangles are omitted', () => {
  assert.deepEqual(clippedBoxes({ ...image, boxes: [{ x: 300, y: 300, width: -200, height: -100, label: '车辆' }, { x: 1000, y: 1000, width: 5, height: 5, label: '车辆' }, { x: 1, y: 1, width: 0, height: 3, label: '车辆' }] }), [{ label: '车辆', x1: 200, y1: 400, x2: 600, y2: 600 }]);
});
test('COCO uses the same real image and box data', () => {
  const entries = buildAnnotationEntries([image], ['车辆'], 'COCO', false);
  const coco = JSON.parse(content(entries, 'annotations.json'));
  assert.deepEqual(coco.images[0], { id: 1, file_name: '1_sample.png', width: 1600, height: 1200 });
  assert.deepEqual(coco.annotations[0].bbox, [200, 300, 400, 300]);
  assert.equal(coco.annotations[0].area, 120000);
});
test('extreme aspect ratios never produce zero-size canvas or nonfinite YOLO coordinates', () => {
  for (const [width, height] of [[1, 65535], [65535, 1], [17, 53], [600, 800]]) {
    const canvas = editorSize(width, height);
    assert.ok(canvas.width >= 1 && canvas.height >= 1);
    const entries = buildAnnotationEntries([{ ...image, width, height, boxes: [{ x: 0, y: 0, width: canvas.width, height: canvas.height, label: '车辆' }] }], ['车辆'], 'YOLO', false);
    assert.equal(content(entries, 'labels/1_sample.txt'), '0 0.500000 0.500000 1.000000 1.000000');
  }
});
test('explicit legacy canvas sizes are honored; zero and infinite canvas dimensions fail', () => {
  const legacy = { ...image, annotationWidth: 400, annotationHeight: 300 };
  assert.deepEqual(clippedBoxes(legacy), [{ label: '车辆', x1: 400, y1: 600, x2: 1200, y2: 1200 }]);
  assert.throws(() => clippedBoxes({ ...legacy, annotationWidth: 0 }), /画布/);
  assert.throws(() => clippedBoxes({ ...legacy, annotationHeight: Infinity }), /画布/);
});
test('dataset task mapping excludes unrelated files, deduplicates task selectors and preserves unannotated images', () => {
  const files = [{ ...image, taskId: 'task-a' }, { ...image, id: 11, taskId: 'task-b', boxes: [] }, { ...image, id: 12, taskId: 'task-c' }];
  const selected = selectDatasetImages(files, ['task-b', 'task-b', 'task-a']);
  assert.deepEqual(selected.map(file => file.id), [10, 11]);
  assert.deepEqual(selectDatasetImages(files, []), []);
  const entries = buildAnnotationEntries(selected, ['车辆'], 'YOLO', false);
  assert.equal(content(entries, 'labels/2_sample.txt'), '');
  assert.equal(entries.filter(entry => entry.name.startsWith('labels/')).length, 2);
});
test('same basename and different extensions retain distinct paired image/annotation names', () => {
  const entries = buildAnnotationEntries([image, { ...image, id: 11, name: 'sample.jpg' }, { ...image, id: 12 }], ['车辆'], 'Pascal VOC', true);
  assert.equal(new Set(entries.map(entry => entry.name)).size, entries.length);
  assert.match(content(entries, 'Annotations/2_sample.xml'), /<filename>2_sample.jpg<\/filename>/);
});
test('all annotation formats integrate with the shared ZIP writer and preserve original image bytes', async () => {
  for (const format of ['YOLO', 'Pascal VOC', 'COCO']) {
    const entries = buildAnnotationEntries([image], ['车辆'], format, true);
    const bytes = new Uint8Array(await createZip(entries).arrayBuffer());
    const view = new DataView(bytes.buffer);
    let position = 0;
    const decoded = new Map<string, Uint8Array>();
    while (view.getUint32(position, true) === 0x04034b50) {
      const size = view.getUint32(position + 18, true);
      const length = view.getUint16(position + 26, true);
      const extra = view.getUint16(position + 28, true);
      const name = new TextDecoder().decode(bytes.slice(position + 30, position + 30 + length));
      const start = position + 30 + length + extra;
      decoded.set(name, bytes.slice(start, start + size));
      position = start + size;
    }
    assert.equal(decoded.size, entries.length);
    assert.deepEqual(decoded.get('images/1_sample.png'), image.data);
    assert.ok(decoded.has(format === 'YOLO' ? 'labels/1_sample.txt' : format === 'Pascal VOC' ? 'Annotations/1_sample.xml' : 'annotations.json'));
  }
});
test('record IDs work without secure-context randomUUID and remain unique without Web Crypto', () => {
  assert.equal(createLocalId({ randomUUID: () => 'native-id' }), 'native-id');
  assert.equal(createLocalId({ getRandomValues: bytes => bytes.fill(7) }), '07'.repeat(16));
  const ids = Array.from({ length: 1000 }, () => createLocalId({}));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(id => /^[a-z0-9-]+$/.test(id)));
});
test('reload recovery recreates Blob URLs, retains data URLs, and refuses expired serialized Blob URLs', () => {
  const original = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
  const restored = restoreLocalSource(original, 'blob:expired', blob => {
    assert.equal(blob, original);
    return 'blob:fresh';
  });
  assert.deepEqual(restored, { url: 'blob:fresh', temporary: true });
  assert.deepEqual(restoreLocalSource('data:image/png;base64,AQID', 'blob:expired'), { url: 'data:image/png;base64,AQID', temporary: false });
  assert.deepEqual(restoreLocalSource('blob:old-document', 'blob:expired'), { url: undefined, temporary: false });
  assert.deepEqual(restoreLocalSource(null, 'blob:expired'), { url: undefined, temporary: false });
  assert.deepEqual(restoreLocalSource(null, 'data:image/png;base64,AQID'), { url: 'data:image/png;base64,AQID', temporary: false });
});
