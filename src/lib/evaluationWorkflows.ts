import { createZip } from './zip';

export function parseTaskConfig(config: string): boolean {
  try {
    const value = JSON.parse(config);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    if ('threshold' in value && (typeof value.threshold !== 'number' || value.threshold < 0 || value.threshold > 1)) return false;
    for (const key of ['max_iterations', 'concurrency', 'count']) if (key in value && (!Number.isInteger(value[key]) || value[key] <= 0)) return false;
    return true;
  } catch { return false; }
}

export function taskConcurrency(config?: string): number | undefined {
  if (!config || !parseTaskConfig(config)) return undefined;
  const value = JSON.parse(config) as Record<string, unknown>;
  return typeof value.concurrency === 'number' ? value.concurrency : undefined;
}

export type ReportInput = { name: string; type: string; template: string; sections: string[]; target?: string; config?: string; snapshotLines?: string[] };

export function makeReportLines(input: ReportInput): string[] {
  const lines = [`${input.name}报告`, `测试类型：${input.type}`, `模板：${input.template}`];
  const safeTarget = input.target && !/^(?:[a-z]+:\/\/|\/|\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?$)/i.test(input.target) ? input.target : undefined;
  for (const section of input.sections) {
    lines.push(section);
    if (section === '测试概述') {
      if (safeTarget) lines.push(`测试对象：${safeTarget}`);
      if (input.template === '详细版' && input.config && parseTaskConfig(input.config)) {
        const config = JSON.parse(input.config) as Record<string, unknown>;
        const safe = Object.fromEntries(Object.entries(config).filter(([key, value]) => !/(url|uri|ip|port|date|time|version|address|link)/i.test(key) && ['string', 'number', 'boolean'].includes(typeof value) && !/(?:[a-z]+:\/\/|\d{1,3}(?:\.\d{1,3}){3})/i.test(String(value))));
        if (Object.keys(safe).length) lines.push(`测试配置：${JSON.stringify(safe)}`);
      }
    } else if (input.snapshotLines?.length && (section === '执行统计' || section === '详细结果')) {
      lines.push(...input.snapshotLines);
    } else {
      lines.push('待补充');
    }
  }
  return lines;
}

export function makeReportDocx(input: ReportInput): Blob {
  const xml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] || c);
  const paragraph = (value: string, heading = false) => `<w:p><w:pPr>${heading ? '<w:pStyle w:val="Heading1"/>' : ''}</w:pPr><w:r><w:t xml:space="preserve">${xml(value)}</w:t></w:r></w:p>`;
  const body = makeReportLines(input).map(line => paragraph(line, input.sections.includes(line) || line === `${input.name}报告`)).join('');
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`;
  const entries = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: 'word/document.xml', data: documentXml },
  ];
  const encoder = new TextEncoder();
  return createZip(entries.map(entry => ({ name: entry.name, data: encoder.encode(entry.data) })));
}

export function makeReportHtml(input: ReportInput): string {
  const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c);
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${escape(input.name)}报告</title><body>${makeReportLines(input).map(line => input.sections.includes(line) ? `<h2>${escape(line)}</h2>` : `<p>${escape(line)}</p>`).join('')}</body></html>`;
}
