export function validateInterfaceConfig(input: { name: string; url: string; body: string; responseLimit: number; count: number; timeout: number; protocol?: string; heartbeat?: number; headers?: {key: string; value: string}[]; queryKey?: string; queryValue?: string }): string | null {
  if (!input.name.trim() || !input.url.trim()) return '请填写测试名称和接口地址';
  const endpoint = input.url.trim();
  const protocol = input.protocol || 'HTTP';
  const validEndpoint = protocol === 'gRPC'
    ? /^[A-Za-z_][A-Za-z0-9_.-]*(?::\d+)?$/.test(endpoint)
    : endpoint.startsWith('/') && !endpoint.startsWith('//')
      ? !/\s/.test(endpoint)
      : (() => { try { const url = new URL(endpoint); return (protocol === 'WS' ? ['ws:', 'wss:'] : ['http:', 'https:']).includes(url.protocol) && !!url.hostname; } catch { return false; } })();
  if (!validEndpoint) return '接口地址与协议格式不匹配';
  if (![input.responseLimit, input.count, input.timeout].every(Number.isFinite) || input.responseLimit <= 0 || input.count < 1 || !Number.isInteger(input.count) || input.timeout <= 0) return '执行次数、超时和响应时间限制必须为正数';
  if (input.protocol === 'WS' && input.heartbeat !== undefined && (!Number.isFinite(input.heartbeat) || input.heartbeat <= 0)) return '心跳间隔必须为正数';
  if (input.protocol === 'WS' && (!!input.queryKey?.trim() !== !!input.queryValue?.trim())) return '握手参数 Key 和 Value 必须成对填写';
  if (input.headers?.some(header => !header.key.trim() || !header.value.trim())) return '请求头名称和值不能为空';
  try { JSON.parse(input.body); } catch { return '请求体必须是有效 JSON'; }
  return null;
}
