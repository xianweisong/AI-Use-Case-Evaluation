import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeImagePdf} from '../src/lib/reportPdf';
test('PDF has binary-safe byte offsets, matching page count and actual image streams',async()=>{
  const pdf=encodeImagePdf([new Uint8Array([255,216,255,217]),new Uint8Array([255,216,128,217])],100,120);
  const bytes=new Uint8Array(await pdf.arrayBuffer());
  const text=new TextDecoder('latin1').decode(bytes);
  assert.match(text,/^%PDF-1.4/);assert.match(text,/\/Count 2/);
  const xref=Number(text.match(/startxref\n(\d+)/)![1]);assert.equal(new TextDecoder().decode(bytes.slice(xref,xref+4)),'xref');
  const rows=text.slice(text.indexOf('0000000000 65535 f')).split('\n').slice(1,9);
  rows.forEach((row,i)=>{const offset=Number(row.slice(0,10));assert.equal(new TextDecoder().decode(bytes.slice(offset,offset+7)),`${i+1} 0 obj`);});
});
