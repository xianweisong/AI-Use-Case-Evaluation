import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Lock, 
  Server, 
  Monitor, 
  Smartphone, 
  ShieldCheck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Power, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Cpu,
  Database,
  Activity,
  Key,
  BarChart3,
  UserPlus,
  Shield,
  Layout,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LOCAL_MODULES, SYSTEM_KEY, initialSystem, readSystem, migrateLegacySystem, validateUser, validateRole, renameRole, removeRole, type LocalUser, type LocalRole, type LocalSystem } from '../lib/localSystem';
import { createGuardedStorageWriter } from '../lib/seedMigration';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SystemManagementProps {
  activeSubTab: string;
}

type ViewState = 'list' | 'detail';

export default function SystemManagement({ activeSubTab }: SystemManagementProps) {
  const [view, setView] = useState<ViewState>('list');
  const [selectedResource, setSelectedResource] = useState<any>(null);

  // Filter States
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('所有角色');

  const [storageError, setStorageError] = useState('');
  const guardedWrite = React.useRef<ReturnType<typeof createGuardedStorageWriter> | null>(null);
  const [system, setSystem] = useState<LocalSystem>(() => {
    try { return readSystem(); } catch { return initialSystem(); }
  });
  const [selectedRole, setSelectedRole] = useState(system.roles[0]?.name || '');
  const [permissions, setPermissions] = useState<string[]>(system.roles[0]?.permissions || []);
  const [userForm, setUserForm] = useState<LocalUser | null>(null);
  const [roleForm, setRoleForm] = useState<LocalRole | null>(null);
  const [editing, setEditing] = useState<string | undefined>();
  const [formError, setFormError] = useState('');
  const [pendingPermissions, setPendingPermissions] = useState(false);
  useEffect(() => {
    try {
      const restored = migrateLegacySystem();
      guardedWrite.current = createGuardedStorageWriter([SYSTEM_KEY]);
      setSystem(restored);
      setSelectedRole(restored.roles[0]?.name || '');
      setPermissions(restored.roles[0]?.permissions || []);
    } catch (error) { guardedWrite.current = null; setStorageError(error instanceof Error ? error.message : '无法读取本地数据'); }
  }, []);
  const persist = (next: LocalSystem): boolean => {
    if (storageError || !guardedWrite.current) { alert(storageError || '本地数据尚未准备好，请稍后重试'); return false; }
    try { guardedWrite.current(SYSTEM_KEY, next); setSystem(next); return true; }
    catch (error) { alert(error instanceof Error ? error.message : '本地保存失败，数据未修改'); return false; }
  };
  const selectRole = (name: string) => {
    if (pendingPermissions && !confirm('权限修改尚未保存，是否放弃修改？')) return;
    setSelectedRole(name); setPermissions(system.roles.find(role => role.name === name)?.permissions || []); setPendingPermissions(false);
  };
  const openUser = (user?: LocalUser) => {
    if (!system.roles.length) { alert('请先新增角色'); return; }
    setEditing(user?.user); setFormError('');
    setUserForm(user ? { ...user } : { user: '', name: '', role: system.roles[0].name, status: 'enabled', time: new Date().toLocaleString('zh-CN') });
  };
  const openRole = (role?: LocalRole) => {
    setEditing(role?.name); setFormError('');
    setRoleForm(role ? { ...role, permissions: [...role.permissions] } : { name: '', permissions: [], time: new Date().toLocaleDateString('zh-CN') });
  };
  const deleteRole = (role: LocalRole) => {
    try {
      const next = removeRole(system, role.name);
      if (!confirm(`删除本地角色“${role.name}”？`)) return;
      if (persist(next) && selectedRole === role.name) { setSelectedRole(next.roles[0]?.name || ''); setPermissions(next.roles[0]?.permissions || []); setPendingPermissions(false); }
    } catch (error) { alert(error instanceof Error ? error.message : '删除失败'); }
  };

  const filteredUsers = React.useMemo(() => {
    return system.users.filter(u => {
      const matchesSearch = u.user.toLowerCase().includes(userSearch.toLowerCase()) || 
                           u.name.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = userRoleFilter === '所有角色' || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [userSearch, userRoleFilter, system.users]);

  useEffect(() => {
    setView('list');
    setUserForm(null); setRoleForm(null); setFormError('');
  }, [activeSubTab]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
      case 'active':
      case 'safe':
      case 'enabled':
        return <span className="flex items-center text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 font-bold uppercase"><CheckCircle2 className="w-3 h-3 mr-1" /> 运行中</span>;
      case 'stopped':
      case 'inactive':
      case 'disabled':
      case 'offline':
        return <span className="flex items-center text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-bold uppercase"><XCircle className="w-3 h-3 mr-1" /> 已停止</span>;
      case 'error':
      case 'risk':
        return <span className="flex items-center text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 font-bold uppercase"><AlertTriangle className="w-3 h-3 mr-1" /> 异常</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold uppercase">{status}</span>;
    }
  };

  // --- 1. User Management ---
  const renderUserMgmt = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">用户管理</h2>
        <button onClick={() => openUser()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
          <UserPlus className="w-4 h-4 mr-2" /> 新增用户
        </button>
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input 
            type="text" 
            placeholder="搜索用户名、姓名..." 
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none" 
          />
        </div>
        <select 
          value={userRoleFilter}
          onChange={(e) => setUserRoleFilter(e.target.value)}
          className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none text-[var(--text-primary)]"
        >
          <option>所有角色</option>
          {system.roles.map(role => <option key={role.name}>{role.name}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">用户名</th>
              <th className="px-6 py-4 font-semibold">姓名</th>
              <th className="px-6 py-4 font-semibold">角色</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">创建时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filteredUsers.length > 0 ? filteredUsers.map((u, i) => (
              <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{u.user}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{u.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{u.role}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    u.status === 'enabled' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                  )}>
                    {u.status === 'enabled' ? '启用' : '禁用'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{u.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button title="编辑用户" onClick={() => openUser(u)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded"><Edit2 className="w-4 h-4" /></button>
                    <button title="删除用户" onClick={() => { if (confirm(`删除本地用户“${u.user}”？`)) persist({ ...system, users: system.users.filter(user => user.user !== u.user) }); }} className="p-1.5 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                    {u.status === 'enabled' ? (
                      <button onClick={() => persist({ ...system, users: system.users.map(user => user.user === u.user ? { ...user, status: 'disabled' } : user) })} className="p-1.5 hover:bg-orange-50 text-orange-500 rounded" title="禁用"><XCircle className="w-4 h-4" /></button>
                    ) : (
                      <button onClick={() => persist({ ...system, users: system.users.map(user => user.user === u.user ? { ...user, status: 'enabled' } : user) })} className="p-1.5 hover:bg-emerald-50 text-emerald-500 rounded" title="启用"><CheckCircle2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                  未找到匹配的用户
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- 2. Permission Management ---
  const renderPermMgmt = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">权限管理</h2>
        <button onClick={() => openRole()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
          <Plus className="w-4 h-4 mr-2" /> 新增角色
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase">角色列表</h3>
            </div>
            <div className="divide-y divide-[var(--border-color)]">
              {system.roles.map((r) => (
                <div key={r.name} onClick={() => selectRole(r.name)} className={cn(
                  "px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-primary)] cursor-pointer transition-colors",
                  selectedRole === r.name && "bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-600"
                )}>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{r.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">{r.permissions.length} 个权限 · {r.time}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button title="编辑角色" onClick={event => { event.stopPropagation(); openRole(r); }} className="p-1 hover:bg-blue-50 text-blue-500 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button title="删除角色" onClick={event => { event.stopPropagation(); deleteRole(r); }} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase flex items-center">
                <Shield className="w-4 h-4 mr-2 text-blue-500" /> 权限配置: {selectedRole || '请先新增角色'}
              </h3>
              <button disabled={!selectedRole} onClick={() => {
                if (persist({ ...system, roles: system.roles.map(role => role.name === selectedRole ? { ...role, permissions } : role) })) { setPendingPermissions(false); alert('权限配置已保存至本浏览器；不提供访问控制'); }
              }} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all">
                保存权限
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {LOCAL_MODULES.map((module) => (
                <div key={module} className="p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] flex items-center justify-between group hover:border-blue-500/50 transition-all">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center mr-3">
                      <Layout className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{module}</span>
                  </div>
                  <input type="checkbox" aria-label={module} disabled={!selectedRole} checked={permissions.includes(module)} onChange={event => { setPermissions(previous => event.target.checked ? [...previous, module] : previous.filter(permission => permission !== module)); setPendingPermissions(true); }} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- 3. Virtualization Management ---
  const renderVMgmt = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">虚拟化管理</h2>
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5">
            <Key className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-xs font-medium text-[var(--text-secondary)]">授权: </span>
            <span className="text-xs font-bold text-blue-600 ml-1">2点 / 4物理CPU</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'CPU使用率', value: 42, color: '#3b82f6', icon: Cpu },
          { label: '内存使用率', value: 68, color: '#10b981', icon: Database },
          { label: '虚拟机数量', value: 12, color: '#f59e0b', icon: Server },
        ].map((stat, i) => (
          <div key={i} className="card p-5 flex items-center">
            <div className={cn("p-3 rounded-xl mr-4", i === 0 ? 'bg-blue-50 text-blue-600' : i === 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600')}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">{stat.label}</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}{i < 2 ? '%' : ''}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">虚拟机名称</th>
              <th className="px-6 py-4 font-semibold">CPU核心</th>
              <th className="px-6 py-4 font-semibold">内存大小</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">创建时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {[
              { name: 'VM-AI-EVAL-01', cpu: 8, mem: '16GB', status: 'running', time: '2026-02-01' },
              { name: 'VM-DATA-PROC-02', cpu: 16, mem: '32GB', status: 'stopped', time: '2026-02-10' },
              { name: 'VM-TEST-NODE-03', cpu: 4, mem: '8GB', status: 'running', time: '2026-02-15' },
            ].map((vm, i) => (
              <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                  <button onClick={() => { setSelectedResource(vm); setView('detail'); }} className="hover:text-blue-500 hover:underline">
                    {vm.name}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{vm.cpu} 核</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{vm.mem}</td>
                <td className="px-6 py-4">{getStatusBadge(vm.status)}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{vm.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {vm.status === 'running' ? (
                      <button className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="停止"><Power className="w-4 h-4" /></button>
                    ) : (
                      <button className="p-1.5 hover:bg-emerald-50 text-emerald-500 rounded" title="启动"><Power className="w-4 h-4" /></button>
                    )}
                    <button className="p-1.5 hover:bg-blue-50 text-blue-500 rounded" title="重启"><RotateCcw className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- 4. Cloud Desktop Management ---
  const renderCloudDesktop = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">云桌面管理</h2>
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5">
            <Monitor className="w-4 h-4 text-emerald-500 mr-2" />
            <span className="text-xs font-medium text-[var(--text-secondary)]">授权: </span>
            <span className="text-xs font-bold text-emerald-600 ml-1">50点 (已用 32, 剩余 18)</span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">桌面名称</th>
              <th className="px-6 py-4 font-semibold">分配用户</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">创建时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {[
              { name: 'DESKTOP-ZHAN-01', user: '张三', status: 'active', time: '2026-02-01' },
              { name: 'DESKTOP-LI-02', user: '李四', status: 'inactive', time: '2026-02-10' },
              { name: 'DESKTOP-WANG-03', user: '王五', status: 'active', time: '2026-02-15' },
            ].map((d, i) => (
              <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                  <button onClick={() => { setSelectedResource(d); setView('detail'); }} className="hover:text-blue-500 hover:underline">
                    {d.name}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{d.user}</td>
                <td className="px-6 py-4">{getStatusBadge(d.status)}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{d.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold hover:bg-blue-100">分配</button>
                    <button className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100">回收</button>
                    <button className="p-1.5 hover:bg-slate-100 text-slate-500 rounded"><Power className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- 5. Terminal Management ---
  const renderTerminal = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">终端管理</h2>
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5">
            <Smartphone className="w-4 h-4 text-orange-500 mr-2" />
            <span className="text-xs font-medium text-[var(--text-secondary)]">授权: </span>
            <span className="text-xs font-bold text-orange-600 ml-1">50点 (已用 45, 剩余 5)</span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">终端名称</th>
              <th className="px-6 py-4 font-semibold">IP地址</th>
              <th className="px-6 py-4 font-semibold">安全状态</th>
              <th className="px-6 py-4 font-semibold">最后在线时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {[
              { name: 'TERMINAL-P01', ip: '192.168.1.101', status: 'safe', time: '2026-03-01 16:00' },
              { name: 'TERMINAL-P02', ip: '192.168.1.102', status: 'risk', time: '2026-03-01 15:45' },
              { name: 'TERMINAL-P03', ip: '192.168.1.103', status: 'offline', time: '2026-02-28 10:20' },
            ].map((t, i) => (
              <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                  <button onClick={() => { setSelectedResource(t); setView('detail'); }} className="hover:text-blue-500 hover:underline">
                    {t.name}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{t.ip}</td>
                <td className="px-6 py-4">{getStatusBadge(t.status)}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{t.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button className="p-1.5 hover:bg-blue-50 text-blue-500 rounded" title="查看"><Search className="w-4 h-4" /></button>
                    {t.status !== 'offline' ? (
                      <button className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="禁用"><XCircle className="w-4 h-4" /></button>
                    ) : (
                      <button className="p-1.5 hover:bg-emerald-50 text-emerald-500 rounded" title="启用"><CheckCircle2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );


  // --- 7. Resource Details ---
  const renderResourceDetail = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button onClick={() => setView('list')} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">资源详情</h2>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(selectedResource?.status || 'running')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6 space-y-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase flex items-center">
              <Activity className="w-4 h-4 mr-2 text-blue-500" /> 资源信息
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">资源名称</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{selectedResource?.name || 'VM-AI-EVAL-01'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">资源类型</p>
                <p className="text-sm text-[var(--text-primary)]">
                  {activeSubTab === 'v-mgmt' ? '虚拟机' : activeSubTab === 'cloud-desktop' ? '云桌面' : '终端'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">资源状态</p>
                <p className="text-sm text-[var(--text-primary)]">正常运行</p>
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-emerald-500" /> 实时负载
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">CPU 使用率</span>
                  <span className="font-bold text-blue-500">42%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '42%' }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">内存 使用率</span>
                  <span className="font-bold text-emerald-500">68%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68%' }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">磁盘 使用率</span>
                  <span className="font-bold text-orange-500">25%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: '25%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card p-6 h-full flex flex-col">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">负载趋势 (24h)</h3>
            <div className="flex-1 min-h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { time: '00:00', cpu: 20, mem: 40 },
                  { time: '04:00', cpu: 15, mem: 35 },
                  { time: '08:00', cpu: 45, mem: 60 },
                  { time: '12:00', cpu: 80, mem: 75 },
                  { time: '16:00', cpu: 65, mem: 70 },
                  { time: '20:00', cpu: 30, mem: 50 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="cpu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="mem" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (view === 'detail') return renderResourceDetail();

    switch (activeSubTab) {
      case 'user-mgmt': return renderUserMgmt();
      case 'perm-mgmt': return renderPermMgmt();
      case 'v-mgmt': return renderVMgmt();
      case 'cloud-desktop': return renderCloudDesktop();
      case 'terminal': return renderTerminal();
      default: return renderUserMgmt();
    }
  };

  return (
    <div className="h-full">
      {(activeSubTab === 'user-mgmt' || activeSubTab === 'perm-mgmt') && <p className="text-xs text-[var(--text-secondary)] mb-4">浏览器本地管理，不提供登录认证或访问控制。{storageError}</p>}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeSubTab}-${view}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
      {(userForm || roleForm) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => { setUserForm(null); setRoleForm(null); }}>
          <form role="dialog" aria-modal="true" aria-label={userForm ? '用户信息' : '角色信息'} className="card p-6 space-y-6 w-full max-w-lg" onClick={event => event.stopPropagation()} onSubmit={event => {
            event.preventDefault();
            if (userForm) {
              const user = { ...userForm, user: userForm.user.trim(), name: userForm.name.trim() };
              const error = validateUser(user, system, editing);
              if (error) { setFormError(error); return; }
              const next = { ...system, users: editing ? system.users.map(item => item.user === editing ? user : item) : [...system.users, user] };
              if (persist(next)) setUserForm(null);
            } else if (roleForm) {
              const role = { ...roleForm, name: roleForm.name.trim() };
              const error = validateRole(role, system, editing);
              if (error) { setFormError(error); return; }
              const next = editing ? renameRole(system, editing, role) : { ...system, roles: [...system.roles, role] };
              if (persist(next)) {
                if (selectedRole === editing || !selectedRole) { setSelectedRole(role.name); setPermissions(role.permissions); setPendingPermissions(false); }
                if (userRoleFilter === editing) setUserRoleFilter(role.name);
                setRoleForm(null);
              }
            }
          }}>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{editing ? '编辑' : '新增'}{userForm ? '用户' : '角色'}</h3>
            {userForm ? <>
              <label className="block text-sm text-[var(--text-secondary)]">用户名<input required maxLength={40} value={userForm.user} onChange={event => setUserForm({ ...userForm, user: event.target.value })} className="w-full mt-2 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none" /></label>
              <label className="block text-sm text-[var(--text-secondary)]">姓名<input required maxLength={50} value={userForm.name} onChange={event => setUserForm({ ...userForm, name: event.target.value })} className="w-full mt-2 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none" /></label>
              <label className="block text-sm text-[var(--text-secondary)]">角色<select value={userForm.role} onChange={event => setUserForm({ ...userForm, role: event.target.value })} className="w-full mt-2 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none">{system.roles.map(role => <option key={role.name}>{role.name}</option>)}</select></label>
              <label className="block text-sm text-[var(--text-secondary)]">状态<select value={userForm.status} onChange={event => setUserForm({ ...userForm, status: event.target.value as LocalUser['status'] })} className="w-full mt-2 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none"><option value="enabled">启用</option><option value="disabled">禁用</option></select></label>
            </> : <label className="block text-sm text-[var(--text-secondary)]">角色名称<input required maxLength={30} value={roleForm!.name} onChange={event => setRoleForm({ ...roleForm!, name: event.target.value })} className="w-full mt-2 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none" /></label>}
            {formError && <p role="alert" className="text-sm text-red-500">{formError}</p>}
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={() => { setUserForm(null); setRoleForm(null); }} className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm">取消</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">保存至本浏览器</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
