export interface NamingRule {
  prefix: string;
  suffix: string;
  startNumber: number;
  digits: number;
  useTimestamp: boolean;
  useOriginalName: boolean;
  duplicateHandling: 'skip' | 'overwrite' | 'rename';
}
export interface NamingSource { id: string; name: string }
export interface NamingResult {
  id: string;
  originalName: string;
  newName: string;
  status: 'success' | 'error';
}

export function validateNamingRule(rule: NamingRule): string | null {
  if (!Number.isSafeInteger(rule.startNumber) || rule.startNumber < 0) return '起始序号必须是非负整数';
  if (!Number.isInteger(rule.digits) || rule.digits < 1 || rule.digits > 12) return '序号位数必须为 1 至 12';
  if (/[<>:"/\\|?*\x00-\x1f]/.test(rule.prefix + rule.suffix)) return '前缀或后缀包含文件名禁用字符';
  return null;
}

export function planImageNames(selected: NamingSource[], all: NamingSource[], rule: NamingRule, stamp: string): NamingResult[] {
  const error = validateNamingRule(rule);
  if (error) throw new Error(error);
  // Keep original names reserved: a later skipped file must not be silently lost.
  const occupied = new Set(all.map(image => image.name.toLowerCase()));
  const generated = new Set<string>();
  const results: NamingResult[] = [];
  selected.forEach((image, index) => {
    if (!Number.isSafeInteger(rule.startNumber + index)) throw new Error('序号超出安全整数范围');
    const dot = image.name.lastIndexOf('.');
    const stem = dot > 0 ? image.name.slice(0, dot) : image.name;
    const ext = dot > 0 ? image.name.slice(dot) : '';
    const base = rule.prefix + (rule.useOriginalName ? stem : '') + (rule.useTimestamp ? stamp : '') + String(rule.startNumber + index).padStart(rule.digits, '0') + rule.suffix;
    let newName = base + ext;
    if (/[<>:"/\\|?*\x00-\x1f]/.test(newName) || /[. ]$/.test(newName) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(newName) || new TextEncoder().encode(newName).length > 255) throw new Error('生成的文件名无效或超过 255 字节，请调整规则');
    const ownNameOnly = newName.toLowerCase() === image.name.toLowerCase()
      && !all.some(other => other.id !== image.id && other.name.toLowerCase() === newName.toLowerCase())
      && !generated.has(newName.toLowerCase());
    if (occupied.has(newName.toLowerCase()) && !ownNameOnly) {
      if (rule.duplicateHandling === 'skip') {
        results.push({ id: image.id, originalName: image.name, newName: '(已跳过)', status: 'error' });
        return;
      }
      if (rule.duplicateHandling === 'rename') {
        let number = 1;
        while (occupied.has(`${base}_${number}${ext}`.toLowerCase())) number++;
        newName = `${base}_${number}${ext}`;
        if (new TextEncoder().encode(newName).length > 255) throw new Error('重名处理后的文件名过长');
      } else {
        const earlier = results.find(result => result.newName.toLowerCase() === newName.toLowerCase());
        if (earlier) { earlier.newName = '(已跳过)'; earlier.status = 'error'; }
      }
    }
    occupied.add(newName.toLowerCase());
    generated.add(newName.toLowerCase());
    results.push({ id: image.id, originalName: image.name, newName, status: 'success' });
  });
  return results;
}

export async function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  const image = new Image();
  image.src = url;
  await image.decode();
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('无法读取图片尺寸');
  return { width: image.naturalWidth, height: image.naturalHeight };
}
