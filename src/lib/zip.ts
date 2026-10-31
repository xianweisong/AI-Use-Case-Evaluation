export interface ZipEntry { name: string; data: Uint8Array }

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** UTF-8, uncompressed ZIP. Original file bytes are preserved. */
export function createZip(entries: ZipEntry[]): Blob {
  if (entries.length > 65535) throw new Error('文件数量超出 ZIP 限制');
  const chunks: BlobPart[] = [];
  const directory: BlobPart[] = [];
  let offset = 0;
  let directorySize = 0;
  const names = new Set<string>();
  for (const entry of entries) {
    const segments = entry.name.split('/');
    if (!entry.name || /[\\\x00-\x1f\x7f]/.test(entry.name) || /^[a-zA-Z]:/.test(entry.name) || segments.some(segment => !segment || segment === '.' || segment === '..') || names.has(entry.name)) throw new Error('ZIP 文件名无效或重复');
    names.add(entry.name);
    const name = new TextEncoder().encode(entry.name);
    if (name.length > 65535 || entry.data.length > 0xffffffff || offset + entry.data.length + name.length + 30 > 0xffffffff) throw new Error('文件超出 ZIP 大小限制');
    const crc = crc32(entry.data);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(12, 33, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, entry.data.length, true);
    view.setUint32(22, entry.data.length, true);
    view.setUint16(26, name.length, true);
    local.set(name, 30);
    chunks.push(local, new Uint8Array(entry.data));
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(14, 33, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, entry.data.length, true);
    cv.setUint32(24, entry.data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    directory.push(central);
    directorySize += central.length;
    offset += local.length + entry.data.length;
  }
  if (offset + directorySize > 0xffffffff) throw new Error('文件超出 ZIP 大小限制');
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, directorySize, true);
  ev.setUint32(16, offset, true);
  return new Blob([...chunks, ...directory, end], { type: 'application/zip' });
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
