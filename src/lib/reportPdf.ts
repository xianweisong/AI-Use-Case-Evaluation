/** A self-contained PDF export: system fonts are rasterized to preserve Chinese glyphs offline. */
export async function createReportPdf(lines: string[]): Promise<Blob> {
  const width = 1240, height = 1754, margin = 90, lineHeight = 42;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持 PDF 绘制，请使用 HTML 导出。');
  await document.fonts.ready;
  ctx.font = '26px sans-serif';
  const wrapped: string[] = [];
  for (const paragraph of lines) {
    for (const line of String(paragraph).split('\n')) {
      let current = '';
      for (const character of line) {
        if (current && ctx.measureText(current + character).width > width - margin * 2) { wrapped.push(current); current = ''; }
        current += character;
      }
      wrapped.push(current);
    }
  }
  const perPage = Math.floor((height - margin * 2 - 70) / lineHeight);
  const pages: Uint8Array[] = [];
  for (let start = 0; start < Math.max(1,wrapped.length); start += perPage) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,width,height);
    ctx.fillStyle = '#172033'; ctx.font = '26px sans-serif'; ctx.textBaseline = 'top';
    wrapped.slice(start,start + perPage).forEach((line,index) => ctx.fillText(line,margin,margin + index * lineHeight));
    ctx.font = '20px sans-serif'; ctx.fillText(`${Math.floor(start / perPage) + 1} / ${Math.max(1,Math.ceil(wrapped.length / perPage))}`,width / 2,height - margin);
    const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PDF 页面生成失败')), 'image/jpeg',0.92));
    pages.push(new Uint8Array(await blob.arrayBuffer()));
  }
  return encodeImagePdf(pages,width,height);
}

export function encodeImagePdf(images: Uint8Array[], width: number, height: number): Blob {
  const encode = (s:string) => new TextEncoder().encode(s);
  const objects: Uint8Array[][] = [[],[encode('<< /Type /Catalog /Pages 2 0 R >>')],[]];
  const kids: string[] = [];
  images.forEach((image,index) => {
    const page = 3 + index * 3, content = page + 1, imageId = page + 2;
    kids.push(`${page} 0 R`);
    objects[page] = [encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im${index} ${imageId} 0 R >> >> /Contents ${content} 0 R >>`)];
    const stream=encode(`q 595.28 0 0 841.89 0 0 cm /Im${index} Do Q`);
    objects[content] = [encode(`<< /Length ${stream.length} >>\nstream\n`),stream,encode('\nendstream')];
    objects[imageId] = [encode(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),image,encode('\nendstream')];
  });
  objects[2]=[encode(`<< /Type /Pages /Count ${images.length} /Kids [${kids.join(' ')}] >>`)];
  const chunks: Uint8Array[]=[encode('%PDF-1.4\n%offline-report\n')], offsets=[0];
  let position=chunks[0].length;
  for(let id=1;id<objects.length;id++) {
    offsets[id]=position;
    const parts=[encode(`${id} 0 obj\n`),...objects[id],encode('\nendobj\n')];
    chunks.push(...parts);position+=parts.reduce((sum,p)=>sum+p.length,0);
  }
  const xref=position;
  chunks.push(encode(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return new Blob(chunks,{type:'application/pdf'});
}
