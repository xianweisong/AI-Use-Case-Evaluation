// Minimal uncompressed ZIP writer for browser-side annotation exports.
export function createZip(entries: { name: string; data: Uint8Array }[]): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (view: DataView, position: number, value: number) => view.setUint16(position, value, true);
  const u32 = (view: DataView, position: number, value: number) => view.setUint32(position, value >>> 0, true);
  const crc32 = (bytes: Uint8Array) => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const local = new Uint8Array(30 + name.length);
    const l = new DataView(local.buffer);
    u32(l, 0, 0x04034b50); u16(l, 4, 20); u16(l, 6, 0x0800);
    u32(l, 14, crc); u32(l, 18, entry.data.length); u32(l, 22, entry.data.length);
    u16(l, 26, name.length); local.set(name, 30);
    chunks.push(local, entry.data);
    const header = new Uint8Array(46 + name.length);
    const c = new DataView(header.buffer);
    u32(c, 0, 0x02014b50); u16(c, 4, 20); u16(c, 6, 20); u16(c, 8, 0x0800);
    u32(c, 16, crc); u32(c, 20, entry.data.length); u32(c, 24, entry.data.length);
    u16(c, 28, name.length); u32(c, 42, offset); header.set(name, 46);
    central.push(header);
    offset += local.length + entry.data.length;
  }
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  u32(e, 0, 0x06054b50); u16(e, 8, entries.length); u16(e, 10, entries.length);
  const centralSize = central.reduce((sum, value) => sum + value.length, 0);
  u32(e, 12, centralSize); u32(e, 16, offset);
  return new Blob([...chunks, ...central, end], { type: 'application/zip' });
}
