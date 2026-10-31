import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Database, 
  Network, 
  Clock, 
  Play, 
  Pause, 
  RefreshCw, 
  ChevronRight, 
  Search, 
  Filter, 
  Trash2, 
  ArrowLeft, 
  BarChart3, 
  Calendar, 
  Server, 
  Monitor, 
  Box,
  TrendingUp,
  Zap,
  Target,
  Timer,
  AlertTriangle,
  FileText,
  Download,
  Maximize2,
  CheckCircle2,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ResourceEvaluationProps {
  activeSubTab: string;
}

type ViewState = 'list' | 'detail';

// Mock data generator for real-time charts
const generateRealTimeData = (count: number) => {
  const now = new Date();
  return Array.from({ length: count }).map((_, i) => {
    const d = new Date(now.getTime() - (count - i) * 60000); // 1 minute per point
    return {
      time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      cpu: Math.floor(Math.random() * 40) + 20,
      memory: Math.floor(Math.random() * 30) + 40,
      gpu: Math.floor(Math.random() * 50) + 10,
      network: Math.floor(Math.random() * 100) + 50,
      disk: Math.floor(Math.random() * 20) + 30,
      throughput: Math.floor(Math.random() * 200) + 800,
      latency: Math.floor(Math.random() * 50) + 100,
      frameDrop: Math.random() * 2,
      processed: Math.floor(Math.random() * 50) + 100,
    };
  });
};

export default function ResourceEvaluation({ activeSubTab }: ResourceEvaluationProps) {
  const [view, setView] = useState<ViewState>('list');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [reportCycle, setReportCycle] = useState('5s');
  const [realTimeData, setRealTimeData] = useState(generateRealTimeData(30));
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filter States
  const [historySearch, setHistorySearch] = useState('');
  const [historyNodeFilter, setHistoryNodeFilter] = useState('所有节点');

  // Mock Data
  const getFormattedDate = (minsAgo: number = 0) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - minsAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const HISTORY_DATA = [
    { name: '人脸识别实时分析任务 #001', node: '服务器', cpu: '32%', mem: '45%', gpu: '28%', duration: '02:45:12', frameDrop: '0.42%', time: getFormattedDate(120) },
    { name: '车辆特征提取任务 #042', node: '本机', cpu: '18%', mem: '32%', gpu: '12%', duration: '01:12:05', frameDrop: '0.15%', time: getFormattedDate(240) },
    { name: '视频结构化处理任务 #108', node: '服务器', cpu: '54%', mem: '68%', gpu: '72%', duration: '05:20:44', frameDrop: '1.24%', time: getFormattedDate(1440) },
  ];

  const filteredHistory = useMemo(() => {
    return HISTORY_DATA.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(historySearch.toLowerCase());
      const matchesNode = historyNodeFilter === '所有节点' || item.node === historyNodeFilter;
      return matchesSearch && matchesNode;
    });
  }, [historySearch, historyNodeFilter]);

  // Simulate real-time updates
  useEffect(() => {
    if (isPaused || !autoRefresh || activeSubTab !== 'res-monitor') return;

    const interval = setInterval(() => {
      setRealTimeData(prev => {
        const newData = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        
        // Simple time increment for mock
        const d = new Date();
        const nextTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

        newData.push({
          time: nextTime,
          cpu: Math.max(10, Math.min(95, last.cpu + (Math.random() * 10 - 5))),
          memory: Math.max(10, Math.min(95, last.memory + (Math.random() * 4 - 2))),
          gpu: Math.max(10, Math.min(95, last.gpu + (Math.random() * 12 - 6))),
          network: Math.max(0, last.network + (Math.random() * 20 - 10)),
          disk: Math.max(10, Math.min(95, last.disk + (Math.random() * 2 - 1))),
          throughput: Math.max(500, last.throughput + (Math.random() * 40 - 20)),
          latency: Math.max(80, last.latency + (Math.random() * 10 - 5)),
          frameDrop: Math.max(0, last.frameDrop + (Math.random() * 0.4 - 0.2)),
          processed: Math.floor(Math.random() * 50) + 100,
        });
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isPaused, autoRefresh, activeSubTab]);

  useEffect(() => {
    setView('list');
  }, [activeSubTab]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <span className="flex items-center text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />运行中</span>;
      case 'completed':
        return <span className="flex items-center text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 font-medium"><CheckCircle2 className="w-3 h-3 mr-1" />已完成</span>;
      case 'error':
        return <span className="flex items-center text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 font-medium"><AlertTriangle className="w-3 h-3 mr-1" />异常</span>;
      default:
        return <span className="flex items-center text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">未运行</span>;
    }
  };

  // --- 1. Resource Monitoring Page ---
  const renderMonitor = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">资源监控</h2>
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5">
            <span className="text-xs font-medium text-[var(--text-secondary)] mr-2">上报周期:</span>
            <select 
              value={reportCycle} 
              onChange={(e) => setReportCycle(e.target.value)}
              className="bg-transparent text-xs font-bold text-blue-500 outline-none cursor-pointer"
            >
              <option value="1s">1秒</option>
              <option value="5s">5秒</option>
              <option value="10s">10秒</option>
              <option value="30s">30秒</option>
              <option value="60s">60秒</option>
            </select>
          </div>
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              "flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all",
              isPaused ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-orange-500 text-white hover:bg-orange-600"
            )}
          >
            {isPaused ? <><Play className="w-4 h-4 mr-2" /> 恢复刷新</> : <><Pause className="w-4 h-4 mr-2" /> 暂停刷新</>}
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="card p-4 flex flex-wrap items-center gap-6">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-[var(--text-secondary)]">任务选择:</span>
          <select className="min-w-[200px] px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none">
            <option>人脸识别实时分析任务 #001</option>
            <option>车辆特征提取任务 #042</option>
          </select>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-[var(--text-secondary)]">节点选择:</span>
          <div className="flex bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-1">
            {['本机', '服务器', '虚拟机'].map(node => (
              <button key={node} className={cn(
                "px-4 py-1 rounded-md text-xs font-medium transition-all",
                node === '服务器' ? "bg-blue-600 text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}>
                {node}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <div className="flex items-center text-xs text-[var(--text-secondary)]">
            <span className={cn("w-2 h-2 rounded-full mr-2", autoRefresh ? 'bg-emerald-500' : 'bg-slate-400')} />
            {autoRefresh ? '自动刷新中' : '手动刷新模式'}
          </div>
          <button 
            onClick={() => setView('detail')}
            className="text-xs font-bold text-blue-500 hover:underline"
          >
            查看详情
          </button>
        </div>
      </div>

      {/* Real-time Resource Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'CPU使用率', value: Math.round(realTimeData[realTimeData.length-1].cpu), unit: '%', icon: Cpu, color: 'blue' },
          { label: '内存使用率', value: Math.round(realTimeData[realTimeData.length-1].memory), unit: '%', icon: Database, color: 'emerald' },
          { label: 'GPU使用率', value: Math.round(realTimeData[realTimeData.length-1].gpu), unit: '%', icon: Zap, color: 'orange' },
          { label: '磁盘使用率', value: Math.round(realTimeData[realTimeData.length-1].disk), unit: '%', icon: HardDrive, color: 'purple' },
        ].map((stat, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg", `bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600`)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}<span className="text-sm font-normal text-[var(--text-secondary)] ml-1">{stat.unit}</span></span>
            </div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Resource Curves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">CPU & 内存曲线</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realTimeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.05} strokeWidth={2} isAnimationActive={false} />
                <Area type="monotone" dataKey="memory" stroke="#10b981" fill="#10b981" fillOpacity={0.05} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">GPU & 网络曲线</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={realTimeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="gpu" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="network" stroke="#a855f7" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  // --- 2. Performance Statistics Page ---
  const renderStats = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">性能统计</h2>
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-[var(--text-secondary)]">选择任务:</span>
          <select className="min-w-[240px] px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none">
            <option>人脸识别实时分析任务 #001</option>
            <option>车辆特征提取任务 #042</option>
          </select>
          <button onClick={() => setView('detail')} className="text-xs font-bold text-blue-500 hover:underline">查看详情</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: '处理目标数量', value: '12,840', icon: Target, color: 'blue' },
          { label: '任务耗时', value: '02:45:12', icon: Clock, color: 'emerald' },
          { label: '平均耗时', value: '142ms', icon: Timer, color: 'orange' },
          { label: '最大耗时', value: '310ms', icon: TrendingUp, color: 'purple' },
          { label: '丢帧率', value: '0.42%', icon: AlertTriangle, color: 'red' },
          { label: '吞吐量', value: '842/s', icon: Zap, color: 'indigo' },
        ].map((stat, i) => (
          <div key={i} className="card p-4">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">{stat.label}</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Stats Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">任务耗时趋势图 (ms)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={realTimeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
                <Tooltip />
                <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">丢帧率趋势图 (%)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realTimeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="frameDrop" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">处理量趋势图 (ops/s)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={realTimeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="processed" fill="#6366f1" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">时间</th>
              <th className="px-6 py-4 font-semibold">处理数量</th>
              <th className="px-6 py-4 font-semibold">耗时 (ms)</th>
              <th className="px-6 py-4 font-semibold">丢帧率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {realTimeData.slice(-10).reverse().map((row, i) => (
              <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{row.time}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-primary)] font-medium">{row.processed}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{Math.round(row.latency)}ms</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{row.frameDrop.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- 3. History Records Page ---
  const renderHistory = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">历史记录</h2>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input 
            type="text" 
            placeholder="任务名称..." 
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none" 
          />
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
          <select className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none">
            <option>时间范围</option>
            <option>最近7天</option>
            <option>最近30天</option>
          </select>
        </div>
        <select 
          value={historyNodeFilter}
          onChange={(e) => setHistoryNodeFilter(e.target.value)}
          className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none text-[var(--text-primary)]"
        >
          <option>所有节点</option>
          <option>本机</option>
          <option>服务器</option>
          <option>虚拟机</option>
        </select>
        <button className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* History Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">任务名称</th>
              <th className="px-6 py-4 font-semibold">节点</th>
              <th className="px-6 py-4 font-semibold">平均CPU</th>
              <th className="px-6 py-4 font-semibold">平均内存</th>
              <th className="px-6 py-4 font-semibold">平均GPU</th>
              <th className="px-6 py-4 font-semibold">任务耗时</th>
              <th className="px-6 py-4 font-semibold">丢帧率</th>
              <th className="px-6 py-4 font-semibold">时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filteredHistory.length > 0 ? filteredHistory.map((item, i) => (
              <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors group">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{item.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.node}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{item.cpu}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{item.mem}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{item.gpu}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{item.duration}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{item.frameDrop}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => { setSelectedTask(item); setView('detail'); }} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded" title="查看详情">
                      <FileText className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded" title="删除记录">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                  未找到匹配的历史记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- 4. Task Resource Detail Page ---
  const renderDetail = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button onClick={() => setView('list')} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">任务资源详情</h2>
        </div>
        <button className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-secondary)] flex items-center">
          <Download className="w-4 h-4 mr-2" /> 导出报告
        </button>
      </div>

      {/* Basic Info */}
      <div className="card p-6">
        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">基本信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">任务名称</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">{selectedTask?.name || '人脸识别实时分析任务 #001'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">任务类型</p>
            <p className="text-sm text-[var(--text-primary)]">计算机视觉 / 实时分析</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">执行节点</p>
            <p className="text-sm text-[var(--text-primary)]">{selectedTask?.node || '服务器'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">执行时间</p>
            <p className="text-sm text-[var(--text-primary)]">{selectedTask?.time || getFormattedDate(120)}</p>
          </div>
        </div>
      </div>

      {/* Resource Stats */}
      <div className="card p-6">
        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">资源统计</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
            <p className="text-2xl font-bold text-blue-500">{selectedTask?.cpu || '32%'}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">平均CPU</p>
          </div>
          <div className="text-center p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
            <p className="text-2xl font-bold text-emerald-500">{selectedTask?.mem || '45%'}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">平均内存</p>
          </div>
          <div className="text-center p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
            <p className="text-2xl font-bold text-orange-500">{selectedTask?.gpu || '28%'}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">平均GPU</p>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="card p-6">
        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">性能统计</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
            <p className="text-2xl font-bold text-indigo-500">12,840</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">处理目标数量</p>
          </div>
          <div className="text-center p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{selectedTask?.duration || '02:45:12'}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">任务耗时</p>
          </div>
          <div className="text-center p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
            <p className="text-2xl font-bold text-red-500">{selectedTask?.frameDrop || '0.42%'}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">丢帧率</p>
          </div>
        </div>
      </div>

      {/* Resource Curves */}
      <div className="card p-6">
        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">资源曲线</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={realTimeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.05} strokeWidth={2} />
              <Area type="monotone" dataKey="memory" stroke="#10b981" fill="#10b981" fillOpacity={0.05} strokeWidth={2} />
              <Area type="monotone" dataKey="gpu" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.05} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Curves */}
      <div className="card p-6">
        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">性能曲线</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={realTimeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="processed" name="处理量" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="latency" name="耗时" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="frameDrop" name="丢帧率" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (view === 'detail') return renderDetail();

    switch (activeSubTab) {
      case 'res-monitor': return renderMonitor();
      case 'perf-stats': return renderStats();
      case 'history-log': return renderHistory();
      default: return renderMonitor();
    }
  };

  return (
    <div className="h-full">
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
    </div>
  );
}
