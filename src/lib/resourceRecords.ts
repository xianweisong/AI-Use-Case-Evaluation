export interface ResourceRecord {
  id: string;
  name: string;
  node: string;
  cpu: string | null;
  mem: string | null;
  gpu: string | null;
  duration: string | null;
  frameDrop: string | null;
  time: string;
  source: 'seed' | 'local';
  processed?: string | null;
  latency?: string | null;
  maxLatency?: string | null;
  throughput?: string | null;
}

export function isResourceRecords(value: unknown): value is ResourceRecord[] {
  return Array.isArray(value) && value.every(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.node === 'string' && item.source === 'local');
}

export function resourceValue(value: string | null | undefined) { return value ?? '待补充'; }

export function resourcePoint(record: ResourceRecord) {
  const number = (value: string | null | undefined) => value == null ? null : Number.parseFloat(value);
  return { time: record.time, cpu: number(record.cpu), memory: number(record.mem), gpu: number(record.gpu), disk: null,
    network: null, throughput: number(record.throughput), latency: number(record.latency), frameDrop: number(record.frameDrop), processed: number(record.throughput) };
}
