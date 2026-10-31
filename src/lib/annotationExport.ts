export interface ExportBox { x: number; y: number; width: number; height: number; label: string }
let localSequence = 0;
/** Local record identifiers, not authentication or security tokens. */
export function createLocalId(source: { randomUUID?: () => string; getRandomValues?: (bytes: Uint8Array) => Uint8Array } | undefined = globalThis.crypto): string {
  if (typeof source?.randomUUID === 'function') return source.randomUUID();
  if (typeof source?.getRandomValues === 'function') return Array.from(source.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  return `local-${Date.now().toString(36)}-${(localSequence++).toString(36)}-${Math.random().toString(36).slice(2)}`;
}
export function restoreLocalSource(saved: unknown, currentUrl?: string, makeObjectUrl: (blob: Blob) => string = blob => URL.createObjectURL(blob)) {
  if (saved instanceof Blob) return { url: makeObjectUrl(saved), temporary: true };
  if (typeof saved === 'string' && saved.startsWith('data:')) return { url: saved, temporary: false };
  // A serialized blob: URL belongs to the previous document and must never be reused.
  return { url: currentUrl?.startsWith('data:') ? currentUrl : undefined, temporary: false };
}
export interface ExportImage {
  id: string | number; name: string; width: number; height: number;
  annotationWidth?: number; annotationHeight?: number; boxes: ExportBox[]; data?: Uint8Array;
}
export const editorSize = (width: number, height: number) => {
  if (!(width > 0 && height > 0) || !Number.isFinite(width + height)) throw new Error('图片尺寸无效');
  const scale = Math.min(1, 800 / width, 600 / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};
export function selectDatasetImages<T extends { taskId: string }>(files: T[], taskIds: string[]): T[] {
  const included = new Set(taskIds);
  return files.filter(file => included.has(file.taskId));
}
const xml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
export function clippedBoxes(image: ExportImage) {
  if (!(image.width > 0 && image.height > 0) || !Number.isFinite(image.width + image.height)) throw new Error('图片尺寸无效');
  const canvas = editorSize(image.width, image.height);
  const annotationWidth = image.annotationWidth ?? canvas.width;
  const annotationHeight = image.annotationHeight ?? canvas.height;
  if (!(annotationWidth > 0 && annotationHeight > 0) || !Number.isFinite(annotationWidth + annotationHeight)) throw new Error('标注画布尺寸无效');
  const sx = image.width / annotationWidth;
  const sy = image.height / annotationHeight;
  return image.boxes.flatMap(box => {
    if (![box.x, box.y, box.width, box.height].every(Number.isFinite)) throw new Error('标注坐标无效');
    const x1 = Math.max(0, Math.min(image.width, Math.min(box.x, box.x + box.width) * sx));
    const y1 = Math.max(0, Math.min(image.height, Math.min(box.y, box.y + box.height) * sy));
    const x2 = Math.max(0, Math.min(image.width, Math.max(box.x, box.x + box.width) * sx));
    const y2 = Math.max(0, Math.min(image.height, Math.max(box.y, box.y + box.height) * sy));
    return x2 > x1 && y2 > y1 ? [{ label: box.label, x1, y1, x2, y2 }] : [];
  });
}
export function buildAnnotationEntries(images: ExportImage[], labels: string[], format: string, includeImages: boolean) {
  if (!images.length) throw new Error('数据集没有可导出的真实图片');
  if (!['YOLO', 'Pascal VOC', 'COCO'].includes(format)) throw new Error('不支持的标注格式');
  const classes = [...new Set([...labels, ...images.flatMap(image => image.boxes.map(box => box.label))])];
  const entries: { name: string; data: Uint8Array }[] = [];
  const encode = (name: string, content: string) => entries.push({ name, data: new TextEncoder().encode(content) });
  const coco: any = { images: [], annotations: [], categories: classes.map((name, id) => ({ id: id + 1, name })) };
  images.forEach((image, index) => {
    // Prefixes keep same-name images from different tasks and extensions distinct.
    const filename = `${index + 1}_${image.name.replace(/[\\/\x00-\x1f]/g, '_')}`;
    const stem = filename.replace(/\.[^.]+$/, '');
    const boxes = clippedBoxes(image);
    if (includeImages) {
      if (!image.data?.length) throw new Error(`缺少图片内容：${image.name}`);
      entries.push({ name: `images/${filename}`, data: image.data });
    }
    if (format === 'YOLO') {
      encode(`labels/${stem}.txt`, boxes.map(b => [classes.indexOf(b.label), (b.x1 + b.x2) / 2 / image.width, (b.y1 + b.y2) / 2 / image.height, (b.x2 - b.x1) / image.width, (b.y2 - b.y1) / image.height].map((v, i) => i ? v.toFixed(6) : v).join(' ')).join('\n'));
    } else if (format === 'Pascal VOC') {
      encode(`Annotations/${stem}.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<annotation><filename>${xml(filename)}</filename><size><width>${image.width}</width><height>${image.height}</height><depth>3</depth></size><segmented>0</segmented>${boxes.map(b => `<object><name>${xml(b.label)}</name><pose>Unspecified</pose><truncated>0</truncated><difficult>0</difficult><bndbox><xmin>${Math.floor(b.x1) + 1}</xmin><ymin>${Math.floor(b.y1) + 1}</ymin><xmax>${Math.ceil(b.x2)}</xmax><ymax>${Math.ceil(b.y2)}</ymax></bndbox></object>`).join('')}</annotation>`);
    } else {
      coco.images.push({ id: index + 1, file_name: filename, width: image.width, height: image.height });
      boxes.forEach(b => coco.annotations.push({ id: coco.annotations.length + 1, image_id: index + 1, category_id: classes.indexOf(b.label) + 1, bbox: [b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1], area: (b.x2 - b.x1) * (b.y2 - b.y1), iscrowd: 0 }));
    }
  });
  if (format === 'YOLO') encode('classes.txt', classes.join('\n'));
  if (format === 'COCO') encode('annotations.json', JSON.stringify(coco, null, 2));
  return entries;
}
