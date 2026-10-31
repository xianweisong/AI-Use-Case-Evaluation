import React, { useState, useMemo, useEffect } from 'react';
import { useNavigationReset } from '../lib/useNavigationReset';
import { readLocalArray } from '../lib/localEvaluation';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  ChevronRight, 
  ArrowLeft, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  FileText, 
  Layers, 
  History, 
  Settings, 
  Server, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Plus,
  Trash2,
  Download,
  Eye,
  ArrowRightLeft,
  Activity,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie,
  LineChart,
  Line,
  Legend
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ResultVerificationProps {
  activeSubTab: string;
}

type ViewState = 'list' | 'detail' | 'compare' | 'analysis';

interface TestResult {
  id: string;
  name: string;
  type: string;
  taskName: string;
  status: 'success' | 'failed' | 'warning';
  generationTime: string;
  duration: string;
  successRate: number;
  failureRate: number;
  config: string;
  node: string;
  items: TestItem[];
}

interface TestItem {
  name: string;
  value: string | number;
  status: 'success' | 'failed' | 'warning';
  description?: string;
}

// Compare the union of fields, including missing fields and status-only changes.
export function compareResultItems(results: { items: TestItem[] }[]) {
  const names = [...new Set(results.flatMap(result => result.items.map(item => item.name)))];
  return names.map(name => {
    const items = results.map(result => result.items.find(item => item.name === name));
    const isDifferent = items.length > 1 && items.some(item =>
      item?.value !== items[0]?.value || item?.status !== items[0]?.status);
    const [a, b] = items;
    const parse = (value: string | number | undefined) => String(value ?? '').match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
    const av = parse(a?.value), bv = parse(b?.value);
    const numeric = !!a && !!b && !!av && !!bv && av[2] === bv[2];
    const delta = numeric ? Number((Number(bv![1]) - Number(av![1])).toFixed(6)) : null;
    const relative = numeric && Number(av![1]) !== 0 ? Math.abs(delta! / Number(av![1])) * 100 : null;
    return { name, items, isDifferent, numeric, delta, relative,
      diff: !a || !b ? '测试项缺失' : delta !== null && delta !== 0
        ? `${delta > 0 ? '+' : ''}${delta}${av![2]}`
        : a.value !== b.value ? '文本不同' : a.status !== b.status ? '状态不同' : '一致' };
  });
}

export function initialComparison<T extends { id: string }>(selected: T, available: T[]) {
  const other = available.find(result => result.id !== selected.id);
  return other ? [selected, other] : [selected];
}

export function parseResultTime(value: string): number {
  // ISO timestamps with an explicit zone retain their absolute-time semantics.
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return Date.parse(value);
  const normalized = value.trim().replace(/年|月/g, '-').replace(/日/g, ' ').replace(/：/g, ':');
  const match = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T,]+(?:(上午|下午)\s*)?(\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?$/);
  if (!match) return NaN;
  const [, year, month, day, period, hour = '0', minute = '0', second = '0', fraction = '0'] = match;
  let hours = Number(hour);
  if (period) { if (hours < 1 || hours > 12) return NaN; hours = hours % 12 + (period === '下午' ? 12 : 0); }
  const date = new Date(Number(year), Number(month) - 1, Number(day), hours, Number(minute), Number(second), Number(fraction.padEnd(3, '0')));
  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)
    && date.getHours() === hours && date.getMinutes() === Number(minute) && date.getSeconds() === Number(second) ? date.getTime() : NaN;
}

export function localReportsToResults(reports: any[]): TestResult[] {
  return reports.filter(report => report && typeof report.id === 'string' && report.run?.mode === 'local-sample'
    && Array.isArray(report.run.checks) && report.run.checks.every((check: any) => typeof check.item === 'string' && ['success', 'failed'].includes(check.result))
    && Number.isFinite(report.run.durationMs)).map(report => {
      const passed = report.run.checks.filter((check: any) => check.result === 'success').length;
      const total = report.run.checks.length;
      return { id: report.id, name: `${report.name}（本地样例）`, type: report.type || '接口测试',
        taskName: report.taskId || '本地样例', status: passed === total ? 'success' : 'failed', generationTime: report.time || '',
        duration: `${report.run.durationMs.toFixed(3)}ms`, successRate: total ? Number((passed / total * 100).toFixed(2)) : 0,
        failureRate: total ? Number(((total - passed) / total * 100).toFixed(2)) : 0, config: '浏览器隔离样例', node: '本地断言（非被测系统）',
        items: [{ name: '本地断言总耗时', value: `${report.run.durationMs.toFixed(3)}ms`, status: 'success' },
          ...report.run.checks.map((check: any) => ({ name: check.item, value: check.result === 'success' ? '通过' : check.error || '断言不匹配', status: check.result }))] };
    });
}

const getRelativeDate = (daysAgo: number = 0, hoursAgo: number = 0, minsAgo: number = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  d.setMinutes(d.getMinutes() - minsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const MOCK_RESULTS: TestResult[] = [
  {
    id: 'TR-001',
    name: '示例：人脸识别精度测试_v1.0',
    type: 'UI测试',
    taskName: '人脸识别实时分析任务 #001',
    status: 'success',
    generationTime: getRelativeDate(0, 2, 0),
    duration: '120ms',
    successRate: 98.5,
    failureRate: 1.5,
    config: '标准精度配置_v1',
    node: 'GPU服务器_A100_01',
    items: [
      { name: '识别准确率', value: '98.5%', status: 'success' },
      { name: '平均响应时间', value: '120ms', status: 'success' },
      { name: '并发处理量', value: '500/s', status: 'success' },
      { name: '内存占用', value: '4.2GB', status: 'warning' },
      { name: 'CPU负载', value: '35%', status: 'success' },
    ]
  },
  {
    id: 'TR-002',
    name: '示例：人脸识别精度测试_v1.1',
    type: 'UI测试',
    taskName: '人脸识别实时分析任务 #001',
    status: 'success',
    generationTime: getRelativeDate(0, 0, 30),
    duration: '115ms',
    successRate: 99.2,
    failureRate: 0.8,
    config: '高精度配置_v2',
    node: 'GPU服务器_A100_01',
    items: [
      { name: '识别准确率', value: '99.2%', status: 'success' },
      { name: '平均响应时间', value: '115ms', status: 'success' },
      { name: '并发处理量', value: '550/s', status: 'success' },
      { name: '内存占用', value: '4.5GB', status: 'warning' },
      { name: 'CPU负载', value: '38%', status: 'success' },
    ]
  },
  {
    id: 'TR-003',
    name: '示例：车辆特征提取压力测试',
    type: '性能测试',
    taskName: '车辆特征提取任务 #042',
    status: 'failed',
    generationTime: getRelativeDate(0, 3, 0),
    duration: '450ms',
    successRate: 85.0,
    failureRate: 15.0,
    config: '极限压力配置',
    node: '边缘计算节点_05',
    items: [
      { name: '吞吐量', value: '1200/s', status: 'success' },
      { name: '丢帧率', value: '12.5%', status: 'failed' },
      { name: '平均耗时', value: '450ms', status: 'failed' },
      { name: '系统稳定性', value: '不稳定', status: 'failed' },
    ]
  }
];

export default function ResultVerification({ activeSubTab }: ResultVerificationProps) {
  const [view, setView] = useState<ViewState>('list');
  useNavigationReset(() => setView(activeSubTab === 'res-comp' ? 'compare' : activeSubTab === 'diff-analysis' ? 'analysis' : 'list'));
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [compareList, setCompareList] = useState<TestResult[]>(MOCK_RESULTS.slice(0, 2));
  const [analysisPair, setAnalysisPair] = useState<[TestResult, TestResult] | null>(null);
  const [compareMode, setCompareMode] = useState<'horizontal' | 'vertical'>('horizontal');
  const [showAddModal, setShowAddModal] = useState(false);
  const [onlyDifferences, setOnlyDifferences] = useState(true);
  const [itemStatus, setItemStatus] = useState('全部');
  const [timeRange, setTimeRange] = useState('时间范围');
  const [localResults, setLocalResults] = useState(() => localReportsToResults(readLocalArray('platform-reports-v1', [])));
  const availableResults = [...localResults, ...MOCK_RESULTS];
  useEffect(() => {
    const reload = () => setLocalResults(localReportsToResults(readLocalArray('platform-reports-v1', [])));
    window.addEventListener('platform-local-data', reload); window.addEventListener('storage', reload);
    return () => { window.removeEventListener('platform-local-data', reload); window.removeEventListener('storage', reload); };
  }, []);

  // Filter States
  const [resSearch, setResSearch] = useState('');
  const [resTypeFilter, setResTypeFilter] = useState('测试类型');

  const filteredResults = useMemo(() => {
    return availableResults.filter(res => {
      const matchesSearch = res.name.toLowerCase().includes(resSearch.toLowerCase()) || 
                           res.taskName.toLowerCase().includes(resSearch.toLowerCase());
      const matchesType = resTypeFilter === '测试类型' || res.type === resTypeFilter;
      const age = Date.now() - parseResultTime(res.generationTime);
      const matchesTime = timeRange === '时间范围' || (age >= 0 && age <= (timeRange === '最近24小时' ? 1 : 7) * 86400000);
      return matchesSearch && matchesType && matchesTime;
    });
  }, [resSearch, resTypeFilter, timeRange, localResults]);

  useEffect(() => {
    if (activeSubTab === 'res-list') setView('list');
    if (activeSubTab === 'res-comp') setView('compare');
    if (activeSubTab === 'diff-analysis') setView('analysis');
  }, [activeSubTab]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20',
      failed: 'bg-red-50 text-red-600 dark:bg-red-900/20',
      warning: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20'
    };
    const labels = { success: '成功', failed: '失败', warning: '警告' };
    return (
      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", styles[status as keyof typeof styles])}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  // --- 1. Test Result List Page ---
  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">测试结果</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">集中展示与管理所有测试任务的执行结果</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input 
            type="text" 
            placeholder="搜索测试名称、任务名称..." 
            value={resSearch}
            onChange={(e) => setResSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
          />
        </div>
        <select 
          value={resTypeFilter}
          onChange={(e) => setResTypeFilter(e.target.value)}
          className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none text-[var(--text-primary)]"
        >
          <option>测试类型</option>
          <option>UI测试</option>
          <option>接口测试</option>
          <option>性能测试</option>
        </select>
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-[var(--text-secondary)]" />
          <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none">
            <option>时间范围</option>
            <option>最近24小时</option>
            <option>最近7天</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">测试名称</th>
              <th className="px-6 py-4 font-semibold">测试类型</th>
              <th className="px-6 py-4 font-semibold">关联任务</th>
              <th className="px-6 py-4 font-semibold">结果状态</th>
              <th className="px-6 py-4 font-semibold">生成时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filteredResults.length > 0 ? filteredResults.map((res) => (
              <tr key={res.id} className="hover:bg-[var(--bg-primary)] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={cn("p-1.5 rounded mr-3", res.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{res.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{res.type}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] truncate max-w-[200px]">{res.taskName}</td>
                <td className="px-6 py-4">{getStatusBadge(res.status)}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{res.generationTime}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => { setSelectedResult(res); setView('detail'); }}
                      className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded" 
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => { setCompareList(initialComparison(res, availableResults)); setView('compare'); }}
                      className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500 rounded" 
                      title="对比"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => { setAnalysisPair(initialComparison(res, availableResults) as [TestResult, TestResult]); setView('analysis'); }}
                      className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 rounded" 
                      title="分析"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                  未找到匹配的测试结果
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- 2. Test Result Detail Page ---
  const renderDetail = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button onClick={() => setView('list')} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">测试结果详情</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => { if (selectedResult) { setCompareList(initialComparison(selectedResult, availableResults)); setView('compare'); } }}
            className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-secondary)] flex items-center"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" /> 进入对比
          </button>
          <button 
            onClick={() => { if (selectedResult) { setAnalysisPair(initialComparison(selectedResult, availableResults) as [TestResult, TestResult]); setView('analysis'); } }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center"
          >
            <BarChart3 className="w-4 h-4 mr-2" /> 进入分析
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Basic & Source Info */}
        <div className="space-y-6">
          <div className="card p-6 space-y-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase flex items-center">
              <FileText className="w-4 h-4 mr-2 text-blue-500" /> 基本信息
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">测试名称</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{selectedResult?.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">测试类型</p>
                  <p className="text-sm text-[var(--text-primary)]">{selectedResult?.type}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">关联任务</p>
                <p className="text-sm text-[var(--text-primary)]">{selectedResult?.taskName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">执行时间</p>
                <p className="text-sm text-[var(--text-primary)]">{selectedResult?.generationTime}</p>
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase flex items-center">
              <History className="w-4 h-4 mr-2 text-indigo-500" /> 测试溯源
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center">
                  <Layers className="w-4 h-4 mr-3 text-[var(--text-secondary)]" />
                  <span className="text-xs font-medium text-[var(--text-primary)]">测试任务</span>
                </div>
                <button className="text-[10px] font-bold text-blue-500 hover:underline">查看任务</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center">
                  <Settings className="w-4 h-4 mr-3 text-[var(--text-secondary)]" />
                  <span className="text-xs font-medium text-[var(--text-primary)]">测试配置</span>
                </div>
                <button className="text-[10px] font-bold text-blue-500 hover:underline">查看配置</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center">
                  <Server className="w-4 h-4 mr-3 text-[var(--text-secondary)]" />
                  <span className="text-xs font-medium text-[var(--text-primary)]">执行节点</span>
                </div>
                <span className="text-[10px] text-[var(--text-secondary)]">{selectedResult?.node}</span>
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase flex items-center">
              <Activity className="w-4 h-4 mr-2 text-emerald-500" /> 性能数据
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <p className="text-lg font-bold text-blue-500">{selectedResult?.duration}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">耗时</p>
              </div>
              <div className="text-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <p className="text-lg font-bold text-emerald-500">{selectedResult?.successRate}%</p>
                <p className="text-[10px] text-[var(--text-secondary)]">成功率</p>
              </div>
              <div className="text-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <p className="text-lg font-bold text-red-500">{selectedResult?.failureRate}%</p>
                <p className="text-[10px] text-[var(--text-secondary)]">失败率</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Test Results Table */}
        <div className="lg:col-span-2">
          <div className="card h-full flex flex-col">
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase">测试项结果</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-[var(--text-secondary)]">状态筛选:</span>
                <select value={itemStatus} onChange={e => setItemStatus(e.target.value)} className="text-xs bg-transparent font-bold text-blue-500 outline-none">
                  <option>全部</option>
                  <option>成功</option>
                  <option>失败</option>
                  <option>警告</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[10px] uppercase tracking-wider">
                    <th className="px-6 py-3 font-semibold">测试项</th>
                    <th className="px-6 py-3 font-semibold">测试结果</th>
                    <th className="px-6 py-3 font-semibold text-right">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {selectedResult?.items.filter(item => itemStatus === '全部' || item.status === ({ '成功': 'success', '失败': 'failed', '警告': 'warning' }[itemStatus])).map((item, i) => (
                    <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{item.value}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end">
                          {getStatusIcon(item.status)}
                          <span className={cn(
                            "ml-2 text-[10px] font-bold uppercase",
                            item.status === 'success' ? 'text-emerald-500' : item.status === 'failed' ? 'text-red-500' : 'text-orange-500'
                          )}>
                            {item.status === 'success' ? 'Pass' : item.status === 'failed' ? 'Fail' : 'Warn'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- 3. Result Comparison Page ---
  const renderCompare = () => {
    const displayList = compareList;
    const rows = compareResultItems(displayList).filter(row => !onlyDifferences || row.isDifferent);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">结果对比</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">支持多个测试结果、不同版本及模型的横向/纵向对比分析</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-1">
              <button 
                onClick={() => setCompareMode('horizontal')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                  compareMode === 'horizontal' ? "bg-blue-600 text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                横向对比
              </button>
              <button 
                onClick={() => setCompareMode('vertical')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                  compareMode === 'vertical' ? "bg-blue-600 text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                纵向对比
              </button>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" /> 添加对比对象
            </button>
          </div>
        </div>

        {/* Selection Area / Info Cards */}
        <div className={cn('grid gap-6', compareMode === 'horizontal' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1')}>
          {displayList.map((res, i) => (
            <div key={res.id} className="card p-5 relative group">
              <button aria-label={`移除 ${res.name}`} onClick={() => setCompareList(prev => prev.filter(item => item.id !== res.id))} className="absolute top-4 right-4 p-1.5 hover:bg-red-50 text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  {String.fromCharCode(65 + i)}
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[180px]">{res.name}</h4>
                  <p className="text-[10px] text-[var(--text-secondary)]">{res.generationTime}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">测试版本</p>
                  <p className="font-medium text-[var(--text-primary)]">{res.name.match(/_v(.+)$/)?.[1] ? `v${res.name.match(/_v(.+)$/)![1]}` : '待补充'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">成功率</p>
                  <p className="font-medium text-emerald-500">{res.successRate}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)]">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase">对比明细</h3>
            <div className="flex items-center space-x-4">
              <label className="flex items-center text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" className="mr-2" checked={onlyDifferences} onChange={e => setOnlyDifferences(e.target.checked)} /> 只看差异项
              </label>
              <button onClick={() => {
                const blob = new Blob([JSON.stringify({ results: displayList.map(result => ({ id: result.id, name: result.name })), comparison: compareResultItems(displayList) }, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a'); link.href = url; link.download = '结果对比.json'; link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }} className="text-xs font-bold text-blue-500 hover:underline flex items-center">
                <Download className="w-3.5 h-3.5 mr-1" /> 导出对比报告
              </button>
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              {compareMode === 'horizontal' ? (
              <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[10px] uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">测试项</th>
                {displayList.map((res, i) => (
                  <th key={res.id} className="px-6 py-4 font-semibold">结果 {String.fromCharCode(65 + i)}</th>
                ))}
                <th className="px-6 py-4 font-semibold text-right">差异分析</th>
              </tr>
              ) : (
                <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[10px] uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">测试结果</th>
                  {rows.map(row => <th key={row.name} className="px-6 py-4 font-semibold">{row.name}</th>)}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {compareMode === 'vertical' && rows.length > 0 ? displayList.map((result, resultIndex) => (
                <tr key={result.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{result.name}</td>
                  {rows.map(row => <td key={row.name} className={cn('px-6 py-4 text-sm font-mono', row.isDifferent && 'bg-red-50/20 dark:bg-red-900/5')}>
                    {row.items[resultIndex] && getStatusIcon(row.items[resultIndex]!.status)}
                    {row.items[resultIndex]?.value ?? '-'}
                  </td>)}
                </tr>
              )) : rows.map((row, idx) => {
                const results = row.items;
                const isDifferent = row.isDifferent;
                
                return (
                  <tr key={idx} className={cn("hover:bg-[var(--bg-primary)] transition-colors", isDifferent && "bg-red-50/20 dark:bg-red-900/5")}>
                    <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{row.name}</td>
                    {results.map((res, i) => (
                      <td key={i} className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">
                        <div className="flex items-center">
                          {res && getStatusIcon(res.status)}
                          <span className="ml-2">{res?.value ?? '-'}</span>
                        </div>
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      {isDifferent ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 font-bold uppercase">存在差异</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 font-bold uppercase">一致</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={displayList.length + 2} className="px-6 py-12 text-center text-[var(--text-secondary)]">{displayList.length < 2 ? '请添加至少两个对比对象' : '没有匹配的差异项'}</td></tr>}
            </tbody>
          </table>
        </div>
        {showAddModal && (
          <div role="dialog" aria-label="添加对比对象" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-lg space-y-4">
              <h3 className="text-lg font-bold">添加对比对象</h3>
              {availableResults.filter(result => !displayList.some(item => item.id === result.id)).map(result => (
                <button key={result.id} className="block w-full text-left p-3 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-primary)]" onClick={() => { setCompareList(prev => [...prev, result]); setShowAddModal(false); }}>{result.name}</button>
              ))}
              {displayList.length === availableResults.length && <p>已添加全部对比对象</p>}
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-[var(--border-color)] rounded-lg">关闭</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- 4. Difference Analysis Page ---
  const renderAnalysis = () => {
    const pair = analysisPair || [MOCK_RESULTS[0], MOCK_RESULTS[1]];
    const rows = compareResultItems(pair);
    const differences = rows.filter(row => row.isDifferent);
    const relativeValues = differences.flatMap(row => row.relative === null ? [] : [row.relative]);
    const percent = (value: number) => `${Number(value.toFixed(2))}%`;
    const diffStats = [
      { label: '差异数量', value: String(differences.length), icon: AlertCircle, color: 'red' },
      { label: '差异率', value: percent(rows.length ? differences.length / rows.length * 100 : 0), icon: TrendingUp, color: 'orange' },
      { label: '最大差异', value: relativeValues.length ? percent(Math.max(...relativeValues)) : '待补充', icon: Maximize2, color: 'blue' },
      { label: '平均差异', value: relativeValues.length ? percent(relativeValues.reduce((sum, value) => sum + value, 0) / relativeValues.length) : '待补充', icon: Activity, color: 'emerald' },
    ];

    const distributionData = [
      { name: '数值差异', value: differences.filter(row => row.numeric && row.delta !== 0).length, color: '#3b82f6' },
      { name: '状态差异', value: differences.filter(row => row.items[0] && row.items[1] && row.items[0].value === row.items[1].value && row.items[0].status !== row.items[1].status).length, color: '#ef4444' },
      { name: '文本或缺失差异', value: differences.filter(row => !row.items[0] || !row.items[1] || (!row.numeric && row.items[0].value !== row.items[1].value)).length, color: '#f59e0b' },
    ];

    const trendData = rows.filter(row => row.relative !== null).map(row => ({ name: row.name, diff: Number(row.relative!.toFixed(2)) }));

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">差异分析</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">深度挖掘测试结果间的数值、状态及文本差异，辅助决策优化</p>
          </div>
        </div>

        {/* Pair Selection */}
        <div className="card p-4 flex items-center justify-center space-x-12">
          <div className="flex items-center space-x-4">
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">测试 A:</span>
            <select aria-label="测试 A" value={pair[0].id} onChange={e => setAnalysisPair([availableResults.find(result => result.id === e.target.value)!, pair[1]])} className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none">
              {availableResults.map(result => <option key={result.id} value={result.id}>{result.name}</option>)}
            </select>
          </div>
          <ArrowRightLeft className="w-5 h-5 text-slate-300" />
          <div className="flex items-center space-x-4">
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">测试 B:</span>
            <select aria-label="测试 B" value={pair[1].id} onChange={e => setAnalysisPair([pair[0], availableResults.find(result => result.id === e.target.value)!])} className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none">
              {availableResults.map(result => <option key={result.id} value={result.id}>{result.name}</option>)}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {diffStats.map((stat, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <div className={cn("p-2 rounded-lg", `bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600`)}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-[var(--text-primary)]">{stat.value}</span>
              </div>
              <p className="text-xs font-medium text-[var(--text-secondary)]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">差异分布图</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">各测试项相对差异（%）</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="diff" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Diff List */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase">差异明细列表</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[10px] uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">测试项</th>
                <th className="px-6 py-4 font-semibold">测试 A 结果</th>
                <th className="px-6 py-4 font-semibold">测试 B 结果</th>
                <th className="px-6 py-4 font-semibold text-right">差异值</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {differences.map((row, i) => (
                <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors cursor-pointer group">
                  <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{row.name}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{row.items[0]?.value ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{row.items[1]?.value ?? '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-sm font-bold font-mono",
                      'text-blue-500'
                    )}>
                      {row.diff}
                    </span>
                  </td>
                </tr>
              ))}
              {differences.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-[var(--text-secondary)]">没有差异项</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (view === 'detail') return renderDetail();
    switch (view) {
      case 'list': return renderList();
      case 'compare': return renderCompare();
      case 'analysis': return renderAnalysis();
      default: return renderList();
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
