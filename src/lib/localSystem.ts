import { backupLocalValues } from './seedMigration';

export const LOCAL_MODULES = ['评测管理', '数据标注', '接口评测', '资源评测', '数据处理', '结果校验', '系统管理'];
export interface LocalUser { user: string; name: string; role: string; status: 'enabled' | 'disabled'; time: string }
export interface LocalRole { name: string; permissions: string[]; time: string }
export interface LocalSystem { users: LocalUser[]; roles: LocalRole[] }
export const SYSTEM_KEY = 'platform-local-system-v1';
const SYSTEM_MIGRATION = 'platform-local-system-demo-restore-v1';
const BACKUP_VERSION = 'restore-original-data-v1';
export const LEGACY_USERS: LocalUser[] = [
  { user: 'admin', name: '系统管理员', role: '超级管理员', status: 'enabled', time: '2026-01-01 10:00' },
  { user: 'eval_01', name: '张三', role: '评测员', status: 'enabled', time: '2026-02-15 14:20' },
  { user: 'anno_02', name: '李四', role: '标注员', status: 'disabled', time: '2026-02-20 09:30' },
];
export const LEGACY_ROLES: LocalRole[] = [
  { name: '超级管理员', permissions: [...LOCAL_MODULES], time: '2026-01-01' },
  { name: '评测管理员', permissions: ['评测管理', '接口评测', '资源评测', '结果校验'], time: '2026-01-10' },
  { name: '普通评测员', permissions: ['评测管理', '接口评测', '资源评测'], time: '2026-02-01' },
  { name: '数据标注员', permissions: ['数据标注', '数据处理'], time: '2026-02-05' },
];
export function initialSystem(): LocalSystem {
  return { users: [], roles: ['超级管理员', '评测员', '标注员'].map(name => ({ name, permissions: [], time: '-' })) };
}
export function validateUser(user: LocalUser, state: LocalSystem, original?: string): string | null {
  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(user.user)) return '用户名须为 3–40 位字母、数字、下划线、点或短横线';
  if (!user.name.trim() || user.name.trim().length > 50) return '姓名为必填项，最长 50 字';
  if (!state.roles.some(role => role.name === user.role)) return '请选择有效角色';
  if (state.users.some(item => item.user !== original && item.user.toLowerCase() === user.user.toLowerCase())) return '用户名已存在';
  return null;
}
export function validateRole(role: LocalRole, state: LocalSystem, original?: string): string | null {
  if (!role.name.trim() || role.name.trim().length > 30) return '角色名称为必填项，最长 30 字';
  if (state.roles.some(item => item.name !== original && item.name.toLowerCase() === role.name.toLowerCase())) return '角色名称已存在';
  if (role.permissions.some(permission => !LOCAL_MODULES.includes(permission))) return '包含无效权限项目';
  return null;
}
export function renameRole(state: LocalSystem, original: string, role: LocalRole): LocalSystem {
  const error = validateRole(role, state, original);
  if (error) throw new Error(error);
  return { roles: state.roles.map(item => item.name === original ? role : item), users: state.users.map(user => user.role === original ? { ...user, role: role.name } : user) };
}
export function removeRole(state: LocalSystem, name: string): LocalSystem {
  if (state.users.some(user => user.role === name)) throw new Error('该角色仍有用户使用，请先修改用户角色');
  return { ...state, roles: state.roles.filter(role => role.name !== name) };
}
export function readSystem(): LocalSystem {
  const stored = localStorage.getItem(SYSTEM_KEY);
  if (!stored) return initialSystem();
  const state = JSON.parse(stored) as LocalSystem;
  if (!Array.isArray(state?.users) || !Array.isArray(state?.roles)) throw new Error('本地用户数据格式无效');
  const validRoles: LocalRole[] = [];
  for (const role of state.roles) {
    if (typeof role?.name !== 'string' || !Array.isArray(role.permissions) || typeof role.time !== 'string' || validateRole(role, { roles: validRoles, users: [] })) throw new Error('本地角色数据无效');
    validRoles.push(role);
  }
  const validUsers: LocalUser[] = [];
  for (const user of state.users) {
    if (typeof user?.user !== 'string' || typeof user.name !== 'string' || typeof user.time !== 'string' || !['enabled', 'disabled'].includes(user.status) || validateUser(user, { roles: validRoles, users: validUsers })) throw new Error('本地用户数据无效');
    validUsers.push(user);
  }
  return state;
}

export function mergeLegacySystem(existing: LocalSystem): LocalSystem {
  const roles = [...existing.roles];
  const roleNames = new Set(roles.map(role => role.name.toLowerCase()));
  for (const role of LEGACY_ROLES) if (!roleNames.has(role.name.toLowerCase())) { roles.push(role); roleNames.add(role.name.toLowerCase()); }
  // The historical sample users reference these two roles, which were not
  // listed in the old role panel. Add only missing dependencies, with no
  // invented effective permissions; an existing role always wins unchanged.
  for (const role of initialSystem().roles.filter(role => LEGACY_USERS.some(user => user.role === role.name))) {
    if (!roleNames.has(role.name.toLowerCase())) { roles.push(role); roleNames.add(role.name.toLowerCase()); }
  }
  const users = [...existing.users];
  const userNames = new Set(users.map(user => user.user.toLowerCase()));
  for (const user of LEGACY_USERS) if (!userNames.has(user.user.toLowerCase()) && roleNames.has(user.role.toLowerCase())) { users.push(user); userNames.add(user.user.toLowerCase()); }
  return { users, roles };
}

export function migrateLegacySystem(): LocalSystem {
  const state = readSystem();
  if (localStorage.getItem(SYSTEM_MIGRATION)) return state;
  const next = mergeLegacySystem(state);
  const previous = localStorage.getItem(SYSTEM_KEY);
  backupLocalValues([SYSTEM_KEY], BACKUP_VERSION);
  try {
    localStorage.setItem(SYSTEM_KEY, JSON.stringify(next));
    localStorage.setItem(SYSTEM_MIGRATION, 'done');
    return next;
  } catch (error) {
    try { if (previous === null) localStorage.removeItem(SYSTEM_KEY); else localStorage.setItem(SYSTEM_KEY, previous); } catch { /* retain backup when rollback is unavailable */ }
    throw error;
  }
}
