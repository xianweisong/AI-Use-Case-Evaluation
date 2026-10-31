import type { LocalRun, LocalCheck } from './localEvaluation';
export type SampleProtocol = 'HTTP' | 'WS' | 'gRPC';
export interface InterfaceSampleConfig {
  id: string; name: string; protocol: SampleProtocol; address: string; version: string;
  method: string; body: string; expectedStatus: string; timeLimit: number; repeat: number; timeout: number;
  https: boolean; certificate: string; tls: string; queryKey: string; queryValue: string; heartbeat: number;
  service: string; rpcMethod: string; proto: string; headers: { key: string; value: string }[];
}
export function createInterfaceSample(protocol: SampleProtocol = 'HTTP'): InterfaceSampleConfig {
  return { id: `sample-${protocol}`, name: `${protocol} 隔离样例测试`, protocol,
    address: `sample://${protocol.toLowerCase()}/face`, version: 'v1.0.0', method: 'POST',
    body: JSON.stringify(protocol === 'WS' ? { type: 'detect', image: 'sample-image' }
      : protocol === 'gRPC' ? { image: { data: 'sample-image', type: 'FACE' } } : { image_base64: 'sample-image' }, null, 2),
    expectedStatus: protocol === 'HTTP' ? '200' : protocol === 'WS' ? '101' : '0',
    timeLimit: 500, repeat: 1, timeout: 30, https: true, certificate: '系统默认', tls: 'Auto',
    queryKey: '', queryValue: '', heartbeat: 30, service: 'FaceService', rpcMethod: 'ExtractFeatures',
    proto: 'syntax = "proto3"; service FaceService { rpc ExtractFeatures (Request) returns (Response); }',
    headers: [{ key: 'Content-Type', value: 'application/json' }] };
}

// Explicit fields exclude list-only decorations (url/status/time) from run snapshots.
export function interfaceConfigFingerprint(config: InterfaceSampleConfig): string {
  return JSON.stringify(Object.fromEntries(Object.keys(createInterfaceSample()).map(key => {
    const value = config[key as keyof InterfaceSampleConfig];
    return [key, key === 'headers' && Array.isArray(value)
      ? value.map(header => ({ key: header.key, value: header.value })) : value];
  })));
}

export function matchesInterfaceReport(report: any, config: InterfaceSampleConfig): boolean {
  try {
    return report?.taskId === config.id && report.run?.mode === 'local-sample' && !!report.sampleConfig
      && interfaceConfigFingerprint(report.sampleConfig) === interfaceConfigFingerprint(config);
  } catch { return false; }
}
export function validateInterfaceConfig(config: InterfaceSampleConfig) {
  if (!config.name.trim()) throw new Error('请输入测试名称');
  if (!['HTTP', 'WS', 'gRPC'].includes(config.protocol)) throw new Error('不支持的样例协议');
  if (!config.address.startsWith(`sample://${config.protocol.toLowerCase()}/`)) throw new Error('仅支持 sample:// 隔离样例；真实地址需后端及目标系统，本页面不会发送请求');
  if (!Number.isInteger(config.repeat) || config.repeat < 1 || config.repeat > 100) throw new Error('样例执行次数应为1–100');
  if (!Number.isFinite(config.timeLimit) || config.timeLimit < 0 || !Number.isFinite(config.timeout) || config.timeout <= 0) throw new Error('耗时限制和超时配置无效');
  if (config.body.length > 100000 || config.proto.length > 100000) throw new Error('样例内容不能超过100KB');
}
/** Local JSON/schema fixtures only. No request, socket, code evaluation or protobuf transport. */
export function runInterfaceSample(config: InterfaceSampleConfig): LocalRun {
  validateInterfaceConfig(config);
  const checks: LocalCheck[] = [];
  const start = performance.now();
  const check = (item: string, action: () => boolean) => {
    const begin = performance.now(); let passed = false; let error = '-';
    try { passed = action(); if (!passed) error = '离线样例断言不匹配'; }
    catch (e) { error = e instanceof Error ? e.message : '离线校验失败'; }
    checks.push({ item, result: passed ? 'success' : 'failed', cost: `${(performance.now() - begin).toFixed(3)}ms`, error });
  };
  for (let iteration = 1; iteration <= config.repeat; iteration++) {
    const prefix = `${config.protocol}样例 #${iteration}：`;
    let body: any;
    check(prefix + '消息JSON解析', () => { body = JSON.parse(config.body); return body !== null && typeof body === 'object'; });
    if (config.protocol === 'HTTP') {
      const fixture = { status: 200, body: { status: 'OK', data: { faces: [] } } };
      check(prefix + '请求方式与请求头配置', () => ['GET', 'POST', 'PUT', 'DELETE'].includes(config.method) && config.headers.every(header => !!header.key.trim() && !/[\r\n]/.test(header.key + header.value)));
      check(prefix + 'HTTP状态字段（非连接）', () => String(fixture.status) === config.expectedStatus);
      check(prefix + '请求样例字段 image_base64', () => typeof body?.image_base64 === 'string' && body.image_base64.length > 0);
      check(prefix + '响应样例 $.status / $.data.faces', () => fixture.body.status === 'OK' && Array.isArray(fixture.body.data.faces));
    } else if (config.protocol === 'WS') {
      const message = JSON.parse('{"type":"result","data":{"faces":[]}}');
      check(prefix + '握手状态样例（未建连接）', () => config.expectedStatus === '101');
      check(prefix + '发送消息 type / image', () => body?.type === 'detect' && typeof body?.image === 'string');
      check(prefix + '接收消息样例结构', () => message.type === 'result' && Array.isArray(message.data.faces));
      check(prefix + '心跳配置', () => Number.isFinite(config.heartbeat) && config.heartbeat > 0);
    } else {
      check(prefix + 'gRPC状态样例（未调用服务）', () => config.expectedStatus === '0');
      check(prefix + 'Proto文本中的服务及方法（非编译）', () => !!config.service && !!config.rpcMethod && config.proto.includes(`service ${config.service}`) && config.proto.includes(`rpc ${config.rpcMethod}`));
      check(prefix + 'Protobuf JSON映射样例字段', () => typeof body?.image?.data === 'string' && body.image.type === 'FACE');
    }
  }
  const elapsed = performance.now() - start;
  check('浏览器本地断言耗时限制（非网络响应时间）', () => elapsed <= config.timeLimit && elapsed <= config.timeout * 1000);
  const passed = checks.filter(c => c.result === 'success').length;
  return { mode: 'local-sample', checks, durationMs: performance.now() - start, passed, failed: checks.length - passed };
}

export function compareVersionSamples(baseVersion: string, targetVersion: string) {
  const profile = { method: 'GET', schema: 'id,name' };
  const face = { method: 'POST', schema: 'face_id:optional' };
  const versions: Record<string, Record<string, { method: string; schema: string }>> = {
    'v1.1.0': { '/profile': profile, '/face': face },
    'v1.2.0': { '/profile': profile, '/face': face, '/export': { method: 'POST', schema: 'csv' } },
    'v1.3.0': { '/profile': { ...profile, schema: 'id,name,bio:optional' }, '/face': { ...face, schema: 'face_id:required' }, '/logout': { method: 'POST', schema: '{}' } },
    'v1.4.0-beta': { '/profile': { ...profile, schema: 'id,name,bio:optional' }, '/face': { ...face, schema: 'face_id:required' }, '/logout': { method: 'POST', schema: '{}' }, '/search': { method: 'GET', schema: 'query:required' } }
  };
  const base = versions[baseVersion] || {}, target = versions[targetVersion] || {};
  return [...new Set([...Object.keys(base), ...Object.keys(target)])].flatMap(path => {
    const before = base[path], after = target[path];
    if (JSON.stringify(before) === JSON.stringify(after)) return [];
    const type = !before ? 'added' : !after ? 'deleted' : 'modified';
    const impact = type === 'deleted' || (after?.schema.includes(':required') && !before?.schema.includes(':required')) ? 'breaking' : type === 'modified' ? 'low' : 'none';
    return [{ path, method: (after || before).method, type, impact,
      description: `${before?.schema || '不存在'} → ${after?.schema || '不存在'}（预制结构样例）` }];
  });
}
