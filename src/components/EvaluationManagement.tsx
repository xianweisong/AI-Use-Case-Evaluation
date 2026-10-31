import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Download, 
  Play, 
  Trash2, 
  Eye, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  ArrowLeft,
  Calendar,
  User,
  Settings,
  Database,
  Activity,
  Zap,
  Layout as LayoutIcon,
  FileText,
  GitCompare,
  Tag,
  ArrowRight,
  AlertTriangle
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
  Legend
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EvaluationManagementProps {
  activeSubTab: string;
}

type ViewType = 'list' | 'taskDetail' | 'reportDetail' | 'versionDiff';

export default function EvaluationManagement({ activeSubTab }: EvaluationManagementProps) {
  const [view, setView] = useState<ViewType>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [taskModalConfig, setTaskModalConfig] = useState<{ open: boolean; task?: any; initialType?: string }>({ open: false });
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [versionDiffConfig, setVersionDiffConfig] = useState({ base: 'v1.2.0', target: 'v1.3.0' });
  
  // Filter States
  const [taskSearch, setTaskSearch] = useState('');
  const [taskTypeFilter, setTaskTypeFilter] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('');
  
  const [reportSearch, setReportSearch] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState('');
  const [reportResultFilter, setReportResultFilter] = useState('');

  // Helper to get relative date
  const getRelativeDate = (daysAgo: number = 0, hoursAgo: number = 0, minsAgo: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(d.getHours() - hoursAgo);
    d.setMinutes(d.getMinutes() - minsAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Task State
  const [tasks, setTasks] = useState([
    { id: 'TASK-001', name: '人脸识别精度测试', type: 'UI测试', target: 'FaceSDK-v2.1', status: 'completed', time: getRelativeDate(0, 2, 30), user: '张警官' },
    { id: 'TASK-002', name: '车辆识别接口压力测试', type: '接口测试', target: 'VehicleAPI-v1.0', status: 'running', time: getRelativeDate(0, 1, 15), user: '李警官' },
    { id: 'TASK-003', name: '视频流并发处理评测', type: '性能测试', target: 'StreamServer-v3', status: 'failed', time: getRelativeDate(0, 3, 45), user: '王警官' },
    { id: 'TASK-004', name: '移动端UI兼容性测试', type: 'UI测试', target: 'MobileApp-v1.2', status: 'pending', time: getRelativeDate(0, 0, 15), user: '赵警官' },
  ]);

  const [reports, setReports] = useState([
    { id: 'REP-001', name: '人脸识别精度测试', type: 'UI测试', result: '通过', time: getRelativeDate(0, 2, 45) },
    { id: 'REP-002', name: '车辆识别接口压力测试', type: '接口测试', result: '部分失败', time: getRelativeDate(0, 1, 30) },
    { id: 'REP-003', name: '视频流并发处理评测', type: '性能测试', result: '失败', time: getRelativeDate(0, 3, 0) },
    { id: 'REP-004', name: '仪表盘组件渲染测试', type: 'UI测试', result: '通过', time: getRelativeDate(0, 0, 45) },
    { id: 'REP-005', name: '车辆轨迹查询API', type: '接口测试', result: '失败', time: getRelativeDate(0, 1, 15) },
    { id: 'REP-006', name: '数据库写入性能评测', type: '性能测试', result: '通过', time: getRelativeDate(0, 4, 30) },
  ]);

  const filteredTasks = React.useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(taskSearch.toLowerCase()) || 
                           task.id.toLowerCase().includes(taskSearch.toLowerCase());
      const matchesType = !taskTypeFilter || task.type === taskTypeFilter;
      const matchesStatus = !taskStatusFilter || task.status === taskStatusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [tasks, taskSearch, taskTypeFilter, taskStatusFilter]);

  const filteredReports = React.useMemo(() => {
    return reports.filter(rep => {
      const matchesSearch = rep.name.toLowerCase().includes(reportSearch.toLowerCase()) || 
                           rep.id.toLowerCase().includes(reportSearch.toLowerCase());
      const matchesType = !reportTypeFilter || rep.type === reportTypeFilter;
      const matchesResult = !reportResultFilter || rep.result === reportResultFilter;
      return matchesSearch && matchesType && matchesResult;
    });
  }, [reports, reportSearch, reportTypeFilter, reportResultFilter]);

  // Reset view when sub-tab changes
  React.useEffect(() => {
    setView('list');
  }, [activeSubTab]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { label: '未开始', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
      case 'running': return { label: '运行中', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' };
      case 'completed': return { label: '已完成', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' };
      case 'failed': return { label: '失败', color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' };
      default: return { label: '未知', color: 'bg-slate-100 text-slate-600' };
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const { label, color } = getStatusLabel(status);
    return (
      <span className={cn("text-xs px-2 py-1 rounded-full font-medium", color)}>
        {label}
      </span>
    );
  };

  const handleRunTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: t.status === 'running' ? 'completed' : 'running' };
      }
      return t;
    }));
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('确定要删除该测试任务吗？')) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleAddTask = (newTask: any) => {
    setTasks(prev => [newTask, ...prev]);
    setTaskModalConfig({ open: false });
  };

  const handleUpdateTask = (updatedTask: any) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setTaskModalConfig({ open: false });
  };

  const ReportModal = ({ onClose }: { onClose: () => void }) => {
    const [template, setTemplate] = useState('detailed');
    const [content, setContent] = useState(['overview', 'stats', 'results', 'problems']);
    const [exportFormat, setExportFormat] = useState('pdf');

    const templates = [
      { id: 'simple', name: '简洁版', desc: '仅包含核心指标和结论' },
      { id: 'detailed', name: '详细版', desc: '包含完整测试数据和分析' },
      { id: 'executive', name: 'Executive版', desc: '面向管理层的高层级汇总' },
      { id: 'compatibility', name: '兼容性分析', desc: '专注于版本间变更及影响' },
    ];

    const modules = [
      { id: 'overview', name: '测试概述' },
      { id: 'stats', name: '执行统计' },
      { id: 'results', name: '详细结果' },
      { id: 'problems', name: '问题汇总' },
      { id: 'diff', name: '变更对比' },
      { id: 'impact', name: '影响分析' },
    ];

    const handleGenerate = () => {
      setGeneratingReport(true);
      setTimeout(() => {
        setGeneratingReport(false);
        alert('报告生成成功！');
        onClose();
      }, 1500);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--bg-secondary)] w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)]">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-500" /> 生成测试报告
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-full text-[var(--text-secondary)]">
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </div>
          
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Template Selection */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-[var(--text-primary)]">1. 选择报告模板</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      template === t.id 
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20" 
                        : "border-[var(--border-color)] hover:border-blue-400"
                    )}
                  >
                    <p className="text-sm font-bold mb-1">{t.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Selection */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-[var(--text-primary)]">2. 自定义报告内容</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {modules.map(m => (
                  <label key={m.id} className="flex items-center p-3 border border-[var(--border-color)] rounded-lg cursor-pointer hover:bg-[var(--bg-primary)] transition-colors">
                    <input 
                      type="checkbox" 
                      checked={content.includes(m.id)}
                      onChange={(e) => {
                        if (e.target.checked) setContent([...content, m.id]);
                        else setContent(content.filter(id => id !== m.id));
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-[var(--border-color)] focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-[var(--text-primary)]">{m.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Export Format */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-[var(--text-primary)]">3. 导出格式</label>
              <div className="flex flex-wrap gap-4">
                {['pdf', 'word', 'html'].map(f => (
                  <button
                    key={f}
                    onClick={() => setExportFormat(f)}
                    className={cn(
                      "px-6 py-2 rounded-lg border text-sm font-medium transition-all uppercase",
                      exportFormat === f 
                        ? "border-blue-500 bg-blue-600 text-white" 
                        : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[var(--border-color)] flex justify-end space-x-3 bg-[var(--bg-primary)]">
            <button 
              onClick={onClose}
              className="px-6 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-secondary)]"
            >
              取消
            </button>
            <button 
              onClick={handleGenerate}
              disabled={generatingReport || content.length === 0}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center"
            >
              {generatingReport ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  正在生成...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  立即生成并导出
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  // --- Sub-components ---

  const TaskModal = ({ 
    config, 
    onAdd, 
    onUpdate, 
    onClose 
  }: { 
    config: { open: boolean; task?: any; initialType?: string };
    onAdd: (task: any) => void;
    onUpdate: (task: any) => void;
    onClose: () => void;
  }) => {
    const isEdit = !!config.task;
    const [formData, setFormData] = useState({
      name: config.task?.name || '',
      type: config.task?.type || config.initialType || 'UI测试',
      target: config.task?.target || '',
      config: config.task?.config || '{\n  "threshold": 0.85,\n  "max_iterations": 1000\n}'
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (isEdit) {
        onUpdate({
          ...config.task,
          ...formData,
          time: new Date().toLocaleString(),
        });
      } else {
        const newTask = {
          id: `TASK-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          name: formData.name,
          type: formData.type,
          target: formData.target,
          status: 'pending',
          time: new Date().toLocaleString(),
          user: '当前用户'
        };
        onAdd(newTask);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--bg-secondary)] w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)]">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              {isEdit ? '编辑测试任务' : '新建测试任务'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-full text-[var(--text-secondary)]">
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">任务名称</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="请输入任务名称"
                  className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">测试类型</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option>UI测试</option>
                  <option>接口测试</option>
                  <option>性能测试</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">测试对象</label>
                <input 
                  required
                  type="text" 
                  value={formData.target}
                  onChange={e => setFormData({...formData, target: e.target.value})}
                  placeholder="如：FaceSDK-v2.1"
                  className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">测试配置 (JSON)</label>
              <textarea 
                rows={4}
                value={formData.config}
                onChange={e => setFormData({...formData, config: e.target.value})}
                className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-secondary)]"
              >
                取消
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20"
              >
                {isEdit ? '保存修改' : '创建任务'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };

  // --- Render Functions ---

  const renderHeader = (title: string, onAdd?: () => void) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">评测管理 / {title}</p>
      </div>
      {onAdd && (
        <button 
          onClick={onAdd}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> 新建任务
        </button>
      )}
    </div>
  );

  const renderFilters = (
    type: 'task' | 'report',
    types?: string[],
    searchValue?: string,
    onSearchChange?: (val: string) => void,
    typeValue?: string,
    onTypeChange?: (val: string) => void,
    statusValue?: string,
    onStatusChange?: (val: string) => void
  ) => (
    <div className="card p-4 mb-6 flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
        <input 
          type="text" 
          placeholder="搜索名称、ID..." 
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
      {types && (
        <select 
          value={typeValue}
          onChange={(e) => onTypeChange?.(e.target.value)}
          className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[var(--text-primary)]"
        >
          <option value="">所有类型</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
      <select 
        value={statusValue}
        onChange={(e) => onStatusChange?.(e.target.value)}
        className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[var(--text-primary)]"
      >
        <option value="">{type === 'task' ? '所有状态' : '所有结果'}</option>
        {type === 'task' ? (
          <>
            <option value="pending">未开始</option>
            <option value="running">运行中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
          </>
        ) : (
          <>
            <option value="通过">通过</option>
            <option value="部分失败">部分失败</option>
            <option value="失败">失败</option>
          </>
        )}
      </select>
          <div className="flex items-center space-x-2">
            <button className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
              <Filter className="w-4 h-4" />
            </button>
          </div>
    </div>
  );

  const renderTestTasks = () => (
    <>
      {renderHeader('测试任务', () => setTaskModalConfig({ open: true }))}
      {renderFilters(
        'task',
        ['UI测试', '接口测试', '性能测试'],
        taskSearch,
        setTaskSearch,
        taskTypeFilter,
        setTaskTypeFilter,
        taskStatusFilter,
        setTaskStatusFilter
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">任务ID</th>
              <th className="px-6 py-4 font-semibold">任务名称</th>
              <th className="px-6 py-4 font-semibold">测试类型</th>
              <th className="px-6 py-4 font-semibold">测试对象</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">创建时间</th>
              <th className="px-6 py-4 font-semibold">创建人</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filteredTasks.length > 0 ? filteredTasks.map((task) => (
              <tr key={task.id} className="hover:bg-[var(--bg-primary)] transition-colors group">
                <td className="px-6 py-4 text-sm font-mono text-[var(--text-secondary)]">{task.id}</td>
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{task.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.type}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.target}</td>
                <td className="px-6 py-4"><StatusBadge status={task.status} /></td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.time}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.user}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => { setSelectedId(task.id); setView('taskDetail'); }}
                      className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded" title="查看"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setTaskModalConfig({ open: true, task })}
                      className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500 rounded" title="编辑"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleRunTask(task.id)}
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        task.status === 'running' 
                          ? "bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20" 
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20"
                      )}
                      title={task.status === 'running' ? "停止" : "执行"}
                    >
                      {task.status === 'running' ? <Clock className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded" title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                  未找到匹配的任务
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderTestReports = () => (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">测试报告</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">评测管理 / 测试报告</p>
        </div>
        <button 
          onClick={() => setReportModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> 生成新报告
        </button>
      </div>
      {renderFilters(
        'report',
        ['UI测试', '接口测试', '性能测试'],
        reportSearch,
        setReportSearch,
        reportTypeFilter,
        setReportTypeFilter,
        reportResultFilter,
        setReportResultFilter
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">报告ID</th>
              <th className="px-6 py-4 font-semibold">任务名称</th>
              <th className="px-6 py-4 font-semibold">测试类型</th>
              <th className="px-6 py-4 font-semibold">结果</th>
              <th className="px-6 py-4 font-semibold">生成时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filteredReports.length > 0 ? filteredReports.map((rep) => (
              <tr key={rep.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-[var(--text-secondary)]">{rep.id}</td>
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{rep.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{rep.type}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full font-medium",
                    rep.result === '通过' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" :
                    rep.result === '部分失败' ? "bg-orange-50 text-orange-600 dark:bg-orange-900/20" :
                    "bg-red-50 text-red-600 dark:bg-red-900/20"
                  )}>
                    {rep.result}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{rep.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => { setSelectedId(rep.id); setView('reportDetail'); }}
                      className="flex items-center text-xs font-medium text-blue-500 hover:text-blue-600"
                    >
                      <BarChart3 className="w-3.5 h-3.5 mr-1" /> 查看报告
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                  未找到匹配的报告
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderUITest = () => (
    <>
      {renderHeader('UI测试', () => setTaskModalConfig({ open: true, initialType: 'UI测试' }))}
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">测试名称</th>
              <th className="px-6 py-4 font-semibold">测试页面</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">执行时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {[
              { id: 'REP-001', name: '登录页面自动化测试', page: '/login', status: 'completed', time: '2026-03-01 10:00' },
              { id: 'REP-004', name: '仪表盘组件渲染测试', page: '/dashboard', status: 'running', time: '2026-03-01 11:30' },
            ].map((test, i) => (
              <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{test.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{test.page}</td>
                <td className="px-6 py-4"><StatusBadge status={test.status} /></td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{test.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    <button className="text-xs font-medium text-blue-500 hover:text-blue-600">执行</button>
                    <button 
                      onClick={() => { setSelectedId(test.id); setView('reportDetail'); }}
                      className="text-xs font-medium text-slate-500 hover:text-slate-600"
                    >
                      查看结果
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderInterfaceTest = () => (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">接口测试</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">评测管理 / 接口测试</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setView('versionDiff')}
            className="flex items-center px-4 py-2 border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium transition-all"
          >
            <GitCompare className="w-4 h-4 mr-2" /> 多版本对比
          </button>
          <button 
            onClick={() => setTaskModalConfig({ open: true, initialType: '接口测试' })}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> 新增接口测试
          </button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">接口名称</th>
              <th className="px-6 py-4 font-semibold">接口地址</th>
              <th className="px-6 py-4 font-semibold">方法</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {[
              { id: 'REP-002', name: '人脸特征提取API', url: '/api/v1/face/extract', method: 'POST', status: 'completed' },
              { id: 'REP-005', name: '车辆轨迹查询API', url: '/api/v1/vehicle/track', method: 'GET', status: 'failed' },
            ].map((test, i) => (
              <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{test.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{test.url}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-bold",
                    test.method === 'POST' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  )}>
                    {test.method}
                  </span>
                </td>
                <td className="px-6 py-4"><StatusBadge status={test.status} /></td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    <button className="text-xs font-medium text-blue-500 hover:text-blue-600">执行</button>
                    <button 
                      onClick={() => { setSelectedId(test.id); setView('reportDetail'); }}
                      className="text-xs font-medium text-slate-500 hover:text-slate-600"
                    >
                      查看结果
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

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
            <GitCompare className="w-5 h-5 mr-2 text-blue-500" /> 版本对比配置
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
                  <Tag className="w-5 h-5 text-slate-500" />
                </div>
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <ArrowRight className="w-6 h-6 text-[var(--text-secondary)]" />
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
                      <AlertTriangle className={cn(
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

  const renderPerformanceTest = () => (
    <>
      {renderHeader('性能测试', () => setTaskModalConfig({ open: true, initialType: '性能测试' }))}
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">测试名称</th>
              <th className="px-6 py-4 font-semibold">测试对象</th>
              <th className="px-6 py-4 font-semibold">并发数</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {[
              { id: 'REP-003', name: '高并发视频流接入测试', target: 'StreamGateway-v2', concurrency: 500, status: 'completed' },
              { id: 'REP-006', name: '数据库写入性能评测', target: 'PostgreSQL-Cluster', concurrency: 1000, status: 'running' },
            ].map((test, i) => (
              <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{test.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{test.target}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{test.concurrency}</td>
                <td className="px-6 py-4"><StatusBadge status={test.status} /></td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    <button className="text-xs font-medium text-blue-500 hover:text-blue-600">执行</button>
                    <button 
                      onClick={() => { setSelectedId(test.id); setView('reportDetail'); }}
                      className="text-xs font-medium text-slate-500 hover:text-slate-600"
                    >
                      查看结果
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderTaskDetail = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setView('list')}
          className="text-sm text-blue-500 hover:text-blue-600 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-500" /> 基本信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-[var(--text-secondary)]">任务名称</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">人脸识别精度测试 (TASK-001)</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[var(--text-secondary)]">测试类型</p>
                <div className="flex items-center">
                  <LayoutIcon className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                  <p className="text-sm font-medium text-[var(--text-primary)]">UI测试</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[var(--text-secondary)]">创建时间</p>
                <div className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  <p className="text-sm font-medium text-[var(--text-primary)]">{getRelativeDate(0, 1, 0)}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[var(--text-secondary)]">创建人</p>
                <div className="flex items-center">
                  <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  <p className="text-sm font-medium text-[var(--text-primary)]">张警官</p>
                </div>
              </div>
            </div>
          </div>

          {/* Test Config */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-blue-500" /> 测试配置
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">运行参数</p>
                <div className="bg-[var(--bg-primary)] p-4 rounded-lg font-mono text-xs text-[var(--text-primary)] border border-[var(--border-color)]">
                  {`{
  "threshold": 0.85,
  "max_iterations": 1000,
  "retry_on_failure": true,
  "log_level": "DEBUG"
}`}
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">数据集</p>
                <div className="flex items-center p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)]">
                  <Database className="w-5 h-5 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium">Standard_Face_Dataset_2026.zip</p>
                    <p className="text-xs text-[var(--text-secondary)]">大小: 1.2GB | 包含 50,000 张样本</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Execution Status */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-500" /> 执行信息
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">当前状态</span>
                <StatusBadge status="completed" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">执行进度</span>
                  <span className="font-medium text-blue-500">100%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-full" />
                </div>
              </div>
              <div className="pt-4 border-t border-[var(--border-color)]">
                <button 
                  onClick={() => setView('reportDetail')}
                  className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center"
                >
                  <BarChart3 className="w-4 h-4 mr-2" /> 查看测试报告
                </button>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold mb-4">执行节点</h3>
            <div className="flex items-center p-3 bg-[var(--bg-primary)] rounded-lg">
              <Zap className="w-4 h-4 text-orange-500 mr-3" />
              <div>
                <p className="text-xs font-medium">GPU-Node-04</p>
                <p className="text-[10px] text-[var(--text-secondary)]">负载: 42% | 温度: 65°C</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReportDetail = () => {
    const report = reports.find(r => r.id === selectedId) || reports[0];
    const type = report.type;

    const pieData = [
      { name: '成功', value: 92, color: '#10b981' },
      { name: '失败', value: 8, color: '#ef4444' },
    ];

    const getTrendTimes = () => {
      const times = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setMinutes(d.getMinutes() - i * 10);
        times.push(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      }
      return times;
    };

    const trendTimes = getTrendTimes();

    const trendData = [
      { time: trendTimes[0], timeCost: 120, successRate: 85 },
      { time: trendTimes[1], timeCost: 132, successRate: 88 },
      { time: trendTimes[2], timeCost: 101, successRate: 92 },
      { time: trendTimes[3], timeCost: 134, successRate: 90 },
      { time: trendTimes[4], timeCost: 90, successRate: 95 },
      { time: trendTimes[5], timeCost: 230, successRate: 82 },
      { time: trendTimes[6], timeCost: 210, successRate: 89 },
    ];

    const renderUITestReport = () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '页面加载耗时', value: '1.2s', status: 'success' },
            { label: '首屏渲染耗时', value: '0.8s', status: 'success' },
            { label: '交互响应耗时', value: '120ms', status: 'success' },
            { label: '资源错误数', value: '0', status: 'success' },
          ].map((item, i) => (
            <div key={i} className="card p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">{item.label}</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="card p-6">
          <h4 className="text-sm font-semibold mb-4">UI 兼容性分析</h4>
          <div className="space-y-4">
            {['Chrome 120', 'Safari 17', 'Firefox 121', 'Edge 120'].map((browser, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg">
                <span className="text-sm">{browser}</span>
                <span className="text-xs text-emerald-500 font-medium">100% 匹配</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    const renderInterfaceTestReport = () => (
      <div className="space-y-6">
        <div className="card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs">
                <th className="px-6 py-3 font-semibold">请求路径</th>
                <th className="px-6 py-3 font-semibold">状态码</th>
                <th className="px-6 py-3 font-semibold">响应时间</th>
                <th className="px-6 py-3 font-semibold">结果</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {[
                { path: '/api/v1/user/profile', code: 200, time: '45ms', result: 'PASS' },
                { path: '/api/v1/auth/login', code: 200, time: '120ms', result: 'PASS' },
                { path: '/api/v1/data/sync', code: 500, time: '2100ms', result: 'FAIL' },
              ].map((row, i) => (
                <tr key={i} className="text-sm">
                  <td className="px-6 py-3 font-mono">{row.path}</td>
                  <td className="px-6 py-3">{row.code}</td>
                  <td className="px-6 py-3 text-[var(--text-secondary)]">{row.time}</td>
                  <td className="px-6 py-3">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-bold",
                      row.result === 'PASS' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      {row.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );

    const renderPerformanceTestReport = () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <h4 className="text-sm font-semibold mb-4">吞吐量 (TPS)</h4>
            <p className="text-3xl font-bold text-blue-500">1,240</p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">峰值: 1,580 TPS</p>
          </div>
          <div className="card p-6">
            <h4 className="text-sm font-semibold mb-4">并发用户数</h4>
            <p className="text-3xl font-bold text-orange-500">500</p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">稳定运行时间: 2h 15m</p>
          </div>
          <div className="card p-6">
            <h4 className="text-sm font-semibold mb-4">错误率</h4>
            <p className="text-3xl font-bold text-red-500">0.05%</p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">超时请求: 12个</p>
          </div>
        </div>
      </div>
    );

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

        {/* Report Summary */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">{report.name} 报告 ({report.id})</h3>
              <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                <div className="flex items-center"><Clock className="w-4 h-4 mr-1.5" /> {report.time}</div>
                <div className="flex items-center"><LayoutIcon className="w-4 h-4 mr-1.5" /> {report.type}</div>
                <div className="flex items-center">
                  <CheckCircle2 className={cn(
                    "w-4 h-4 mr-1.5",
                    report.result === '通过' ? "text-emerald-500" : "text-red-500"
                  )} /> 
                  评测{report.result}
                </div>
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-500">92%</p>
                <p className="text-xs text-[var(--text-secondary)]">成功率</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">8%</p>
                <p className="text-xs text-[var(--text-secondary)]">失败率</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">142ms</p>
                <p className="text-xs text-[var(--text-secondary)]">平均耗时</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6 lg:col-span-2">
            <h4 className="text-sm font-semibold mb-6">趋势分析 (耗时 & 成功率)</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                  <Legend verticalAlign="top" height={36}/>
                  <Line name="耗时 (ms)" type="monotone" dataKey="timeCost" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line name="成功率 (%)" type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-6 flex flex-col">
            <h4 className="text-sm font-semibold mb-6">结果分布</h4>
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
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-[var(--text-secondary)]">{item.name} ({item.value}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Type Specific Content */}
        <div className="space-y-6">
          <h4 className="text-lg font-bold flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-500" /> 详细测试指标
          </h4>
          {type === 'UI测试' && renderUITestReport()}
          {type === '接口测试' && renderInterfaceTestReport()}
          {type === '性能测试' && renderPerformanceTestReport()}
        </div>

        {/* Detailed Table */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)]">
            <h4 className="text-sm font-semibold">测试项明细</h4>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">测试项</th>
                <th className="px-6 py-4 font-semibold">结果</th>
                <th className="px-6 py-4 font-semibold">耗时</th>
                <th className="px-6 py-4 font-semibold">错误信息</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {[
                { item: '人脸检测 - 正面', result: 'success', cost: '45ms', error: '-' },
                { item: '人脸检测 - 侧面', result: 'success', cost: '52ms', error: '-' },
                { item: '特征点提取', result: 'success', cost: '120ms', error: '-' },
                { item: '活体检测', result: 'failed', cost: '210ms', error: '光照强度不足' },
                { item: '人脸比对 (1:1)', result: 'success', cost: '85ms', error: '-' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{row.item}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {row.result === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        row.result === 'success' ? "text-emerald-600" : "text-red-600"
                      )}>
                        {row.result === 'success' ? '通过' : '失败'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{row.cost}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{row.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (view === 'taskDetail') return renderTaskDetail();
    if (view === 'reportDetail') return renderReportDetail();
    if (view === 'versionDiff') return renderVersionDiff();

    return (
      <>
        {taskModalConfig.open && (
          <TaskModal 
            config={taskModalConfig}
            onAdd={handleAddTask}
            onUpdate={handleUpdateTask}
            onClose={() => setTaskModalConfig({ open: false })}
          />
        )}
        {reportModalOpen && (
          <ReportModal 
            onClose={() => setReportModalOpen(false)}
          />
        )}
        {(() => {
          switch (activeSubTab) {
            case 'task-mgmt': return renderTestTasks();
            case 'reports': return renderTestReports();
            case 'ui-test': return renderUITest();
            case 'api-test': return renderInterfaceTest();
            case 'perf-test': return renderPerformanceTest();
            default: return renderTestTasks();
          }
        })()}
      </>
    );
  };

  return (
    <div className="h-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeSubTab}-${view}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
