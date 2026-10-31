import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInterfaceConfig } from '../src/lib/interfaceWorkflows';

const valid = { name: '车辆接口', url: '/api/vehicle', body: '{}', responseLimit: 500, count: 1, timeout: 30 };

test('interface test configuration requires selected name and endpoint', () => {
  assert.equal(validateInterfaceConfig(valid), null);
  assert.match(validateInterfaceConfig({ ...valid, name: ' ' }) || '', /名称/);
  assert.match(validateInterfaceConfig({ ...valid, url: ' ' }) || '', /地址/);
});

test('interface test configuration rejects unusable numeric and JSON fields', () => {
  assert.match(validateInterfaceConfig({ ...valid, count: 0 }) || '', /正数/);
  assert.match(validateInterfaceConfig({ ...valid, count: 1.5 }) || '', /正数/);
  assert.match(validateInterfaceConfig({ ...valid, responseLimit: -1 }) || '', /正数/);
  assert.match(validateInterfaceConfig({ ...valid, body: '{' }) || '', /JSON/);
  assert.match(validateInterfaceConfig({ ...valid, url: 'bad endpoint' }) || '', /协议/);
  assert.equal(validateInterfaceConfig({ ...valid, protocol: 'WS', url: 'wss://example.test/ws' }), null);
  assert.match(validateInterfaceConfig({ ...valid, protocol: 'WS', url: 'https://example.test/ws' }) || '', /协议/);
  assert.equal(validateInterfaceConfig({ ...valid, protocol: 'gRPC', url: 'FaceService' }), null);
  assert.match(validateInterfaceConfig({ ...valid, protocol: 'gRPC', url: 'bad service' }) || '', /协议/);
  assert.match(validateInterfaceConfig({ ...valid, protocol: 'WS', url: '/stream', heartbeat: 0 }) || '', /心跳/);
  assert.match(validateInterfaceConfig({ ...valid, protocol: 'WS', url: '/stream', queryKey: 'token' }) || '', /成对/);
  assert.equal(validateInterfaceConfig({ ...valid, protocol: 'WS', url: '/stream', queryKey: 'token', queryValue: 'abc' }), null);
  assert.match(validateInterfaceConfig({ ...valid, headers: [{ key: '', value: 'application/json' }] }) || '', /请求头/);
});
