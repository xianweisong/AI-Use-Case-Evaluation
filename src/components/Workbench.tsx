import React from 'react';
import { readLocalArray } from '../lib/localEvaluation';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Play,
  ArrowRight,
  Plus,
  Monitor,
  Database,
  Cpu,
  Activity,
  Search,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { SystemStat, Task, ResourceUsage } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function annotationCount() {
  try {
    const value = JSON.parse(localStorage.getItem('as-eval-annotations') || '{}');
    return value && typeof value === 'object' ? Object.values(value).reduce<number>((n, rows) => n + (Array.isArray(rows) ? rows.length : 0), 0) : 0;
  } catch { return 0; }
}

const getResourceData = () => {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(d.getHours() - i * 4);
    data.push({
      time: `${String(d.getHours()).padStart(2, '0')}:00`,
      cpu: 30 + (i * 7) % 50,
      memory: 40 + (i * 5) % 40,
      gpu: 20 + (i * 11) % 60,
    });
  }
  return data;
};

const RESOURCE_DATA: ResourceUsage[] = getResourceData();

const QUICK_ENTRIES = [
  { label: '新建评测', icon: Plus, color: 'bg-blue-500', tab: 'evaluation', subTab: 'task-mgmt' },
  { label: '数据导入', icon: Database, color: 'bg-emerald-500', tab: 'data-proc', subTab: 'img-proc' },
  { label: '资源监控', icon: Monitor, color: 'bg-indigo-500', tab: 'resource', subTab: 'res-monitor' },
  { label: '生成报告', icon: Activity, color: 'bg-orange-500', tab: 'evaluation', subTab: 'reports' },
];

interface WorkbenchProps {
  navigate: (tabId: string, subTabId?: string) => void;
}

export default function Workbench({ navigate }: WorkbenchProps) {
  const load = () => readLocalArray<any>('platform-tasks-v1', []);
  const [localTasks, setLocalTasks] = React.useState(load);
  React.useEffect(() => {
    const sync = () => setLocalTasks(load());
    window.addEventListener('platform-local-data', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('platform-local-data', sync); window.removeEventListener('storage', sync); };
  }, []);
  const RECENT_TASKS: Task[] = localTasks.map(t => ({ id: t.id, name: t.name, type: t.type, status: t.status, progress: t.progress || 0, creator: t.user || '当前用户', createTime: t.time }));
  const STATS: SystemStat[] = [
    { label: '累计评测任务', value: String(localTasks.length), trend: 'stable', change: '' },
    { label: '当前运行中', value: String(localTasks.filter(t => t.status === 'running').length), trend: 'stable', change: '' },
    { label: '标注数据量', value: String(annotationCount()), trend: 'stable', change: '' },
    { label: '系统健康度', value: '未接入', trend: 'stable', change: '' },
  ];
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [creatorFilter, setCreatorFilter] = React.useState('');

  const filteredTasks = React.useMemo(() => {
    return RECENT_TASKS.filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           task.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || task.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesCreator = task.creator.toLowerCase().includes(creatorFilter.toLowerCase());
      
      return matchesSearch && matchesType && matchesStatus && matchesCreator;
    });
  }, [searchQuery, typeFilter, statusFilter, creatorFilter, localTasks]);

  const taskTypes = React.useMemo(() => {
    return Array.from(new Set(RECENT_TASKS.map(t => t.type)));
  }, [localTasks]);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat, i) => (
          <div key={i} className="card p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-sm text-[var(--text-secondary)] font-medium">{stat.label}</span>
              <div className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${
                stat.trend === 'up' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 
                stat.trend === 'down' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 
                'text-slate-600 bg-slate-50 dark:bg-slate-900/20'
              }`}>
                {stat.trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : 
                 stat.trend === 'down' ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                {stat.change}
              </div>
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</span>
              {stat.unit && <span className="ml-1 text-sm text-[var(--text-secondary)]">{stat.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resource Usage Chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-[var(--text-primary)]">资源使用情况（示例）</h3>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" /> CPU</div>
              <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" /> 内存</div>
              <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-indigo-500 mr-1.5" /> GPU</div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={RESOURCE_DATA}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
                <Area type="monotone" dataKey="memory" stroke="#10b981" fill="transparent" strokeWidth={2} />
                <Area type="monotone" dataKey="gpu" stroke="#6366f1" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Entries & System Status */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">快速入口</h3>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ENTRIES.map((entry, i) => (
                <button 
                  key={i} 
                  onClick={() => navigate(entry.tab, entry.subTab)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-[var(--border-color)] hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
                >
                  <div className={`w-10 h-10 ${entry.color} rounded-lg flex items-center justify-center text-white mb-2 shadow-lg shadow-blue-500/10`}>
                    <entry.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{entry.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">系统状态</h3>
            <div className="space-y-4">
              {[
                { label: '评测引擎', status: 'normal', icon: Cpu },
                { label: '标注服务', status: 'normal', icon: Database },
                { label: '存储集群', status: 'warning', icon: Activity },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-primary)] flex items-center justify-center mr-3">
                      <s.icon className="w-4 h-4 text-[var(--text-secondary)]" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{s.label}</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${s.status === 'normal' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                    <span className="text-xs text-[var(--text-secondary)]">{s.status === 'normal' ? '未接入' : '未接入'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)]">最近任务</h3>
            <button 
              onClick={() => navigate('evaluation', 'task-mgmt')}
              className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center"
            >
              查看全部 <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input 
                type="text" 
                placeholder="搜索任务名称或ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[var(--text-primary)]"
            >
              <option value="all">所有类型</option>
              {taskTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[var(--text-primary)]"
            >
              <option value="all">所有状态</option>
              <option value="running">进行中</option>
              <option value="completed">已完成</option>
              <option value="failed">已失败</option>
              <option value="pending">待开始</option>
            </select>
            <div className="relative w-40">
              <input 
                type="text" 
                placeholder="创建人..." 
                value={creatorFilter}
                onChange={(e) => setCreatorFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">任务名称</th>
                <th className="px-6 py-3 font-semibold">类型</th>
                <th className="px-6 py-3 font-semibold">状态</th>
                <th className="px-6 py-3 font-semibold">进度</th>
                <th className="px-6 py-3 font-semibold">创建人</th>
                <th className="px-6 py-3 font-semibold">创建时间</th>
                <th className="px-6 py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredTasks.length > 0 ? filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{task.name}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{task.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[var(--text-secondary)]">
                      {task.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {task.status === 'running' && <Play className="w-3 h-3 text-blue-500 mr-1.5 animate-pulse" />}
                      {task.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-500 mr-1.5" />}
                      {task.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-500 mr-1.5" />}
                      {task.status === 'pending' && <Clock className="w-3 h-3 text-slate-400 mr-1.5" />}
                      <span className={cn(
                        "text-xs font-medium",
                        task.status === 'running' ? "text-blue-500" :
                        task.status === 'completed' ? "text-emerald-500" :
                        task.status === 'failed' ? "text-red-500" :
                        "text-slate-400"
                      )}>
                        {task.status === 'running' ? '进行中' :
                         task.status === 'completed' ? '已完成' :
                         task.status === 'failed' ? '已失败' : '待开始'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-24">
                      <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                        <span>{task.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          className={cn(
                            "h-full rounded-full",
                            task.status === 'failed' ? "bg-red-500" : "bg-blue-500"
                          )}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.creator}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.createTime}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => {
                        sessionStorage.setItem('platform-selected-task', task.id);
                        navigate('evaluation', 'task-mgmt');
                      }}
                      className="text-blue-500 hover:text-blue-600 text-xs font-medium"
                    >
                      详情
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                    未找到匹配的任务
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
