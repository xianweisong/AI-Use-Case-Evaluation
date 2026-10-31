import { downloadBlob } from './zip';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function buildReportHtml(records: any[], sections: string[], template: string): string {
  const title = `公安场景人工智能平台 · 本地样例报告（${escape(template)}）`;
  const rows = records.map(r => `<h2>${escape(r.name)}</h2>` +
    (sections.includes('overview') ? `<p>${escape(r.type)} · ${escape(r.result)}</p>` : '') +
    (sections.includes('stats') ? `<p>通过 ${r.run?.passed ?? 0} 项，失败 ${r.run?.failed ?? 0} 项</p>` : '') +
    ((sections.includes('results') || sections.includes('problems')) ? `<table><tr><th>测试项</th><th>结果</th><th>耗时</th><th>说明</th></tr>${(r.run?.checks || []).filter((c: any) => sections.includes('results') || c.result === 'failed').map((c: any) => `<tr><td>${escape(c.item)}</td><td>${escape(c.result)}</td><td>${escape(c.cost)}</td><td>${escape(c.error)}</td></tr>`).join('')}</table>` : '') +
    (sections.includes('diff') ? '<p>差异对比：待补充</p>' : '') +
    (sections.includes('impact') ? '<p>影响分析：待补充</p>' : '')).join('');
  return `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><title>${title}</title><style>body{font:14px sans-serif;margin:40px;color:#1e293b}table{border-collapse:collapse;width:100%}td,th{border:1px solid #cbd5e1;padding:8px;text-align:left}h2{page-break-after:avoid}</style><body><h1>${title}</h1>${rows}</body></html>`;
}
export function exportLocalReports(records: any[], format: string, sections: string[], template: string) {
  if (!records.length) throw new Error('请先执行本地样例任务，再生成报告');
  const html = buildReportHtml(records, sections, template);
  if (format === 'pdf') {
    const popup = window.open('', '_blank');
    if (!popup) throw new Error('浏览器拦截了打印窗口，请允许弹出窗口后重试');
    popup.document.write(html); popup.document.close(); popup.focus();
    popup.opener = null;
    popup.setTimeout(() => popup.print(), 200);
  } else if (format === 'word') {
    const unicode = (s: string) => s.replace(/[\\{}\u0080-\uffff]/g, c => /[\\{}]/.test(c) ? '\\' + c : `\\u${c.charCodeAt(0) > 32767 ? c.charCodeAt(0)-65536 : c.charCodeAt(0)}?`);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const paragraphs = [...doc.querySelectorAll('h1,h2,p,tr')].map(e => unicode(e.tagName === 'TR' ? [...e.children].map(c => c.textContent).join(' | ') : e.textContent || '') + '\\par').join('\n');
    downloadBlob(new Blob([`{\\rtf1\\ansi\\uc1 ${paragraphs}}`], { type: 'application/rtf' }), '本地样例测试报告.rtf');
  } else downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), '本地样例测试报告.html');
}
