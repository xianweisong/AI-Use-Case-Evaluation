import React, { useState, useEffect } from 'react';
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
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [versionDiffConfig, setVersionDiffConfig] = useState({ base: 'v1.2.0', target: 'v1.3.0' });
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState('HTTP');
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
  const API_TESTS = [
    { name: '人脸检测接口功能测试', url: '/api/v1/face/detect', method: 'POST', status: 'success', time: getRelativeDate(0, 2, 30) },
    { name: '车辆识别接口连通性', url: '/api/v1/vehicle/identify', method: 'GET', status: 'failed', time: getRelativeDate(0, 1, 15) },
    { name: '轨迹查询接口性能预检', url: '/api/v1/track/query', method: 'POST', status: 'none', time: getRelativeDate(0, 3, 45) },
  ];

  const filteredAPITests = React.useMemo(() => {
    return API_TESTS.filter(item => {
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
  }, [apiSearch, apiStatusFilter]);

  useEffect(() => {
    setView('list');
    setSelectedItem(null);
  }, [activeSubTab]);

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
        <button className="flex items-center px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-secondary)]">
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
        <button className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
          <Filter className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderAPITestList = () => (
    <div className="space-y-6">
      {renderListHeader('API测试', () => setView('config'))}
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
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{item.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{item.url}</td>
                <td className="px-6 py-4">{getMethodBadge(item.method)}</td>
                <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => setView('config')} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded" title="配置">
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setView('execution'); startExecution(); }} className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 rounded" title="执行">
                      <Play className="w-4 h-4" />
                    </button>
                    <button onClick={() => setView('reportDetail')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-secondary)] rounded" title="报告">
                      <FileText className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded" title="删除">
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
            {[
              { name: 'FaceAPI 多版本兼容性', api: '人脸检测接口', versions: 3, status: 'success', time: getRelativeDate(12) },
              { name: 'VehicleAPI 升级回归测试', api: '车辆识别接口', versions: 2, status: 'running', time: getRelativeDate(1) },
            ].map((item, i) => (
              <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{item.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.api}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.versions} 个版本</td>
                <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    <button onClick={() => setView('config')} className="text-xs font-medium text-blue-500 hover:text-blue-600">配置</button>
                    <button className="text-xs font-medium text-emerald-500 hover:text-emerald-600">执行</button>
                    <button onClick={() => setView('reportDetail')} className="text-xs font-medium text-slate-500 hover:text-slate-600">报告</button>
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
    const protocols = [
      { name: 'HTTPS 安全协议适配', api: '人脸检测接口', protocol: 'HTTPS', status: 'success', time: getRelativeDate(15) },
      { name: 'HTTP 降级兼容测试', api: '车辆识别接口', protocol: 'HTTP', status: 'none', time: getRelativeDate(1) },
      { name: 'WebSocket 双向通信测试', api: '实时视频流推送', protocol: 'WS', status: 'running', time: getRelativeDate(0, 5) },
      { name: 'gRPC 接口性能评测', api: '特征向量检索服务', protocol: 'gRPC', status: 'success', time: getRelativeDate(0, 10) },
    ];

    const handleAutoRecognize = () => {
      setIsAutoRecognizing(true);
      setTimeout(() => {
        setIsAutoRecognizing(false);
        alert('协议识别完成：检测到 2 个 HTTP 接口，1 个 WebSocket 接口，1 个 gRPC 接口。已自动适配测试配置。');
      }, 2000);
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
              disabled={isAutoRecognizing}
              className="flex items-center px-4 py-2 border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isAutoRecognizing && "animate-spin")} />
              {isAutoRecognizing ? '正在识别协议...' : '协议自动识别'}
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
                  <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.api}</td>
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
                      <button onClick={() => { setSelectedProtocol(item.protocol.includes('HTTP') ? 'HTTP' : item.protocol); setView('config'); }} className="text-xs font-medium text-blue-500 hover:text-blue-600">配置</button>
                      <button className="text-xs font-medium text-emerald-500 hover:text-emerald-600">执行</button>
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
          <button className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-secondary)]">
            取消
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20">
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
                <input type="text" defaultValue="人脸检测接口功能测试" className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
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
                <input type="text" defaultValue={selectedProtocol === 'WS' ? 'ws://api.police.gov/v1/stream' : selectedProtocol === 'gRPC' ? 'api.police.gov:50051' : '/api/v1/face/detect'} className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">接口版本</label>
                <input type="text" defaultValue="v1.2.0" className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
              </div>
            </div>
          </div>

          {/* Protocol Specific Config */}
          {selectedProtocol === 'HTTP' && (
            <div className="card p-6">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">SSL/TLS 配置</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-primary)]">启用 HTTPS / SSL</span>
                  <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">验证服务器证书</label>
                    <select className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm">
                      <option>系统默认</option>
                      <option>禁用验证 (不安全)</option>
                      <option>自定义 CA 证书</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">TLS 版本</label>
                    <select className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm">
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
                    <input type="text" placeholder="Key" className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-mono" />
                    <input type="text" placeholder="Value" className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-mono" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-primary)]">心跳间隔 (s)</label>
                  <input type="number" defaultValue="30" className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
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
                  <div className="flex items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 hover:bg-[var(--bg-primary)] transition-colors cursor-pointer">
                    <div className="text-center">
                      <Plus className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm font-medium">点击或拖拽上传 .proto 文件</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">支持多文件上传，自动解析依赖</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">Service 名称</label>
                    <input type="text" placeholder="FaceService" className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-primary)]">Method 名称</label>
                    <input type="text" placeholder="ExtractFeatures" className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm" />
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
                      <button key={m} className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                        m === 'POST' ? "bg-blue-600 text-white" : "bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]"
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
                    <button className="text-blue-500 text-[10px] font-bold">+ 新增</button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input type="text" defaultValue={selectedProtocol === 'HTTP' ? "Content-Type" : "authorization"} className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-mono" />
                      <input type="text" defaultValue={selectedProtocol === 'HTTP' ? "application/json" : "Bearer {{token}}"} className="flex-1 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-mono" />
                      <button className="p-1.5 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
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
                    defaultValue={selectedProtocol === 'gRPC' ? `{
  "image": {
    "data": "...",
    "type": "FACE"
  },
  "options": {
    "score_threshold": 0.8
  }
}` : `{
  "image_base64": "...",
  "min_confidence": 0.8,
  "detect_landmarks": true
}`}
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
                <input type="text" defaultValue="200" className="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-center font-mono" />
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
                <input type="number" defaultValue="500" className="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-center font-mono" />
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
                  <button className="py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white">立即执行</button>
                  <button className="py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]">定时执行</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-primary)]">执行次数</span>
                <input type="number" defaultValue="1" className="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-center" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-primary)]">超时时间 (s)</span>
                <input type="number" defaultValue="30" className="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-center" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Execution Page Render ---

  const startExecution = () => {
    setIsExecuting(true);
    setExecutionProgress(0);
    const interval = setInterval(() => {
      setExecutionProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
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
          <button onClick={() => setView('list')} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">测试执行中</h2>
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
              {isExecuting ? '正在执行测试用例...' : '测试执行完成'}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">人脸检测接口功能测试 (v1.2.0)</p>
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
              <p className="text-slate-400">[10:00:01] <span className="text-blue-400">INFO</span> 初始化测试环境...</p>
              <p className="text-slate-400">[10:00:02] <span className="text-blue-400">INFO</span> 正在发送请求: POST /api/v1/face/detect</p>
              <p className="text-slate-400">[10:00:02] <span className="text-slate-500">DEBUG</span> Headers: {"{ \"Content-Type\": \"application/json\" }"}</p>
              <p className="text-slate-400">[10:00:03] <span className="text-emerald-400">SUCCESS</span> 收到响应: 200 OK (142ms)</p>
              <p className="text-slate-400">[10:00:03] <span className="text-blue-400">INFO</span> 正在校验响应字段...</p>
              <p className="text-slate-400">[10:00:04] <span className="text-emerald-400">SUCCESS</span> 字段校验通过: $.status == "OK"</p>
              {executionProgress > 50 && (
                <>
                  <p className="text-slate-400">[10:00:05] <span className="text-blue-400">INFO</span> 正在执行第 2 次测试...</p>
                  <p className="text-slate-400">[10:00:06] <span className="text-emerald-400">SUCCESS</span> 收到响应: 200 OK (156ms)</p>
                </>
              )}
              {executionProgress === 100 && (
                <p className="text-slate-400">[10:00:07] <span className="text-emerald-400 font-bold">DONE</span> 测试执行完毕，正在生成报告。</p>
              )}
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
                <span className="text-lg font-bold text-emerald-600">{Math.floor(executionProgress / 10)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 mr-3">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">失败次数</span>
                </div>
                <span className="text-lg font-bold text-red-600">0</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 mr-3">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">平均耗时</span>
                </div>
                <span className="text-lg font-bold text-blue-600">148ms</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">测试对象</h3>
            <div className="space-y-3">
              <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">API Endpoint</p>
                <p className="text-xs font-mono text-[var(--text-primary)] truncate">https://api.police.gov/v1/face/detect</p>
              </div>
              <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Version</p>
                <p className="text-xs font-mono text-[var(--text-primary)]">v1.2.0 (Stable)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Report Detail Page Render ---

  const renderReportDetail = () => {
    const getTrendTimes = () => {
      const times = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setHours(d.getHours() - i);
        times.push(`${String(d.getHours()).padStart(2, '0')}:00`);
      }
      return times;
    };

    const trendTimes = getTrendTimes();

    const timeData = [
      { time: trendTimes[0], latency: 120 },
      { time: trendTimes[1], latency: 142 },
      { time: trendTimes[2], latency: 135 },
      { time: trendTimes[3], latency: 156 },
      { time: trendTimes[4], latency: 148 },
      { time: trendTimes[5], latency: 130 },
    ];

    const pieData = [
      { name: '成功', value: 98, color: '#10b981' },
      { name: '失败', value: 2, color: '#ef4444' },
    ];

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
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              重新测试
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">人脸检测接口功能测试报告 (v1.2.0)</h3>
              <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                <div className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> 2026-03-01 10:45:00</div>
                <div className="flex items-center"><Zap className="w-4 h-4 mr-1.5 text-blue-500" /> API测试</div>
                <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" /> 测试通过</div>
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-500">98%</p>
                <p className="text-xs text-[var(--text-secondary)]">成功率</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">2%</p>
                <p className="text-xs text-[var(--text-secondary)]">失败率</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">0</p>
                <p className="text-xs text-[var(--text-secondary)]">错误数量</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6 lg:col-span-2">
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
              {[
                { item: '状态码校验 (200)', result: '200 OK', latency: '142ms', status: 'success' },
                { item: '响应字段校验 ($.status)', result: 'OK', latency: '142ms', status: 'success' },
                { item: '响应字段校验 ($.data.faces)', result: 'Array(2)', latency: '142ms', status: 'success' },
                { item: '响应时间校验 (<500ms)', result: '142ms', latency: '142ms', status: 'success' },
              ].map((row, i) => (
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
            <p className="text-3xl font-bold text-red-500">2</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">需要立即更新客户端代码</p>
          </div>
          <div className="card p-6 border-l-4 border-orange-500">
            <h4 className="text-sm font-semibold mb-2">向后兼容变更</h4>
            <p className="text-3xl font-bold text-orange-500">1</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">建议在下个版本适配</p>
          </div>
          <div className="card p-6 border-l-4 border-emerald-500">
            <h4 className="text-sm font-semibold mb-2">新增功能</h4>
            <p className="text-3xl font-bold text-emerald-500">1</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">可供新业务使用</p>
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
