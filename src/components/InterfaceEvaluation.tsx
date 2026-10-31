import React, { useState, useEffect } from 'react';
import { useNavigationReset } from '../lib/useNavigationReset';
import { readLocalArray, saveLocalArray, type LocalRun } from '../lib/localEvaluation';
import { createInterfaceSample, runInterfaceSample, validateInterfaceConfig, compareVersionSamples, matchesInterfaceReport, type InterfaceSampleConfig, type SampleProtocol } from '../lib/interfaceSamples';
import { migrateSeedArray, createGuardedStorageWriter } from '../lib/seedMigration';
import { originalInterfaceSamples, type HistoricalInterfaceSample } from '../lib/interfaceSeeds';
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

export default function InterfaceEvaluation({ activeSubTab }: InterfaceEvaluationProps) {
  const [view, setView] = useState<ViewState>('list');
  useNavigationReset(() => setView('list'));
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [versionDiffConfig, setVersionDiffConfig] = useState({ base: 'v1.2.0', target: 'v1.3.0' });
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [configLoad] = useState(() => { try { return { data: migrateSeedArray('platform-interface-configs-v1', [createInterfaceSample(), ...originalInterfaceSamples()], 'id', 'restore-original-data-v1'), error: '' }; } catch (error) { return { data: readLocalArray<InterfaceSampleConfig>('platform-interface-configs-v1', []), error: error instanceof Error ? error.message : '接口示例恢复失败' }; } });
  const [configs, setConfigs] = useState<InterfaceSampleConfig[]>(configLoad.data);
  const [writeConfigs] = useState(() => { try { return createGuardedStorageWriter(['platform-interface-configs-v1']); } catch { return null; } });
  const [config, setConfig] = useState<InterfaceSampleConfig>(() => readLocalArray('platform-interface-configs-v1', [createInterfaceSample()])[0] || createInterfaceSample());
  const selectedProtocol = config.protocol;
  const setSelectedProtocol = (protocol: string) => setConfig(createInterfaceSample((protocol === 'HTTPS' ? 'HTTP' : protocol) as SampleProtocol));
  const updateConfig = <K extends keyof InterfaceSampleConfig>(key: K, value: InterfaceSampleConfig[K]) => setConfig(prev => ({ ...prev, [key]: value }));
  const [run, setRun] = useState<LocalRun | null>(null);
  const [runConfig, setRunConfig] = useState<InterfaceSampleConfig | null>(null);
  const [runTime, setRunTime] = useState('');
  const saveConfig = () => {
    if (configLoad.error || !writeConfigs) { alert('本地数据恢复未完成，已暂停保存以保护原始记录'); return; }
    try {
      validateInterfaceConfig(config);
      const next = configs.some(item => item.id === config.id) ? configs.map(item => item.id === config.id ? config : item) : [...configs, config];
      writeConfigs('platform-interface-configs-v1', next); setConfigs(next); alert('隔离样例配置已保存在当前浏览器');
    } catch (error) { alert(error instanceof Error ? error.message : '保存失败，请刷新后重试'); }
  };
  const [isAutoRecognizing, setIsAutoRecognizing] = useState(false);
  
  // Filter States
  const [apiSearch, setApiSearch] = useState('');
  const [apiStatusFilter, setApiStatusFilter] = useState('所有状态');

  // Helper to get relative date
  const getRelativeDate = (daysAgo: number = 0, hoursAgo: number = 0, minsAgo: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(d.getHours() - hoursAgo);
    d.setMinutes(d.getMinutes() - minsAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Mock Data
  const API_TESTS = configs.filter(item => !('legacyGroup' in item) || (item as HistoricalInterfaceSample).legacyGroup === 'api').map(item => {
    const report = readLocalArray<any>('platform-reports-v1', []).find(record => matchesInterfaceReport(record, item));
    const historical = item as HistoricalInterfaceSample;
    return { ...item, url: historical.legacyUrl || item.address, status: report ? (report.run.failed ? 'failed' : 'success') : historical.sample ? `legacy-${historical.legacyStatus}` : 'none', time: report?.time || historical.legacyTime || '本地样例', sample: historical.sample };
  });

  const filteredAPITests = React.useMemo(() => {
    return API_TESTS.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(apiSearch.toLowerCase()) || 
                           item.url.toLowerCase().includes(apiSearch.toLowerCase());
      const statusMap: Record<string, string> = {
        '成功': 'success',
        '失败': 'failed',
        '未执行': 'none'
      };
      const matchesStatus = apiStatusFilter === '所有状态' || item.status === statusMap[apiStatusFilter] || item.status === `legacy-${statusMap[apiStatusFilter]}`;
      return matchesSearch && matchesStatus;
    });
  }, [apiSearch, apiStatusFilter, configs, run, runConfig, runTime]);

  const exportRun = () => {
    if (!run || !runConfig) { alert('请先执行离线样例校验'); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify({ mode: 'local-sample', name: runConfig.name, protocol: runConfig.protocol, version: runConfig.version, run }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = '接口隔离样例报告.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const openReport = (target: InterfaceSampleConfig) => {
    const report = readLocalArray<any>('platform-reports-v1', []).find(item => matchesInterfaceReport(item, target));
    if (!report) { alert('当前配置尚无匹配的本地校验报告，请重新执行；旧报告仍保留在测试报告中'); return; }
    setRun(report.run); setRunConfig(report.sampleConfig || target); setRunTime(report.time); setView('reportDetail');
  };

  useEffect(() => {
    setView('list');
    setSelectedItem(null);
  }, [activeSubTab]);

  const getStatusBadge = (status: string) => {
    if (status.startsWith('legacy-')) return <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">旧版示例：{status.slice(7) === 'success' ? '成功' : status.slice(7) === 'failed' ? '失败' : status.slice(7) === 'running' ? '执行中' : '未执行'}</span>;
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
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title}（隔离样例）</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">接口评测 / {title}</p>
      </div>
      <div className="flex items-center space-x-2">
        <button onClick={() => startExecution()} className="flex items-center px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-secondary)]">
          <RefreshCw className="w-4 h-4 mr-2" /> 校验当前样例
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
        <button className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
          <Filter className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderAPITestList = () => (
    <div className="space-y-6">
      {renderListHeader('API测试', () => { setConfig({ ...createInterfaceSample(), id: `sample-${Date.now()}` }); setView('config'); })}
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
              <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors group">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{item.name}{item.sample && '（旧版示例）'}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{item.url}</td>
                <td className="px-6 py-4">{getMethodBadge(item.method)}</td>
                <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => { setConfig(item); setView('config'); }} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded" title="配置">
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => startExecution(item)} className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 rounded" title="执行">
                      <Play className="w-4 h-4" />
                    </button>
                    <button onClick={() => openReport(item)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-secondary)] rounded" title="报告">
                      <FileText className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if (configLoad.error || !writeConfigs) { alert('本地数据恢复未完成，已暂停删除'); return; } if (confirm('删除此本地样例配置？')) { const next = configs.filter(record => record.id !== item.id); try { writeConfigs('platform-interface-configs-v1', next); setConfigs(next); } catch (error) { alert(error instanceof Error ? error.message : '保存失败，未删除；请刷新后重试'); } } }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded" title="删除">
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
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">兼容测试（预制版本结构示例）</h2>
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
            onClick={() => setView('config')}
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
            {configs.filter(item => (item as HistoricalInterfaceSample).legacyGroup === 'version').map((item, i) => {
              const historical = item as HistoricalInterfaceSample;
              return (
              <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{item.name}（旧版示例）</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{historical.legacyApi}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{historical.legacyVersions} 个版本</td>
                <td className="px-6 py-4">{getStatusBadge(`legacy-${historical.legacyStatus}`)}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{historical.legacyTime}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    <button onClick={() => { setConfig(item); setView('config'); }} className="text-xs font-medium text-blue-500 hover:text-blue-600">配置</button>
                    <button onClick={() => startExecution(item)} className="text-xs font-medium text-emerald-500 hover:text-emerald-600">校验样例</button>
                    <button onClick={() => openReport(item)} className="text-xs font-medium text-slate-500 hover:text-slate-600">报告</button>
                  </div>
                </td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderProtocolList = () => {
    const protocols = configs.filter(item => (item as HistoricalInterfaceSample).legacyGroup === 'protocol') as HistoricalInterfaceSample[];

    const handleAutoRecognize = () => {
      alert(`当前仅根据本地配置读取协议类型：${config.protocol}；未执行协议探测或连接。`);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">协议测试（离线消息样例）</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">接口评测 / 协议测试</p>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleAutoRecognize}
              disabled={isAutoRecognizing}
              className="flex items-center px-4 py-2 border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isAutoRecognizing && "animate-spin")} />
              {isAutoRecognizing ? '读取配置...' : '查看样例协议'}
            </button>
            <button 
              onClick={() => { setSelectedProtocol('HTTP'); setView('config'); }}
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
              {protocols.map((item, i) => (
                <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{item.name}（旧版示例）</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.legacyApi}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-xs font-mono px-2 py-0.5 rounded font-bold",
                      item.protocol === 'HTTP' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      item.protocol === 'WS' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    )}>
                      {item.id === 'legacy-protocol-https' ? 'HTTPS' : item.protocol === 'WS' ? 'WS' : item.protocol}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(`legacy-${item.legacyStatus}`)}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.legacyTime}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button onClick={() => { setConfig(item); setView('config'); }} className="text-xs font-medium text-blue-500 hover:text-blue-600">配置</button>
                      <button onClick={() => startExecution(item)} className="text-xs font-medium text-emerald-500 hover:text-emerald-600">校验样例</button>
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
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">测试配置（离线样例，不连接目标系统）</h2>
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
                <input type="text" value={config.name} onChange={e => updateConfig('name', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">协议类型</label>
                <select 
                  value={selectedProtocol}
                  onChange={(e) => setSelectedProtocol(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm"
                >
                  <option value="HTTP">HTTP/HTTPS</option>
                  <option value="WS">WebSocket</option>
                  <option value="gRPC">gRPC</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">接口地址</label>
                <input type="text" value={config.address} onChange={e => updateConfig('address', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">接口版本</label>
                <input type="text" value={config.version} onChange={e => updateConfig('version', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
              </div>
            </div>
          </div>

          {/* Protocol Specific Config */}
          {selectedProtocol === 'HTTP' && (
            <div className="card p-6">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">SSL/TLS 配置</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-primary)]">HTTPS / SSL 配置样例（不握手）</span>
                  <div role="switch" aria-checked={config.https} tabIndex={0} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); updateConfig('https', !config.https); } }} onClick={() => updateConfig('https', !config.https)} className={cn('w-12 h-6 rounded-full relative cursor-pointer', config.https ? 'bg-blue-600' : 'bg-slate-400')}>
                    <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full', config.https ? 'right-1' : 'left-1')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">验证服务器证书</label>
                    <select value={config.certificate} onChange={e => updateConfig('certificate', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm">
                      <option>系统默认</option>
                      <option>禁用验证 (不安全)</option>
                      <option>自定义 CA 证书</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">TLS 版本</label>
                    <select value={config.tls} onChange={e => updateConfig('tls', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm">
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
                    <input type="text" placeholder="Key" value={config.queryKey} onChange={e => updateConfig('queryKey', e.target.value)} className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-mono" />
                    <input type="text" placeholder="Value" value={config.queryValue} onChange={e => updateConfig('queryValue', e.target.value)} className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-mono" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-primary)]">心跳间隔 (s)</label>
                  <input type="number" value={config.heartbeat} onChange={e => updateConfig('heartbeat', Number(e.target.value))} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
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
                  <div onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.proto'; input.onchange = async () => { const file = input.files?.[0]; if (!file) return; if (file.size > 100000) { alert('Proto文本不能超过100KB'); return; } updateConfig('proto', await file.text()); }; input.click(); }} className="flex items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 hover:bg-[var(--bg-primary)] transition-colors cursor-pointer">
                    <div className="text-center">
                      <Plus className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm font-medium">点击选择 .proto 文本样例</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">仅检查服务/方法声明，不编译或连接</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">Service 名称</label>
                    <input type="text" value={config.service} onChange={e => updateConfig('service', e.target.value)} placeholder="FaceService" className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">Method 名称</label>
                    <input type="text" value={config.rpcMethod} onChange={e => updateConfig('rpcMethod', e.target.value)} placeholder="ExtractFeatures" className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
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
              {selectedProtocol === 'HTTP' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-primary)]">请求方式</label>
                  <div className="flex space-x-2">
                    {['GET', 'POST', 'PUT', 'DELETE'].map(m => (
                      <button key={m} onClick={() => updateConfig('method', m)} className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                        m === config.method ? "bg-blue-600 text-white" : "bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]"
                      )}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(selectedProtocol === 'HTTP' || selectedProtocol === 'WS' || selectedProtocol === 'gRPC') && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[var(--text-primary)]">
                      {selectedProtocol === 'HTTP' ? '请求头 (Headers)' : '元数据 (Metadata)'}
                    </label>
                    <button onClick={() => updateConfig('headers', [...config.headers, { key: '', value: '' }])} className="text-blue-500 text-[10px] font-bold">+ 新增</button>
                  </div>
                  <div className="space-y-2">
                    {config.headers.map((header, index) => <div key={index} className="flex space-x-2">
                      <input type="text" value={header.key} onChange={e => updateConfig('headers', config.headers.map((item, i) => i === index ? { ...item, key: e.target.value } : item))} className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-mono" />
                      <input type="text" value={header.value} onChange={e => updateConfig('headers', config.headers.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-mono" />
                      <button onClick={() => updateConfig('headers', config.headers.filter((_, i) => i !== index))} className="p-1.5 text-red-500"><Trash2 className="w-4 h-4" /></button>
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
                    value={config.body}
                    onChange={e => updateConfig('body', e.target.value)}
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
                <input type="text" value={config.expectedStatus} onChange={e => updateConfig('expectedStatus', e.target.value)} className="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-center font-mono" />
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
                <span className="text-xs text-[var(--text-primary)]">本地断言耗时限制 (ms)</span>
                <input type="number" value={config.timeLimit} onChange={e => updateConfig('timeLimit', Number(e.target.value))} className="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-center font-mono" />
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
                  <button onClick={() => startExecution()} className="py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white">校验样例</button>
                  <button onClick={() => alert('当前仅支持手动离线样例校验，定时任务需要后端调度服务')} className="py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]">定时执行</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-primary)]">执行次数</span>
                <input type="number" value={config.repeat} onChange={e => updateConfig('repeat', Number(e.target.value))} className="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-center" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-primary)]">超时时间 (s)</span>
                <input type="number" value={config.timeout} onChange={e => updateConfig('timeout', Number(e.target.value))} className="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-center" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Execution Page Render ---

  const startExecution = (target = config) => {
    try {
      validateInterfaceConfig(target);
      setIsExecuting(true); setExecutionProgress(0);
      const result = runInterfaceSample(target);
      const time = new Date().toLocaleString('sv-SE');
      const report = { id: `REP-IF-${Date.now()}-${Math.round(performance.now() * 1000)}`, taskId: target.id,
        name: `${target.name}（隔离样例）`, type: '接口测试', result: result.failed ? '失败' : '通过', time, run: result, sampleConfig: { ...target } };
      saveLocalArray('platform-reports-v1', [report, ...readLocalArray('platform-reports-v1', [])]);
      setConfig(target); setRunConfig({ ...target }); setRun(result); setRunTime(time);
      setExecutionProgress(result.checks.length ? 100 : 0); setView('execution');
    } catch (error) { alert(error instanceof Error ? error.message : '本地校验失败，未生成报告'); }
    finally { setIsExecuting(false); }
  };

  const renderExecution = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button onClick={() => setView('list')} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">隔离样例校验（不连接目标系统）</h2>
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
              {isExecuting ? '正在校验离线样例...' : run ? '本地样例断言已完成' : '尚未校验'}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">{runConfig?.name} ({runConfig?.version})</p>
          </div>

          {/* Real-time Logs */}
          <div className="card overflow-hidden flex flex-col h-[400px]">
            <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-between">
              <div className="flex items-center text-xs font-bold text-[var(--text-secondary)] uppercase">
                <Terminal className="w-4 h-4 mr-2" /> 离线断言日志
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-500 font-bold">LOCAL SAMPLE</span>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 p-4 font-mono text-xs space-y-2 overflow-y-auto">
              <p className="text-slate-400">本页仅执行本地样例数据断言，未建立任何协议连接。</p>
              {run?.checks.map((check, index) => <p key={index} className="text-slate-400"><span className={check.result === 'success' ? 'text-emerald-400' : 'text-red-400'}>{check.result === 'success' ? 'PASS' : 'FAIL'}</span> {check.item} ({check.cost}) {check.error === '-' ? '' : check.error}</p>)}
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
                <span className="text-lg font-bold text-emerald-600">{run?.passed ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 mr-3">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">失败次数</span>
                </div>
                <span className="text-lg font-bold text-red-600">{run?.failed ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 mr-3">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">本地断言总耗时</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{run?.durationMs.toFixed(3) ?? '-'}ms</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">测试对象</h3>
            <div className="space-y-3">
              <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">API Endpoint</p>
                <p className="text-xs font-mono text-[var(--text-primary)] truncate">{runConfig?.protocol} 离线数据样例</p>
              </div>
              <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Version</p>
                <p className="text-xs font-mono text-[var(--text-primary)]">{runConfig?.version}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Report Detail Page Render ---

  const renderReportDetail = () => {
    const timeData = (run?.checks || []).map((check, index) => ({ time: `断言${index + 1}`, latency: Number.parseFloat(check.cost) }));

    const pieData = [
      { name: '成功', value: run?.passed ?? 0, color: '#10b981' },
      { name: '失败', value: run?.failed ?? 0, color: '#ef4444' },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button onClick={() => setView('list')} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">离线样例校验报告</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={exportRun} className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm">导出JSON</button>
            <button onClick={() => startExecution(runConfig || config)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              重新测试
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">{runConfig?.name || '尚未执行样例校验'} ({runConfig?.version || '-'})</h3>
              <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                <div className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> {runTime || '-'}</div>
                <div className="flex items-center"><Zap className="w-4 h-4 mr-1.5 text-blue-500" /> {runConfig?.protocol || '-'}隔离样例</div>
                <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" /> {run ? run.failed ? '样例断言存在失败' : '样例断言通过' : '未校验'}</div>
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-500">{run?.checks.length ? (run.passed / run.checks.length * 100).toFixed(1) : '-'}%</p>
                <p className="text-xs text-[var(--text-secondary)]">成功率</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{run?.checks.length ? (run.failed / run.checks.length * 100).toFixed(1) : '-'}%</p>
                <p className="text-xs text-[var(--text-secondary)]">失败率</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{run?.failed ?? '-'}</p>
                <p className="text-xs text-[var(--text-secondary)]">错误数量</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6 lg:col-span-2">
            <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-6">本地断言耗时 (ms，非网络响应)</h4>
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
              {(run?.checks || []).map((row, i) => (
                <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{row.item}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{row.error === '-' ? '样例断言匹配' : row.error}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{row.cost}</td>
                  <td className="px-6 py-4">{getStatusBadge(row.result)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderVersionDiff = () => {
    const diffData = compareVersionSamples(versionDiffConfig.base, versionDiffConfig.target);

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
            <Activity className="w-5 h-5 mr-2 text-blue-500" /> 版本对比配置（预制结构样例，非目标版本检测）
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
              {diffData.map((item, i) => (
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
            <p className="text-3xl font-bold text-red-500">{diffData.filter(item => item.impact === 'breaking').length}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">样例中删除或新增必填字段</p>
          </div>
          <div className="card p-6 border-l-4 border-orange-500">
            <h4 className="text-sm font-semibold mb-2">向后兼容变更</h4>
            <p className="text-3xl font-bold text-orange-500">{diffData.filter(item => item.impact === 'low').length}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">样例可选字段变化</p>
          </div>
          <div className="card p-6 border-l-4 border-emerald-500">
            <h4 className="text-sm font-semibold mb-2">新增功能</h4>
            <p className="text-3xl font-bold text-emerald-500">{diffData.filter(item => item.type === 'added').length}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">样例新增结构数量</p>
          </div>
        </div>

        {/* Recommendations Section */}
        <div className="card p-6">
          <h4 className="text-sm font-semibold mb-4 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-blue-500" /> 兼容性建议
          </h4>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
              <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">建议 1: 接口迁移</p>
              <p className="text-xs text-red-600 dark:text-red-300/80">
                当前预制样例包含 {diffData.filter(item => item.type === 'deleted').length} 项删除变化。真实版本迁移需先提供目标系统的接口定义并接入后端。
              </p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/20">
              <p className="text-sm font-bold text-orange-700 dark:text-orange-400 mb-1">建议 2: 参数适配</p>
              <p className="text-xs text-orange-600 dark:text-orange-300/80">
                当前预制样例包含 {diffData.filter(item => item.type === 'modified').length} 项结构修改。上表仅计算本地结构差异，不代表已完成服务兼容性测试。
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
              <p className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-1">建议 3: 新功能试用</p>
              <p className="text-xs text-blue-600 dark:text-blue-300/80">
                当前预制样例包含 {diffData.filter(item => item.type === 'added').length} 项新增结构，可用于演示差异对比；本页面不会向任何服务发送请求。
              </p>
            </div>
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
      {(configLoad.error || !writeConfigs) && <div role="alert" className="card p-3 mb-3 text-sm text-red-600">本地数据恢复未完成，原始记录已保留：{configLoad.error || '浏览器存储不可用'}</div>}
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
