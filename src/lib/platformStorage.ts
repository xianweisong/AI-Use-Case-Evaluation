/** Never write on mount, replace malformed data, or overwrite another tab's changes. */
export function createModuleStore<T>(key: string, defaults: T, validate?: (value: unknown) => value is T) {
  let raw: string | null = null;
  let initial = defaults;
  let blocked = false;
  let backedUp = false;
  const valid = validate ?? ((value: unknown) => Array.isArray(defaults) ? Array.isArray(value) : value !== null && typeof value === typeof defaults);
  try {
    raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (!valid(parsed)) throw new Error('数据格式不兼容');
      initial = parsed;
    }
  } catch { blocked = true; }
  let last = JSON.stringify(initial);
  return {
    initial,
    read: (): T => {
      const value = localStorage.getItem(key);
      if (value === null) return defaults;
      const parsed = JSON.parse(value);
      if (!valid(parsed)) throw new Error('原有数据格式不兼容，请先备份检查。');
      return parsed;
    },
    save(value: T): void {
      const next = JSON.stringify(value);
      if (blocked) throw new Error('原有数据无法安全读取，已停止保存以保护原记录。');
      if (!valid(value)) throw new Error('保存数据格式错误。');
      if (localStorage.getItem(key) !== raw) throw new Error('其他页面已修改数据，请刷新后再操作。');
      if (next === last) return;
      if (!backedUp && raw !== null) {
        const backupKey = `as-eval-original-backup:${encodeURIComponent(key)}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        const backup = JSON.stringify({ key, value: raw });
        localStorage.setItem(backupKey, backup);
        if (localStorage.getItem(backupKey) !== backup) throw new Error('原记录备份失败，已取消保存。');
        backedUp = true;
      }
      localStorage.setItem(key, next);
      raw = next;
      last = next;
      window.dispatchEvent(new CustomEvent('platform-data-changed', {detail: {key}}));
    },
  };
}
