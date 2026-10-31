import { PROCESSING_SEEDS } from './processingSeeds';

export interface StoredImage {
  id: string; name: string; size: string; resolution: string; uploadTime: string; file: File;
}
const DB_NAME = 'platform-data-processing-v1';
const STORE = 'images';
const BACKUPS = 'migration-backups';
const META = 'migration-meta';
const MIGRATION = 'restore-demo-images-v1';

async function rasterizeSeed(source: Blob, resolution: string, name: string): Promise<File> {
  const [width, height] = resolution.split('x').map(Number);
  const url = URL.createObjectURL(source);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('本地示例图片无法解码'));
      element.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法生成本地示例图片');
    context.drawImage(image, 0, 0, width, height);
    const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('无法生成本地示例图片')), 'image/jpeg', 0.85));
    return new File([jpeg], name, { type: 'image/jpeg' });
  } finally { URL.revokeObjectURL(url); }
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('当前浏览器不支持本地图片存储')); return; }
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(BACKUPS)) db.createObjectStore(BACKUPS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('无法打开本地图片存储'));
    request.onblocked = () => reject(new Error('本地图片存储被其他标签页占用，请关闭旧页面后重试'));
  });
}

function checkRecords(records: StoredImage[]): StoredImage[] {
  if (records.some(record => typeof record.id !== 'string' || typeof record.name !== 'string' || typeof record.resolution !== 'string' || typeof record.size !== 'string' || typeof record.uploadTime !== 'string' || !(record.file instanceof Blob))) throw new Error('本地图片记录损坏，请检查浏览器存储');
  return records;
}

export async function loadStoredImages(): Promise<StoredImage[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).getAll();
    transaction.oncomplete = () => { db.close(); try { resolve(checkRecords(request.result as StoredImage[])); } catch (error) { reject(error); } };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('读取本地图片失败')); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('读取本地图片已中止')); };
  });
}

/** Seeds once. Existing image records and their File bytes are backed up in the same transaction. */
export async function migrateProcessingSeeds(): Promise<StoredImage[]> {
  const db = await open();
  const marker = await new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction(META, 'readonly');
    const request = tx.objectStore(META).get(MIGRATION);
    tx.oncomplete = () => resolve(Boolean(request.result));
    tx.onerror = () => reject(tx.error);
  });
  if (marker) { db.close(); return loadStoredImages(); }
  let seeds: StoredImage[];
  try {
    seeds = await Promise.all(PROCESSING_SEEDS.map(async seed => {
      const response = await fetch(seed.asset);
      if (!response.ok) throw new Error(`示例图片读取失败：${seed.name}`);
      const blob = await response.blob();
      const file = await rasterizeSeed(blob, seed.resolution, seed.name);
      return { id: seed.id, name: seed.name, size: `${(file.size / 1024 / 1024).toFixed(2)} MB`, resolution: seed.resolution, uploadTime: seed.uploadTime, file };
    }));
  } catch (error) { db.close(); throw error; }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE, BACKUPS, META], 'readwrite');
    const imageStore = tx.objectStore(STORE);
    const markerRequest = tx.objectStore(META).get(MIGRATION);
    markerRequest.onsuccess = () => {
      if (markerRequest.result) return; // Another tab migrated while assets were loading.
      const existingRequest = imageStore.getAll();
      existingRequest.onsuccess = () => {
        try {
          const existing = checkRecords(existingRequest.result as StoredImage[]);
          const present = new Set(existing.map(record => record.id));
          tx.objectStore(BACKUPS).add({ id: MIGRATION, records: existing });
          for (const seed of seeds) if (!present.has(seed.id)) imageStore.add(seed);
          tx.objectStore(META).add({ id: MIGRATION });
        } catch { tx.abort(); }
      };
    };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error('示例迁移失败，原图片未修改'));
    tx.onerror = () => { /* onabort reports final failure */ };
  }).finally(() => db.close());
  return loadStoredImages();
}

/** Changes only specified IDs, so another tab's unrelated records are never cleared. */
export async function changeStoredImages(upserts: StoredImage[], deletions: string[] = [], signal?: AbortSignal): Promise<StoredImage[]> {
  const db = await open();
  if (signal?.aborted) { db.close(); throw new DOMException('操作已取消', 'AbortError'); }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const cancel = () => { try { tx.abort(); } catch { /* transaction already complete */ } };
    signal?.addEventListener('abort', cancel, { once: true });
    const finish = () => { signal?.removeEventListener('abort', cancel); db.close(); };
    tx.oncomplete = () => { finish(); resolve(); };
    tx.onabort = () => { finish(); reject(tx.error || new Error('图片保存失败，可能已超出浏览器存储配额')); };
    try {
      const store = tx.objectStore(STORE);
      for (const id of deletions) store.delete(id);
      for (const record of upserts) store.put(record);
    } catch { tx.abort(); }
  });
  return loadStoredImages();
}
