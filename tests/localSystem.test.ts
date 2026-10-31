import test from 'node:test';
import assert from 'node:assert/strict';
import { initialSystem, validateUser, validateRole, renameRole, removeRole, readSystem, SYSTEM_KEY } from '../src/lib/localSystem.ts';

test('new installation has no invented user identities', () => {
  assert.deepEqual(initialSystem().users, []);
  assert.ok(initialSystem().roles.every(role => role.permissions.length === 0));
});
test('user validation enforces account uniqueness, role references and nonempty names', () => {
  const user = { user: 'abc', name: '姓名', role: '评测员', status: 'enabled' as const, time: '-' };
  const state = { ...initialSystem(), users: [user] };
  assert.match(validateUser({ ...user, user: 'ABC' }, state)!, /已存在/);
  assert.equal(validateUser(user, state, 'abc'), null);
  assert.match(validateUser({ ...user, role: '不存在' }, state, 'abc')!, /有效角色/);
  assert.match(validateUser({ ...user, name: ' ' }, state, 'abc')!, /必填/);
});
test('role rename atomically updates user references and deletion protects referenced roles', () => {
  const state = { ...initialSystem(), users: [{ user: 'abc', name: '姓名', role: '评测员', status: 'enabled' as const, time: '-' }] };
  const next = renameRole(state, '评测员', { name: '新角色', permissions: ['数据处理'], time: '-' });
  assert.equal(next.users[0].role, '新角色');
  assert.equal(state.users[0].role, '评测员');
  assert.throws(() => removeRole(next, '新角色'), /仍有用户使用/);
  assert.equal(removeRole(next, '标注员').roles.length, 2);
  assert.match(validateRole({ name: '超级管理员', permissions: [], time: '-' }, state)!, /已存在/);
  assert.match(validateRole({ name: '新角色', permissions: ['未知模块'], time: '-' }, state)!, /无效权限/);
});
test('stored local records round-trip and corrupted structures are rejected', () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) || null } });
  const state = initialSystem();
  values.set(SYSTEM_KEY, JSON.stringify(state));
  assert.deepEqual(readSystem(), state);
  values.set(SYSTEM_KEY, JSON.stringify({ users: [null], roles: [] }));
  assert.throws(readSystem, /用户数据无效/);
  values.set(SYSTEM_KEY, '{');
  assert.throws(readSystem);
});
