import test from 'node:test';
import assert from 'node:assert/strict';
import { initialSystem, validateUser, validateRole, renameRole, removeRole, readSystem, mergeLegacySystem, migrateLegacySystem, LEGACY_USERS, LEGACY_ROLES, SYSTEM_KEY } from '../src/lib/localSystem.ts';

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
test('legacy examples add missing users and roles without changing existing identities or permissions', () => {
  const original = initialSystem();
  original.roles[0].permissions = ['数据处理'];
  original.users.push({ user: 'admin', name: '现有管理员', role: '超级管理员', status: 'disabled', time: '-' });
  const merged = mergeLegacySystem(original);
  assert.equal(merged.users.length, 3);
  assert.equal(merged.users[0].name, '现有管理员');
  assert.equal(merged.users[0].status, 'disabled');
  assert.deepEqual(merged.roles[0].permissions, ['数据处理']);
  assert.equal(merged.roles.length, original.roles.length + 3);
  assert.deepEqual(merged.users.slice(1).map(user => user.user), ['eval_01', 'anno_02']);
  assert.equal(LEGACY_USERS.length, 3);
  assert.equal(LEGACY_ROLES.length, 4);
});
test('legacy users receive missing dependency roles without changing custom roles', () => {
  const state = { users: [{ user: 'admin', name: '保留', role: '超级管理员', status: 'enabled' as const, time: '-' }], roles: [{ name: '超级管理员', permissions: ['系统管理'], time: '-' }] };
  const restored = mergeLegacySystem(state);
  assert.deepEqual(restored.users.map(user => user.user), ['admin', 'eval_01', 'anno_02']);
  assert.deepEqual(restored.roles.find(role => role.name === '超级管理员')?.permissions, ['系统管理']);
  assert.deepEqual(restored.roles.find(role => role.name === '评测员')?.permissions, []);
  assert.deepEqual(restored.roles.find(role => role.name === '标注员')?.permissions, []);
});
test('migration backs up exact prior value and does not revive deleted examples', () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  } });
  const original = JSON.stringify({ users: [{ user: 'admin', name: '保留', role: '超级管理员', status: 'enabled', time: '-' }], roles: initialSystem().roles });
  values.set(SYSTEM_KEY, original);
  const restored = migrateLegacySystem();
  assert.equal(restored.users.length, 3);
  assert.equal(restored.users[0].name, '保留');
  const backup = values.get(`platform-data-backup:restore-original-data-v1:${encodeURIComponent(SYSTEM_KEY)}`);
  assert.equal(JSON.parse(backup!).value, original);
  values.set(SYSTEM_KEY, JSON.stringify({ ...restored, users: restored.users.filter(user => user.user !== 'eval_01') }));
  assert.equal(migrateLegacySystem().users.some(user => user.user === 'eval_01'), false);
});
