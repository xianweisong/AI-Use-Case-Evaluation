import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Play, 
  Settings2, 
  FileText, 
  Trash2, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Activity, 
  Zap, 
  Layers, 
  Globe, 
  ArrowLeft, 
  Download, 
  RefreshCw,
  MoreHorizontal,
  Terminal,
  BarChart3,
  Calendar,
  Copy,
  Save,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createModuleStore } from '../lib/platformStorage';
import { validateInterfaceConfig } from '../lib/interfaceWorkflows';
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
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InterfaceEvaluationProps {
  activeSubTab: string;
}

type ViewState = 'list' | 'config' | 'execution' | 'reportDetail' | 'versionDiff';
type ApiTest = { id: string; name: string; url: string; method: string; status: string; time: string; protocol: string; version: string; body: string; expectedCode: string; responseLimit: number; count: number; timeout: number; kind?: 'api' | 'compat' | 'protocol'; api?: string; versions?: number; demoRun?: boolean; headers?: { key: string; value: string }[]; tlsEnabled?: boolean; certCheck?: string; tlsVersion?: string; executionMode?: 'immediate' | 'scheduled'; heartbeat?: number; serviceName?: string; methodName?: string; protoName?: string; protoContent?: string; queryKey?: string; queryValue?: string };
const getRelativeDate = (daysAgo: number = 0, hoursAgo: number = 0, minsAgo: number = 0) => {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(d.getHours() - hoursAgo); d.setMinutes(d.getMinutes() - minsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function InterfaceEvaluation({ activeSubTab }: InterfaceEvaluationProps) {
  const [view, setView] = useState<ViewState>('list');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [store] = useState(() => createModuleStore<ApiTest[]>('as-eval-interface-tests', [
    { id: 'API-001', name: '人脸检测接口功能测试', url: '/api/v1/face/detect', method: 'POST', status: 'success', time: getRelativeDate(0, 2, 30), protocol: 'HTTP', version: 'v1.2.0', body: '{}', expectedCode: '200', responseLimit: 500, count: 1, timeout: 30 },
    { id: 'API-002', name: '车辆识别接口连通性', url: '/api/v1/vehicle/identify', method: 'GET', status: 'failed', time: getRelativeDate(0, 1, 15), protocol: 'HTTP', version: 'v1.0', body: '{}', expectedCode: '200', responseLimit: 500, count: 1, timeout: 30 },
    { id: 'API-003', name: '轨迹查询接口性能预检', url: '/api/v1/track/query', method: 'POST', status: 'none', time: getRelativeDate(0, 3, 45), protocol: 'HTTP', version: 'v1.0', body: '{}', expectedCode: '200', responseLimit: 500, count: 1, timeout: 30 },
    { id: 'COMP-001', name: 'FaceAPI 多版本兼容性', api: '人脸检测接口', versions: 3, url: '/api/v1/face/detect', method: 'POST', status: 'success', time: getRelativeDate(12), protocol: 'HTTP', version: 'v1.3.0', body: '{}', expectedCode: '200', responseLimit: 500, count: 1, timeout: 30, kind: 'compat' },
    { id: 'COMP-002', name: 'VehicleAPI 升级回归测试', api: '车辆识别接口', versions: 2, url: '/api/v1/vehicle/identify', method: 'GET', status: 'running', time: getRelativeDate(1), protocol: 'HTTP', version: 'v1.2.0', body: '{}', expectedCode: '200', responseLimit: 500, count: 1, timeout: 30, kind: 'compat' },
    { id: 'PROT-001', name: 'HTTPS 安全协议适配', api: '人脸检测接口', url: '/api/v1/face/detect', method: 'POST', status: 'success', time: getRelativeDate(15), protocol: 'HTTPS', version: 'v1.2.0', body: '{}', expectedCode: '200', responseLimit: 500, count: 1, timeout: 30, kind: 'protocol' },
    { id: 'PROT-002', name: 'HTTP 降级兼容测试', api: '车辆识别接口', url: '/api/v1/vehicle/identify', method: 'GET', status: 'none', time: getRelativeDate(1), protocol: 'HTTP', version: 'v1.0', body: '{}', expectedCode: '200', responseLimit: 500, count: 1, timeout: 30, kind: 'protocol' },
    { id: 'PROT-003', name: 'WebSocket 双向通信测试', api: '实时视频流推送', url: '/api/v1/stream', method: 'GET', status: 'running', time: getRelativeDate(0, 5), protocol: 'WS', version: 'v1.0', body: '{}', expectedCode: '200', responseLimit: 500, count: 1, timeout: 30, kind: 'protocol' },
    { id: 'PROT-004', name: 'gRPC 接口性能评测', api: '特征向量检索服务', url: 'FaceService', method: 'POST', status: 'success', time: getRelativeDate(0, 10), protocol: 'gRPC', version: 'v1.0', body: '{}', expectedCode: '200', responseLimit: 500, count: 1, timeout: 30, kind: 'protocol' },
  ], (value): value is ApiTest[] => Array.isArray(value) && value.every(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.url === 'string')));
  const [tests, setTests] = useState<ApiTest[]>(store.initial);
  const saveTests = (next: ApiTest[]) => { try { store.save(next); setTests(next); return true; } catch (error) { alert(error instanceof Error ? error.message : '保存失败'); return false; } };
  const [draft, setDraft] = useState<ApiTest | null>(null);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const executionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopExecution = () => { if (executionTimer.current) { clearInterval(executionTimer.current); executionTimer.current = null; } setIsExecuting(false); };
  const [versionDiffConfig, setVersionDiffConfig] = useState({ base: 'v1.2.0', target: 'v1.3.0' });
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState('HTTP');
  
  // Filter States
  const [apiSearch, setApiSearch] = useState('');
  const [apiStatusFilter, setApiStatusFilter] = useState('所有状态');

  // Mock Data
  const newDraft = (): ApiTest => ({ id: `API-${Date.now()}`, name: '', url: '', method: 'POST', status: 'none', time: new Date().toLocaleString(), protocol: 'HTTP', version: '', body: '{}', expectedCode: '200', responseLimit: 500, count: 1, timeout: 30, kind: activeSubTab === 'multi-ver' ? 'compat' : activeSubTab === 'multi-proto' ? 'protocol' : 'api', headers: [{ key: 'Content-Type', value: 'application/json' }], tlsEnabled: true, certCheck: '系统默认', tlsVersion: 'Auto', executionMode: 'immediate', heartbeat: 30 });
  const openConfig = (item?: ApiTest) => { const value = item || newDraft(); setSelectedItem(item || null); setDraft({ ...value }); setSelectedProtocol(value.protocol); setView('config'); };
  const saveConfig = () => { if (!draft) return; const value = { ...draft, protocol: selectedProtocol, versions: draft.kind === 'compat' && draft.version !== selectedItem?.version ? undefined : draft.versions }; const error = validateInterfaceConfig(value); if (error) { alert(error); return; } if (draft.executionMode === 'scheduled') { alert('当前未连接任务调度器；可以保存定时策略，但不会自动触发执行。'); } if (!saveTests([value, ...tests.filter(t => t.id !== value.id)])) return; setSelectedItem(value); setView('list'); };
  const runTest = (item: ApiTest) => { const error = validateInterfaceConfig(item); if (error) { alert(error); return; } if (!confirm(`查看“${item.name}”的前端演示流程？不会向接口发送请求或更改原测试结果。`)) return; setSelectedItem(item); setView('execution'); startExecution(); };
  const deleteTest = (item: ApiTest) => { if (!confirm(`确定删除“${item.name}”吗？`)) return; saveTests(tests.filter(t => t.id !== item.id)); };

  const filteredAPITests = React.useMemo(() => {
    return tests.filter(item => {
      if (item.kind && item.kind !== 'api') return false;
      const matchesSearch = item.name.toLowerCase().includes(apiSearch.toLowerCase()) || 
                           item.url.toLowerCase().includes(apiSearch.toLowerCase());
      const statusMap: Record<string, string> = {
        '成功': 'success',
        '失败': 'failed',
        '未执行': 'none'
      };
      const matchesStatus = apiStatusFilter === '所有状态' || item.status === statusMap[apiStatusFilter];
      return matchesSearch && matchesStatus;
    });
  }, [tests, apiSearch, apiStatusFilter]);

  useEffect(() => {
    stopExecution();
    setView('list');
    setSelectedItem(null);
    try {
      const raw = sessionStorage.getItem('platform-navigation');
      if (!raw) return;
      const intent = JSON.parse(raw);
      if (intent.tab !== 'interface' || intent.subTab !== activeSubTab) return;
      sessionStorage.removeItem('platform-navigation');
      if (typeof intent.query === 'string') setApiSearch(intent.query);
      if (intent.action === 'create') { const value = newDraft(); setDraft(value); setSelectedProtocol(value.protocol); setView('config'); }
    } catch { /* ignore malformed navigation request */ }
  }, [activeSubTab]);
  useEffect(() => () => { if (executionTimer.current) clearInterval(executionTimer.current); }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 font-medium">成功</span>;
      case 'executing':
      case 'running':
        return <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 font-medium animate-pulse">执行中</span>;
      case 'failed':
        return <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 font-medium">失败</span>;
      default:
        return <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">未执行</span>;
    }
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      PUT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold", colors[method] || 'bg-slate-100 text-slate-700')}>
        {method}
      </span>
    );
  };

  // --- List Page Renders ---

  const renderListHeader = (title: string, onAdd: () => void) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">接口评测 / {title}</p>
      </div>
      <div className="flex items-center space-x-2">
        <button onClick={() => { if (!filteredAPITests.length) return; const invalid = filteredAPITests.filter(t => validateInterfaceConfig(t)); if (invalid.length) { alert(`${invalid.length} 项配置不完整，请先修正。`); return; } alert(`已检查 ${filteredAPITests.length} 项配置。当前未连接测试执行器，批量测试未运行，原结果保持不变。`); }} className="flex items-center px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-secondary)]">
          <RefreshCw className="w-4 h-4 mr-2" /> 批量测试
        </button>
        <button 
          onClick={onAdd}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4 mr-2" /> 新建测试
        </button>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="card p-4 mb-6 flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
        <input 
          type="text" 
          placeholder="搜索接口名称、地址..." 
          value={apiSearch}
          onChange={(e) => setApiSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
        />
      </div>
      <select 
        value={apiStatusFilter}
        onChange={(e) => setApiStatusFilter(e.target.value)}
        className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[var(--text-primary)]"
      >
        <option>所有状态</option>
        <option>成功</option>
        <option>失败</option>
        <option>未执行</option>
      </select>
      <div className="flex items-center space-x-2">
        <button title="重置筛选" onClick={() => { setApiSearch(''); setApiStatusFilter('所有状态'); }} className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
          <Filter className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderAPITestList = () => (
    <div className="space-y-6">
      {renderListHeader('API测试', () => openConfig())}
      {renderFilters()}
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">测试名称</th>
              <th className="px-6 py-4 font-semibold">接口地址</th>
              <th className="px-6 py-4 font-semibold">请求方式</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">创建时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filteredAPITests.length > 0 ? filteredAPITests.map((item, i) => (
              <tr key={item.id} className="hover:bg-[var(--bg-primary)] transition-colors group">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{item.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{item.url}</td>
                <td className="px-6 py-4">{getMethodBadge(item.method)}</td>
                <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => openConfig(item)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded" title="配置">
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => runTest(item)} className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 rounded" title="执行">
                      <Play className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setSelectedItem(item); setView('reportDetail'); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-secondary)] rounded" title="报告">
                      <FileText className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteTest(item)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                  未找到匹配的测试
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCompatibilityList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">兼容测试</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">接口评测 / 兼容测试</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setView('versionDiff')}
            className="flex items-center px-4 py-2 border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium transition-all"
          >
            <Zap className="w-4 h-4 mr-2" /> 多版本对比
          </button>
          <button 
            onClick={() => openConfig()}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4 mr-2" /> 新建测试
          </button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">测试名称</th>
              <th className="px-6 py-4 font-semibold">接口名称</th>
              <th className="px-6 py-4 font-semibold">版本数量</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">创建时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {tests.filter(t => t.kind === 'compat').map((item) => (
              <tr key={item.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{item.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.api || item.url || '待补充'}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.versions !== undefined ? `${item.versions} 个版本` : item.version?.trim() ? `${item.version.split(/[,，]/).map(v => v.trim()).filter(Boolean).length} 个版本` : '待补充'}</td>
                <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    <button onClick={() => openConfig(item)} className="text-xs font-medium text-blue-500 hover:text-blue-600">配置</button>
                    <button onClick={() => runTest(item)} className="text-xs font-medium text-emerald-500 hover:text-emerald-600">执行</button>
                    <button onClick={() => { setSelectedItem(item); setView('reportDetail'); }} className="text-xs font-medium text-slate-500 hover:text-slate-600">报告</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderProtocolList = () => {
    const protocols = tests.filter(t => t.kind === 'protocol');

    const handleAutoRecognize = () => {
      const counts = protocols.reduce<Record<string, number>>((result, item) => {
        result[item.protocol] = (result[item.protocol] || 0) + 1;
        return result;
      }, {});
      const summary = Object.entries(counts).map(([protocol, count]) => `${protocol} ${count} 项`).join('、') || '暂无协议测试配置';
      alert(`当前未连接接口，无法自动识别协议。已保存配置统计：${summary}。`);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">协议测试</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">接口评测 / 协议测试</p>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleAutoRecognize}
              className="flex items-center px-4 py-2 border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              协议自动识别
            </button>
            <button 
              onClick={() => openConfig()}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4 mr-2" /> 新建协议测试
            </button>
          </div>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">测试名称</th>
                <th className="px-6 py-4 font-semibold">接口名称</th>
                <th className="px-6 py-4 font-semibold">协议类型</th>
                <th className="px-6 py-4 font-semibold">状态</th>
                <th className="px-6 py-4 font-semibold">创建时间</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {protocols.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.api || item.url || '待补充'}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-xs font-mono px-2 py-0.5 rounded font-bold",
                      item.protocol === 'HTTPS' || item.protocol === 'HTTP' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      item.protocol === 'WS' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    )}>
                      {item.protocol}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.time}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button onClick={() => openConfig(item)} className="text-xs font-medium text-blue-500 hover:text-blue-600">配置</button>
                      <button onClick={() => runTest(item)} className="text-xs font-medium text-emerald-500 hover:text-emerald-600">执行</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --- Config Page Render ---

  const renderConfig = () => (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button onClick={() => setView('list')} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">测试配置</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setView('list')} className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-secondary)]">
            取消
          </button>
          <button onClick={saveConfig} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20">
            <Save className="w-4 h-4 mr-2 inline" /> 保存配置
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">测试名称</label>
                <input type="text" value={draft?.name || ''} onChange={e => setDraft(prev => prev && { ...prev, name: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">协议类型</label>
                <select 
                  value={selectedProtocol}
                  onChange={(e) => setSelectedProtocol(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm"
                >
                  <option value="HTTP">HTTP/HTTPS</option>
                  <option value="HTTPS">HTTPS</option>
                  <option value="WS">WebSocket</option>
                  <option value="gRPC">gRPC</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">接口地址</label>
                <input type="text" value={draft?.url || ''} onChange={e => setDraft(prev => prev && { ...prev, url: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">接口版本</label>
                <input type="text" value={draft?.version || ''} onChange={e => setDraft(prev => prev && { ...prev, version: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
              </div>
            </div>
          </div>

          {/* Protocol Specific Config */}
          {(selectedProtocol === 'HTTP' || selectedProtocol === 'HTTPS') && (
            <div className="card p-6">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">SSL/TLS 配置</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-primary)]">启用 HTTPS / SSL</span>
                  <button type="button" role="switch" aria-checked={draft?.tlsEnabled !== false} onClick={() => setDraft(prev => prev && { ...prev, tlsEnabled: prev.tlsEnabled === false })} className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer" style={{ backgroundColor: draft?.tlsEnabled === false ? '#94a3b8' : undefined }}>
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" style={{ right: draft?.tlsEnabled === false ? 'auto' : undefined, left: draft?.tlsEnabled === false ? '0.25rem' : undefined }} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">验证服务器证书</label>
                    <select value={draft?.certCheck || '系统默认'} onChange={e => setDraft(prev => prev && { ...prev, certCheck: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm">
                      <option>系统默认</option>
                      <option>禁用验证 (不安全)</option>
                      <option>自定义 CA 证书</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">TLS 版本</label>
                    <select value={draft?.tlsVersion || 'Auto'} onChange={e => setDraft(prev => prev && { ...prev, tlsVersion: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm">
                      <option>Auto</option>
                      <option>TLS 1.2</option>
                      <option>TLS 1.3</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedProtocol === 'WS' && (
            <div className="card p-6">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">WebSocket 配置</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-primary)]">连接握手参数 (Query Params)</label>
                  <div className="flex space-x-2">
                    <input type="text" placeholder="Key" value={draft?.queryKey || ''} onChange={e => setDraft(prev => prev && { ...prev, queryKey: e.target.value })} className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-mono" />
                    <input type="text" placeholder="Value" value={draft?.queryValue || ''} onChange={e => setDraft(prev => prev && { ...prev, queryValue: e.target.value })} className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-mono" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-primary)]">心跳间隔 (s)</label>
                  <input type="number" value={draft?.heartbeat ?? 30} onChange={e => setDraft(prev => prev && { ...prev, heartbeat: Number(e.target.value) })} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
                </div>
              </div>
            </div>
          )}

          {selectedProtocol === 'gRPC' && (
            <div className="card p-6">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">gRPC / Protobuf 配置</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-primary)]">Proto 文件定义</label>
                  <label className="flex items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 hover:bg-[var(--bg-primary)] transition-colors cursor-pointer">
                    <input type="file" accept=".proto" className="sr-only" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 1024 * 1024) { alert('.proto 文件不能超过 1MB'); e.target.value = ''; return; } const protoContent = await file.text(); setDraft(prev => prev && { ...prev, protoName: file.name, protoContent }); }} />
                    <div className="text-center">
                      <Plus className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm font-medium">{draft?.protoName || '点击选择 .proto 文件'}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">保存文件内容（上限 1MB），尚未连接解析器</p>
                    </div>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">Service 名称</label>
                    <input type="text" placeholder="FaceService" value={draft?.serviceName || ''} onChange={e => setDraft(prev => prev && { ...prev, serviceName: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">Method 名称</label>
                    <input type="text" placeholder="ExtractFeatures" value={draft?.methodName || ''} onChange={e => setDraft(prev => prev && { ...prev, methodName: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Request Config */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">
              {selectedProtocol === 'WS' ? '消息配置' : selectedProtocol === 'gRPC' ? '请求消息 (Protobuf JSON)' : '请求配置'}
            </h3>
            <div className="space-y-4">
              {(selectedProtocol === 'HTTP' || selectedProtocol === 'HTTPS') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-primary)]">请求方式</label>
                  <div className="flex space-x-2">
                    {['GET', 'POST', 'PUT', 'DELETE'].map(m => (
                      <button key={m} onClick={() => setDraft(prev => prev && { ...prev, method: m })} className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                        m === draft?.method ? "bg-blue-600 text-white" : "bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]"
                      )}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(selectedProtocol === 'HTTP' || selectedProtocol === 'HTTPS' || selectedProtocol === 'WS' || selectedProtocol === 'gRPC') && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[var(--text-primary)]">
                      {selectedProtocol === 'HTTP' || selectedProtocol === 'HTTPS' ? '请求头 (Headers)' : '元数据 (Metadata)'}
                    </label>
                    <button onClick={() => setDraft(prev => prev && { ...prev, headers: [...(prev.headers || []), { key: '', value: '' }] })} className="text-blue-500 text-[10px] font-bold">+ 新增</button>
                  </div>
                  <div className="space-y-2">
                    {(draft?.headers || []).map((header, index) => <div key={index} className="flex space-x-2">
                      <input type="text" value={header.key} onChange={e => setDraft(prev => prev && { ...prev, headers: (prev.headers || []).map((h, i) => i === index ? { ...h, key: e.target.value } : h) })} className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-mono" />
                      <input type="text" value={header.value} onChange={e => setDraft(prev => prev && { ...prev, headers: (prev.headers || []).map((h, i) => i === index ? { ...h, value: e.target.value } : h) })} className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-mono" />
                      <button onClick={() => setDraft(prev => prev && { ...prev, headers: (prev.headers || []).filter((_, i) => i !== index) })} className="p-1.5 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>)}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">
                  {selectedProtocol === 'WS' ? '发送消息 (JSON/Text)' : selectedProtocol === 'gRPC' ? '请求消息 (JSON 映射)' : '请求体 (Body - JSON)'}
                </label>
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-blue-400 overflow-hidden">
                  <textarea 
                    rows={6}
                    className="w-full bg-transparent outline-none resize-none"
                    value={draft?.body || ''}
                    onChange={e => setDraft(prev => prev && { ...prev, body: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Response Validation */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">响应校验</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-primary)]">状态码校验</span>
                <input type="text" value={draft?.expectedCode || ''} onChange={e => setDraft(prev => prev && { ...prev, expectedCode: e.target.value })} className="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-center font-mono" />
              </div>
              <div className="space-y-2">
                <span className="text-xs text-[var(--text-primary)]">字段校验</span>
                <div className="bg-[var(--bg-primary)] p-2 rounded border border-[var(--border-color)] text-[10px] font-mono">
                  <div className="flex justify-between mb-1">
                    <span>$.status</span>
                    <span className="text-emerald-500">== "OK"</span>
                  </div>
                  <div className="flex justify-between">
                    <span>$.data.faces</span>
                    <span className="text-emerald-500">is_array</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-primary)]">响应时间限制 (ms)</span>
                <input type="number" value={draft?.responseLimit || ''} onChange={e => setDraft(prev => prev && { ...prev, responseLimit: Number(e.target.value) })} className="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-center font-mono" />
              </div>
            </div>
          </div>

          {/* Execution Config */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">执行配置</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">执行方式</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setDraft(prev => prev && { ...prev, executionMode: 'immediate' })} className="py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white" style={{ opacity: draft?.executionMode === 'scheduled' ? 0.5 : 1 }}>立即执行</button>
                  <button onClick={() => setDraft(prev => prev && { ...prev, executionMode: 'scheduled' })} className="py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]" style={{ outline: draft?.executionMode === 'scheduled' ? '2px solid #2563eb' : undefined }}>定时执行</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-primary)]">执行次数</span>
                <input type="number" value={draft?.count || ''} onChange={e => setDraft(prev => prev && { ...prev, count: Number(e.target.value) })} className="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-center" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-primary)]">超时时间 (s)</span>
                <input type="number" value={draft?.timeout || ''} onChange={e => setDraft(prev => prev && { ...prev, timeout: Number(e.target.value) })} className="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-center" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Execution Page Render ---

  const startExecution = () => {
    stopExecution();
    setIsExecuting(true);
    setExecutionProgress(0);
    executionTimer.current = setInterval(() => {
      setExecutionProgress(prev => {
        if (prev >= 100) {
          if (executionTimer.current) clearInterval(executionTimer.current);
          executionTimer.current = null;
          setIsExecuting(false);
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  };

  const renderExecution = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button onClick={() => { stopExecution(); setView('list'); }} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">演示执行中</h2>
        </div>
        <button 
          onClick={() => setView('reportDetail')}
          disabled={isExecuting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          查看报告
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Progress Card */}
          <div className="card p-8 flex flex-col items-center text-center">
            <div className="relative w-32 h-32 mb-6">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-slate-100 dark:text-slate-800 stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                <circle 
                  className="text-blue-500 stroke-current transition-all duration-300" 
                  strokeWidth="8" 
                  strokeDasharray={251.2} 
                  strokeDashoffset={251.2 * (1 - executionProgress / 100)} 
                  strokeLinecap="round" 
                  fill="transparent" 
                  r="40" 
                  cx="50" 
                  cy="50" 
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-[var(--text-primary)]">{executionProgress}%</span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
              {isExecuting ? '正在展示前端演示流程...' : '演示流程完成'}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">{selectedItem?.name} ({selectedItem?.version || '待补充'}) · 未发送实际请求</p>
          </div>

          {/* Real-time Logs */}
          <div className="card overflow-hidden flex flex-col h-[400px]">
            <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-between">
              <div className="flex items-center text-xs font-bold text-[var(--text-secondary)] uppercase">
                <Terminal className="w-4 h-4 mr-2" /> 实时日志
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-500 font-bold">LIVE</span>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 p-4 font-mono text-xs space-y-2 overflow-y-auto">
              <p className="text-slate-400"><span className="text-blue-400">INFO</span> 前端演示流程：{selectedItem?.method} {selectedItem?.url}</p>
              <p className="text-slate-400"><span className="text-slate-500">DEBUG</span> 未连接目标系统；未发送请求，未收到响应。</p>
              {executionProgress > 50 && <p className="text-slate-400"><span className="text-emerald-400">INFO</span> 进度为前端动画，不是测试通过率。</p>}
              {executionProgress === 100 && <p className="text-slate-400"><span className="text-emerald-400 font-bold">DONE</span> 演示流程已完成；实测结果待补充。</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Statistics */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">统计信息</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 mr-3">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">成功次数</span>
                </div>
                <span className="text-lg font-bold text-emerald-600">—</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 mr-3">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">失败次数</span>
                </div>
                <span className="text-lg font-bold text-red-600">—</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 mr-3">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">平均耗时</span>
                </div>
                <span className="text-lg font-bold text-blue-600">待补充</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">测试对象</h3>
            <div className="space-y-3">
              <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">API Endpoint</p>
                <p className="text-xs font-mono text-[var(--text-primary)] truncate">{selectedItem?.url}</p>
              </div>
              <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Version</p>
                <p className="text-xs font-mono text-[var(--text-primary)]">{selectedItem?.version || '待补充'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Report Detail Page Render ---

  const renderReportDetail = () => {
    const current = tests.find(t => t.id === selectedItem?.id) || selectedItem;
    if (!current) return <div className="card p-6">未选择测试记录。<button onClick={() => setView('list')}>返回列表</button></div>;
    const hasSnapshot = current.id === 'API-001' && !current.demoRun;
    const trendTimes = ['点位1', '点位2', '点位3', '点位4', '点位5', '点位6'];

    const timeData = hasSnapshot ? [
      { time: trendTimes[0], latency: 120 },
      { time: trendTimes[1], latency: 142 },
      { time: trendTimes[2], latency: 135 },
      { time: trendTimes[3], latency: 156 },
      { time: trendTimes[4], latency: 148 },
      { time: trendTimes[5], latency: 130 },
    ] : [];

    const pieData = hasSnapshot ? [
      { name: '成功', value: 98, color: '#10b981' },
      { name: '失败', value: 2, color: '#ef4444' },
    ] : [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button onClick={() => setView('list')} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">测试报告详情</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => runTest(current)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              重新测试
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="card p-6" title={hasSnapshot ? '原版预置详情，非本次采集' : '该接口尚无独立测试指标'}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">{current.name} 报告 ({current.version || '待补充'})</h3>
              <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                <div className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> {current.time}</div>
                <div className="flex items-center"><Zap className="w-4 h-4 mr-1.5 text-blue-500" /> API测试</div>
                <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" /> {current.status === 'success' ? '测试通过' : current.status === 'failed' ? '测试失败' : '待补充'}</div>
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-500">{hasSnapshot ? '98%' : '待补充'}</p>
                <p className="text-xs text-[var(--text-secondary)]">成功率</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{hasSnapshot ? '2%' : '待补充'}</p>
                <p className="text-xs text-[var(--text-secondary)]">失败率</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{hasSnapshot ? 0 : '待补充'}</p>
                <p className="text-xs text-[var(--text-secondary)]">错误数量</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6 lg:col-span-2" title={hasSnapshot ? '原版预置趋势数据，横轴为静态点位，非本次采集时间' : '暂无独立趋势数据'}>
            <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">响应时间趋势 (ms)</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeData}>
                  <defs>
                    <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                  <Area type="monotone" dataKey="latency" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-6 flex flex-col">
            <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">成功率分布</h4>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)]">
            <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase">测试结果明细</h4>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">测试项</th>
                <th className="px-6 py-4 font-semibold">请求结果</th>
                <th className="px-6 py-4 font-semibold">响应时间</th>
                <th className="px-6 py-4 font-semibold">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(hasSnapshot ? [
                { item: `状态码校验 (${current.expectedCode})`, result: current.status === 'success' ? `${current.expectedCode} OK` : '待补充', latency: '142ms', status: current.status },
                { item: '响应字段校验 ($.status)', result: 'OK', latency: '142ms', status: 'success' },
                { item: '响应字段校验 ($.data.faces)', result: 'Array(2)', latency: '142ms', status: 'success' },
                { item: '响应时间校验 (<500ms)', result: '142ms', latency: '142ms', status: 'success' },
              ] : []).map((row, i) => (
                <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{row.item}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{row.result}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{row.latency}</td>
                  <td className="px-6 py-4">{getStatusBadge(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderVersionDiff = () => {
    const presetPair = versionDiffConfig.base === 'v1.2.0' && versionDiffConfig.target === 'v1.3.0';
    const diffData = [
      { path: '/api/v1/user/profile', method: 'GET', type: 'modified', impact: 'low', description: '新增 optional 字段: bio' },
      { path: '/api/v1/auth/logout', method: 'POST', type: 'added', impact: 'none', description: '新增登出接口' },
      { path: '/api/v1/data/export', method: 'POST', type: 'deleted', impact: 'breaking', description: '接口已移除，请使用 /api/v2/export' },
      { path: '/api/v1/face/verify', method: 'POST', type: 'modified', impact: 'breaking', description: '参数 face_id 变更为必填' },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setView('list')}
            className="text-sm text-blue-500 hover:text-blue-600 flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
          </button>
        </div>

        {/* Version Config Card */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-500" /> 版本对比配置
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">基准版本 (Base)</p>
                  <select 
                    value={versionDiffConfig.base}
                    onChange={(e) => setVersionDiffConfig({...versionDiffConfig, base: e.target.value})}
                    className="bg-transparent font-bold text-[var(--text-primary)] outline-none cursor-pointer"
                  >
                    <option value="v1.1.0">v1.1.0</option>
                    <option value="v1.2.0">v1.2.0</option>
                  </select>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-slate-500" />
                </div>
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <ChevronRight className="w-6 h-6 text-[var(--text-secondary)]" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">对比版本 (Target)</p>
                  <select 
                    value={versionDiffConfig.target}
                    onChange={(e) => setVersionDiffConfig({...versionDiffConfig, target: e.target.value})}
                    className="bg-transparent font-bold text-[var(--text-primary)] outline-none cursor-pointer"
                  >
                    <option value="v1.3.0">v1.3.0</option>
                    <option value="v1.4.0-beta">v1.4.0-beta</option>
                  </select>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interface Change Detection */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <h4 className="text-sm font-semibold">接口变更检测</h4>
            <div className="flex gap-4">
              <span className="text-xs flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" /> 修改</span>
              <span className="text-xs flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" /> 新增</span>
              <span className="text-xs flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-1.5" /> 删除</span>
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">接口路径</th>
                <th className="px-6 py-4 font-semibold">变更类型</th>
                <th className="px-6 py-4 font-semibold">影响程度</th>
                <th className="px-6 py-4 font-semibold">变更描述</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(presetPair ? diffData : []).map((item, i) => (
                <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-2">{item.method}</span>
                      <span className="text-sm font-medium">{item.path}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                      item.type === 'modified' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      item.type === 'added' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                      {item.type === 'modified' ? '修改' : item.type === 'added' ? '新增' : '删除'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <AlertCircle className={cn(
                        "w-4 h-4 mr-1.5",
                        item.impact === 'breaking' ? "text-red-500" :
                        item.impact === 'low' ? "text-orange-500" : "text-slate-400"
                      )} />
                      <span className={cn(
                        "text-xs font-medium",
                        item.impact === 'breaking' ? "text-red-600" :
                        item.impact === 'low' ? "text-orange-600" : "text-slate-600"
                      )}>
                        {item.impact === 'breaking' ? '破坏性变更' : item.impact === 'low' ? '低风险' : '无影响'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Compatibility Analysis Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 border-l-4 border-red-500">
            <h4 className="text-sm font-semibold mb-2">破坏性变更</h4>
            <p className="text-3xl font-bold text-red-500">{presetPair ? 2 : '待补充'}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">需要立即更新客户端代码</p>
          </div>
          <div className="card p-6 border-l-4 border-orange-500">
            <h4 className="text-sm font-semibold mb-2">向后兼容变更</h4>
            <p className="text-3xl font-bold text-orange-500">{presetPair ? 1 : '待补充'}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">建议在下个版本适配</p>
          </div>
          <div className="card p-6 border-l-4 border-emerald-500">
            <h4 className="text-sm font-semibold mb-2">新增功能</h4>
            <p className="text-3xl font-bold text-emerald-500">{presetPair ? 1 : '待补充'}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">可供新业务使用</p>
          </div>
        </div>

        {/* Recommendations Section */}
        <div className="card p-6">
          <h4 className="text-sm font-semibold mb-4 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-blue-500" /> 兼容性建议
          </h4>
          <div className="space-y-4">
            {!presetPair && <p className="text-sm text-[var(--text-secondary)]">该版本组合暂无对比数据。</p>}
            {presetPair && <>
            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
              <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">建议 1: 接口迁移</p>
              <p className="text-xs text-red-600 dark:text-red-300/80">
                由于 /api/v1/data/export 已被删除，建议所有客户端在 2026-06-01 前迁移至 /api/v2/export。
                v2 接口提供了更高的性能和更多的导出格式支持。
              </p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/20">
              <p className="text-sm font-bold text-orange-700 dark:text-orange-400 mb-1">建议 2: 参数适配</p>
              <p className="text-xs text-orange-600 dark:text-orange-300/80">
                /api/v1/face/verify 的 face_id 参数现在是必填项。请检查客户端调用逻辑，确保在发送请求前已获取有效的 face_id。
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
              <p className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-1">建议 3: 新功能试用</p>
              <p className="text-xs text-blue-600 dark:text-blue-300/80">
                新版本引入了 /api/v1/auth/logout 接口，建议客户端集成该接口以提升安全性，确保用户会话能被正确销毁。
              </p>
            </div>
            </>}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (view === 'config') return renderConfig();
    if (view === 'execution') return renderExecution();
    if (view === 'reportDetail') return renderReportDetail();
    if (view === 'versionDiff') return renderVersionDiff();

    switch (activeSubTab) {
      case 'api-compat': return renderAPITestList();
      case 'multi-ver': return renderCompatibilityList();
      case 'multi-proto': return renderProtocolList();
      default: return renderAPITestList();
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
