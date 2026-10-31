export interface StoredImage {
  id: string; name: string; size: string; resolution: string; uploadTime: string; file: File;
}
const DB_NAME = 'platform-data-processing-v1';
const STORE = 'images';
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('当前浏览器不支持本地图片存储')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE, { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('无法打开本地图片存储'));
    request.onblocked = () => reject(new Error('本地图片存储被其他标签页占用，请关闭旧页面后重试'));
  });
}
export async function loadStoredImages(): Promise<StoredImage[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).getAll();
    transaction.oncomplete = () => {
      db.close();
      const records = request.result as StoredImage[];
      if (records.some(record => typeof record.id !== 'string' || typeof record.name !== 'string' || typeof record.resolution !== 'string' || typeof record.size !== 'string' || typeof record.uploadTime !== 'string' || !(record.file instanceof Blob))) { reject(new Error('本地图片记录损坏，请检查浏览器存储')); return; }
      resolve(records);
    };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('读取本地图片失败')); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('读取本地图片已中止')); };
  });
}
/** Atomic snapshot including File bytes; URLs are recreated on mount. */
export async function saveStoredImages(images: StoredImage[], signal?: AbortSignal): Promise<void> {
  const db = await open();
  if (signal?.aborted) { db.close(); throw new DOMException('操作已取消', 'AbortError'); }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const cancel = () => { try { transaction.abort(); } catch { /* already committed */ } };
    signal?.addEventListener('abort', cancel, { once: true });
    const finish = () => { signal?.removeEventListener('abort', cancel); db.close(); };
    const store = transaction.objectStore(STORE);
    transaction.oncomplete = () => { finish(); resolve(); };
    transaction.onabort = () => { finish(); reject(transaction.error || new Error('图片保存失败，可能已超出浏览器存储配额')); };
    transaction.onerror = () => { /* abort reports a single final error */ };
    try {
      store.clear();
      for (const { id, name, size, resolution, uploadTime, file } of images) store.put({ id, name, size, resolution, uploadTime, file });
    } catch { transaction.abort(); }
  });
}
