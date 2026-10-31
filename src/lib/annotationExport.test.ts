import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnnotationExport, scaleFrameToNative, type ExportFrame } from './annotationExport';

const frames: ExportFrame[] = [
  { name: 'one.jpg', width: 800, height: 600, boxes: [{ x: 100, y: 120, width: 200, height: 180, label: '车辆' }] },
  { name: 'two.jpg', width: 800, height: 600, boxes: [{ x: 10, y: 20, width: 40, height: 60, label: '人脸' }] },
];

async function unzipStored(blob: Blob): Promise<Map<string, string>> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const entries = new Map<string, string>();
  const decoder = new TextDecoder();
  let position = 0;
  while (view.getUint32(position, true) === 0x04034b50) {
    const length = view.getUint32(position + 18, true);
    const nameLength = view.getUint16(position + 26, true);
    const extraLength = view.getUint16(position + 28, true);
    const start = position + 30 + nameLength + extraLength;
    entries.set(decoder.decode(bytes.slice(position + 30, position + 30 + nameLength)), decoder.decode(bytes.slice(start, start + length)));
    position = start + length;
  }
  return entries;
}

test('COCO export corresponds to current image names, labels and boxes', async () => {
  const entries = await unzipStored(await buildAnnotationExport(frames, 'COCO', false));
  const coco = JSON.parse(entries.get('annotations.json')!);
  assert.equal(coco.images.length, 2);
  assert.equal(coco.annotations.length, 2);
  assert.deepEqual(coco.annotations[0].bbox, [100, 120, 200, 180]);
  assert.equal(coco.categories[coco.annotations[0].category_id - 1].name, '车辆');
  assert.match(coco.images[0].file_name, /one\.jpg$/);
});

test('YOLO and Pascal VOC export one matching label file per image', async () => {
  const yolo = await unzipStored(await buildAnnotationExport(frames, 'YOLO', false));
  assert.equal(yolo.get('classes.txt'), '车辆\n人脸');
  assert.equal(yolo.get('labels/00001_one.txt'), '0 0.25 0.35 0.25 0.3');
  const voc = await unzipStored(await buildAnnotationExport(frames, 'Pascal VOC', false));
  assert.match(voc.get('annotations/00001_one.xml')!, /<name>车辆<\/name>/);
  assert.match(voc.get('annotations/00001_one.xml')!, /<xmax>300<\/xmax>/);
});

test('including media requires a readable source', async () => {
  await assert.rejects(buildAnnotationExport(frames, 'COCO', true), /缺少可导出的原始图片/);
});

test('uploaded image boxes scale from editor display to original pixels', async () => {
  const display = { ...frames[0], boxes: [{ x: 152, y: 44, width: 200, height: 90, label: '人脸' }] };
  const native = scaleFrameToNative(display, 1452, 366);
  assert.equal(native.width, 1452);
  assert.equal(native.height, 366);
  assert.deepEqual(native.boxes[0], { x: 275.88, y: 44 * 366 / 202, width: 363, height: 90 * 366 / 202, label: '人脸' });
  const coco = JSON.parse((await unzipStored(await buildAnnotationExport([native], 'COCO', false))).get('annotations.json')!);
  assert.deepEqual(coco.annotations[0].bbox, [275.88, 44 * 366 / 202, 363, 90 * 366 / 202]);
});
