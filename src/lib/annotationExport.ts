import { createZip } from './zip';

export interface ExportFrame {
  name: string;
  source?: string;
  boxes: { x: number; y: number; width: number; height: number; label: string }[];
  width: number;
  height: number;
}

export function scaleFrameToNative(frame: ExportFrame, naturalWidth: number, naturalHeight: number): ExportFrame {
  if (naturalWidth <= 0 || naturalHeight <= 0) throw new Error('图片尺寸无效');
  let displayWidth = naturalWidth;
  let displayHeight = naturalHeight;
  const ratio = naturalWidth / naturalHeight;
  if (displayWidth > 800) { displayWidth = 800; displayHeight = displayWidth / ratio; }
  if (displayHeight > 600) { displayHeight = 600; displayWidth = displayHeight * ratio; }
  displayWidth = Math.round(displayWidth);
  displayHeight = Math.round(displayHeight);
  const scaleX = naturalWidth / displayWidth;
  const scaleY = naturalHeight / displayHeight;
  return {
    ...frame,
    width: naturalWidth,
    height: naturalHeight,
    boxes: frame.boxes.map(box => ({ ...box, x: box.x * scaleX, y: box.y * scaleY, width: box.width * scaleX, height: box.height * scaleY }))
  };
}

const safeName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_');
const xml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
const encoded = (text: string) => new TextEncoder().encode(text);

export async function buildAnnotationExport(frames: ExportFrame[], format: string, includeImages: boolean): Promise<Blob> {
  if (frames.length === 0) throw new Error('数据集没有可导出的文件');
  const labels = [...new Set(frames.flatMap(frame => frame.boxes.map(box => box.label)))];
  const entries: { name: string; data: Uint8Array }[] = [];
  const names = frames.map((frame, index) => `${String(index + 1).padStart(5, '0')}_${safeName(frame.name)}`);
  if (format === 'COCO') {
    const data = {
      images: frames.map((frame, index) => ({ id: index + 1, file_name: names[index], width: frame.width, height: frame.height })),
      categories: labels.map((name, index) => ({ id: index + 1, name })),
      annotations: frames.flatMap((frame, index) => frame.boxes.map(box => ({ frame, index, box })))
        .map(({ frame, index, box }, annotationIndex) => ({
          id: annotationIndex + 1, image_id: index + 1, category_id: labels.indexOf(box.label) + 1,
          bbox: [box.x, box.y, box.width, box.height], area: box.width * box.height, iscrowd: 0,
          segmentation: [[box.x, box.y, box.x + box.width, box.y, box.x + box.width, box.y + box.height, box.x, box.y + box.height]]
        }))
    };
    entries.push({ name: 'annotations.json', data: encoded(JSON.stringify(data, null, 2)) });
  } else if (format === 'YOLO') {
    entries.push({ name: 'classes.txt', data: encoded(labels.join('\n')) });
    frames.forEach((frame, index) => {
      const lines = frame.boxes.map(box => [labels.indexOf(box.label), (box.x + box.width / 2) / frame.width, (box.y + box.height / 2) / frame.height, box.width / frame.width, box.height / frame.height].join(' '));
      entries.push({ name: `labels/${names[index].replace(/\.[^.]+$/, '')}.txt`, data: encoded(lines.join('\n')) });
    });
  } else if (format === 'Pascal VOC') {
    frames.forEach((frame, index) => {
      const objects = frame.boxes.map(box => `<object><name>${xml(box.label)}</name><bndbox><xmin>${Math.round(box.x)}</xmin><ymin>${Math.round(box.y)}</ymin><xmax>${Math.round(box.x + box.width)}</xmax><ymax>${Math.round(box.y + box.height)}</ymax></bndbox></object>`).join('');
      entries.push({ name: `annotations/${names[index].replace(/\.[^.]+$/, '')}.xml`, data: encoded(`<?xml version="1.0" encoding="UTF-8"?><annotation><filename>${xml(names[index])}</filename><size><width>${frame.width}</width><height>${frame.height}</height><depth>3</depth></size>${objects}</annotation>`) });
    });
  } else throw new Error('不支持的导出格式');
  if (includeImages) {
    for (let index = 0; index < frames.length; index++) {
      const source = frames[index].source;
      if (!source) throw new Error(`${frames[index].name} 缺少可导出的原始图片；请取消“包含原始图片/视频帧”后重试`);
      const response = await fetch(source);
      if (!response.ok) throw new Error(`${frames[index].name} 原始图片读取失败；请取消包含原图后重试`);
      entries.push({ name: `images/${names[index]}`, data: new Uint8Array(await response.arrayBuffer()) });
    }
  }
  return createZip(entries);
}
