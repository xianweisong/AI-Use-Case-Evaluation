/** Additive, once-only restoration of bundled examples. Never replaces existing records. */
export function backupLocalValues(keys: readonly string[], version: string): void {
  for (const key of keys) {
    const backupKey = `platform-data-backup:${version}:${encodeURIComponent(key)}`;
    if (localStorage.getItem(backupKey) !== null) continue;
    // Preserve the exact original string, including an absent or malformed value.
    localStorage.setItem(backupKey, JSON.stringify({ key, value: localStorage.getItem(key) }));
  }
}

export function mergeSeedRecords<T>(existing: readonly T[], seeds: readonly T[], idKey: string): T[] {
  const id = (record: T) => record && typeof record === 'object' ? (record as Record<string, unknown>)[idKey] : undefined;
  const seen = new Set(existing.map(id).filter(value => value !== undefined && value !== null).map(String));
  const result = [...existing];
  for (const seed of seeds) {
    const value = id(seed);
    if (value === undefined || value === null) throw new Error(`示例记录缺少 ${idKey}，未执行恢复`);
    if (!seen.has(String(value))) { seen.add(String(value)); result.push(seed); }
  }
  return result;
}

export function migrateSeedArray<T>(key: string, seeds: readonly T[], idKey: string, version: string): T[] {
  const raw = localStorage.getItem(key);
  const marker = `platform-data-migration:${version}:${encodeURIComponent(key)}`;
  const existing = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(existing)) throw new Error(`${key} 的本地记录格式异常，已停止自动写入`);
  if (localStorage.getItem(marker) !== null) return existing;
  backupLocalValues([key], version);
  const merged = mergeSeedRecords<T>(existing, seeds, idKey);
  if (raw === null || merged.length !== existing.length) localStorage.setItem(key, JSON.stringify(merged));
  localStorage.setItem(marker, '1');
  return merged;
}

/** Refuse stale whole-list writes after another tab changes a record. */
export function createGuardedStorageWriter(keys: readonly string[]) {
  const snapshots = new Map(keys.map(key => [key, localStorage.getItem(key)]));
  return (key: string, value: unknown): void => {
    if (!snapshots.has(key)) throw new Error('未初始化此数据的保护快照');
    if (localStorage.getItem(key) !== snapshots.get(key)) {
      throw new Error('其他页面已更新本地数据，本次未覆盖；请刷新后重试');
    }
    const raw = JSON.stringify(value);
    localStorage.setItem(key, raw);
    snapshots.set(key, raw);
    window.dispatchEvent(new Event('platform-local-data'));
  };
}
