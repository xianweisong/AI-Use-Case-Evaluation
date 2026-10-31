export interface ComparableItem { name: string; value: string | number | null; status: string }
export interface ComparableResult { id: string; name: string; items: ComparableItem[] }

export function resultRows(results: ComparableResult[]) {
  const names = [...new Set(results.flatMap(result => result.items.map(item => item.name)))];
  return names.map(name => {
    const items = results.map(result => result.items.find(item => item.name === name));
    const different = items.some(item => item?.value !== items[0]?.value || item?.status !== items[0]?.status);
    return { name, items, different };
  });
}

export function numericDifference(a: string | number | null | undefined, b: string | number | null | undefined) {
  if (a == null || b == null) return null;
  const matchA = String(a).trim().match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
  const matchB = String(b).trim().match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
  if (!matchA || !matchB || matchA[2] !== matchB[2]) return null;
  const delta = Number(matchB[1]) - Number(matchA[1]);
  return { delta, unit: matchA[2], label: `${delta > 0 ? '+' : ''}${Number(delta.toFixed(3))}${matchA[2]}` };
}

export function resultAnalysis(a: ComparableResult, b: ComparableResult) {
  const rows = resultRows([a, b]);
  const differences = rows.filter(row => row.different).map(row => {
    const numeric = numericDifference(row.items[0]?.value, row.items[1]?.value);
    const kind = !row.items[0] || !row.items[1] ? '缺失项' : row.items[0].status !== row.items[1].status ? '状态差异' : numeric ? '数值差异' : '文本差异';
    return { ...row, numeric, kind, label: kind === '数值差异' ? numeric?.label ?? kind : kind };
  });
  const relativeDifferences = differences.filter(row => row.kind === '数值差异' && row.numeric).map(row => {
    const baseline = Number.parseFloat(String(row.items[0]?.value));
    return baseline === 0 ? null : Math.abs(row.numeric!.delta / baseline) * 100;
  }).filter((value): value is number => value !== null && Number.isFinite(value));
  const max = relativeDifferences.reduce((best, value) => Math.max(best, value), 0);
  const average = relativeDifferences.length ? relativeDifferences.reduce((sum, value) => sum + value, 0) / relativeDifferences.length : 0;
  return { rows, differences, rate: rows.length ? differences.length / rows.length * 100 : 0, max, average,
    maxLabel: relativeDifferences.length === 0 ? '待补充' : `${max.toFixed(2)}%`,
    averageLabel: relativeDifferences.length === 0 ? '待补充' : `${average.toFixed(2)}%`,
    distribution: ['数值差异', '状态差异', '文本差异', '缺失项'].map(name => ({ name, value: differences.filter(row => row.kind === name).length })) };
}

export function csvCell(value: string | number) {
  const content = String(value);
  const safe = /^[\s]*[=+\-@]/.test(content) ? `'${content}` : content;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
