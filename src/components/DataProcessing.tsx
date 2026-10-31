import React, { useState, useMemo } from 'react';
import { useNavigationReset } from '../lib/useNavigationReset';
import { 
  Image as ImageIcon, 
  Plus, 
  Upload, 
  Search, 
  Trash2, 
  Eye, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Settings2, 
  Clock, 
  Hash, 
  Type,
  FileText,
  MoreVertical,
  Maximize2,
  RefreshCw,
  Check,
  AlertCircle,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { planImageNames, readImageDimensions, validateNamingRule, type NamingRule, type NamingResult } from '../lib/dataProcessing';
import { createZip, downloadBlob } from '../lib/zip';
import { loadStoredImages, saveStoredImages } from '../lib/dataProcessingStorage';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DataProcessingProps {
  activeSubTab: string;
}

type ViewState = 'list' | 'naming' | 'preview' | 'result';

interface ImageData {
  id: string;
  name: string;
  size: string;
  resolution: string;
  uploadTime: string;
  url: string;
  selected?: boolean;
  file: File;
}

export default function DataProcessing({ activeSubTab }: DataProcessingProps) {
  const [view, setView] = useState<ViewState>('list');
  useNavigationReset(() => setView(activeSubTab === 'batch-rename' ? 'naming' : 'list'));
  const [images, setImages] = useState<ImageData[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(true);
  const [storageError, setStorageError] = useState('');
  const [archive, setArchive] = useState<Blob | null>(null);
  const [stamp] = useState(() => new Date().toLocaleDateString('sv-SE').replace(/-/g, ''));
  const locked = React.useRef(true);
  const lifetime = React.useRef(new AbortController());
  const urls = React.useRef(new Set<string>());
  React.useEffect(() => () => { urls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  React.useEffect(() => {
    lifetime.current = new AbortController();
    const controller = lifetime.current;
    let cancelled = false;
    loadStoredImages().then(records => {
      if (cancelled) return;
      setImages(records.map(record => {
        const url = URL.createObjectURL(record.file); urls.current.add(url);
        return { ...record, url };
      }));
    }).catch(error => { if (!cancelled) setStorageError(error instanceof Error ? error.message : '读取本地图片失败'); })
      .finally(() => { if (!cancelled) { locked.current = false; setBusy(false); } });
    return () => { cancelled = true; controller.abort(); };
  }, []);
  const [previewImage, setPreviewImage] = useState<ImageData | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [namingRule, setNamingRule] = useState<NamingRule>({
    prefix: 'task1_',
    suffix: '',
    startNumber: 1,
    digits: 3,
    useTimestamp: false,
    useOriginalName: false,
    duplicateHandling: 'rename',
  });
  const [results, setResults] = useState<NamingResult[]>([]);

  // Reset view when subtab changes
  React.useEffect(() => {
    if (activeSubTab === 'img-proc') setView('list');
    if (activeSubTab === 'batch-rename') setView('naming');
  }, [activeSubTab]);

  const exampleName = useMemo(() => {
    try { return planImageNames([{ id: 'example', name: 'example.jpg' }], [], namingRule, stamp)[0].newName; }
    catch (error) { return error instanceof Error ? error.message : '命名规则无效'; }
  }, [namingRule, stamp]);

  const selectedImages = useMemo(() => {
    return images.filter(img => selectedIds.includes(img.id));
  }, [images, selectedIds]);

  const namingPlan = useMemo(() => {
    try { return { results: planImageNames(selectedImages, images, namingRule, stamp), error: null }; }
    catch (error) { return { results: [], error: error instanceof Error ? error.message : '命名失败' }; }
  }, [selectedImages, namingRule, images, stamp]);
  const previewResults = namingPlan.results;
  const visibleImages = images.filter(image => image.name.toLowerCase().includes(search.toLowerCase()));

  const importImages = (multiple: boolean) => {
    if (locked.current || lifetime.current.signal.aborted) return;
    if (storageError) { alert(storageError); return; }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.multiple = multiple;
    input.onchange = async () => {
      if (!input.files?.length || locked.current || lifetime.current.signal.aborted) return;
      const signal = lifetime.current.signal;
      locked.current = true;
      setBusy(true);
      const imported: ImageData[] = [];
      const errors: string[] = [];
      for (const file of Array.from(input.files)) {
        if (signal.aborted) break;
        const url = URL.createObjectURL(file);
        try {
          if (!file.type.startsWith('image/')) throw new Error('请选择图片文件');
          const { width, height } = await readImageDimensions(url);
          if (signal.aborted) { URL.revokeObjectURL(url); break; }
          urls.current.add(url);
          const id = globalThis.crypto?.randomUUID?.() || `image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          imported.push({ id, file, name: file.name, size: `${(file.size / 1024 / 1024).toFixed(2)} MB`, resolution: `${width}x${height}`, uploadTime: new Date().toLocaleString('zh-CN'), url });
        } catch { URL.revokeObjectURL(url); errors.push(file.name); }
      }
      try {
        const next = [...imported, ...images];
        await saveStoredImages(next, signal);
        if (!signal.aborted) setImages(next);
      } catch (error) {
        imported.forEach(image => { URL.revokeObjectURL(image.url); urls.current.delete(image.url); });
        if (!signal.aborted) alert(`图片未保存：${error instanceof Error ? error.message : '本地存储失败'}`);
      } finally { if (!signal.aborted) { locked.current = false; setBusy(false); } }
      if (!signal.aborted && errors.length) alert(`以下文件无法解码：${errors.join('、')}`);
    };
    input.click();
  };

  const executeNaming = async () => {
    if (locked.current || lifetime.current.signal.aborted) return;
    const signal = lifetime.current.signal;
    if (namingPlan.error || !selectedImages.length) { alert(namingPlan.error || '请先选择图片'); return; }
    const successes = previewResults.filter(result => result.status === 'success');
    if (!successes.length) { alert('全部文件被跳过，请调整命名规则'); return; }
    locked.current = true; setBusy(true);
    try {
      const entries = await Promise.all(successes.map(async result => {
        const image = selectedImages.find(image => image.id === result.id)!;
        return { name: result.newName, data: new Uint8Array(await image.file.arrayBuffer()) };
      }));
      if (signal.aborted) return;
      const zip = createZip(entries);
      const byId = new Map(successes.map(result => [result.id, result]));
      const outputNames = new Set(successes.map(result => result.newName.toLowerCase()));
      const next = images.filter(image => byId.has(image.id) || !outputNames.has(image.name.toLowerCase())).map(image => byId.has(image.id) ? { ...image, name: byId.get(image.id)!.newName } : image);
      await saveStoredImages(next, signal);
      if (signal.aborted) return;
      setImages(next);
      setResults(previewResults); setArchive(zip); setSelectedIds([]); setView('result');
    } catch (error) { if (!signal.aborted) alert(`命名未完成：${error instanceof Error ? error.message : '无法读取文件或生成 ZIP'}`); }
    finally { if (!signal.aborted) { locked.current = false; setBusy(false); } }
  };

  // --- Sub-page Renders ---

  const renderImageProcessing = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">图片处理</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">管理与预览待处理的图片资源；图片保存在本浏览器，重要文件请及时导出备份{storageError ? `；${storageError}` : ''}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => importImages(false)}
            disabled={busy}
            className="flex items-center px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-primary)] transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> 导入图片
          </button>
          <button 
            onClick={() => importImages(true)}
            disabled={busy}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Upload className="w-4 h-4 mr-2" /> 批量导入
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input 
            type="text" 
            placeholder="搜索图片名称..." 
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
          />
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setView('naming')}
            disabled={busy}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all flex items-center"
          >
            批量命名 <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Image Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">图片预览</th>
              <th className="px-6 py-4 font-semibold">图片名称</th>
              <th className="px-6 py-4 font-semibold">文件大小</th>
              <th className="px-6 py-4 font-semibold">分辨率</th>
              <th className="px-6 py-4 font-semibold">上传时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {visibleImages.map((img) => (
              <tr key={img.id} className="hover:bg-[var(--bg-primary)] transition-colors group">
                <td className="px-6 py-3">
                  <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer" onClick={() => setPreviewImage(img)}>
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{img.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{img.size}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{img.resolution}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{img.uploadTime}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => setPreviewImage(img)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded" title="预览">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button disabled={busy} onClick={async () => {
                      if (locked.current || lifetime.current.signal.aborted) return;
                      if (!confirm(`删除本地图片“${img.name}”？`)) return;
                      const signal = lifetime.current.signal;
                      locked.current = true; setBusy(true);
                      try {
                        const next = images.filter(image => image.id !== img.id);
                        await saveStoredImages(next, signal);
                        if (signal.aborted) return;
                        setImages(next);
                        setSelectedIds(previous => previous.filter(id => id !== img.id));
                        URL.revokeObjectURL(img.url); urls.current.delete(img.url);
                      } catch (error) { if (!signal.aborted) alert(`删除未完成：${error instanceof Error ? error.message : '本地存储失败'}`); }
                      finally { if (!signal.aborted) { locked.current = false; setBusy(false); } }
                    }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-4 bg-[var(--bg-primary)] border-t border-[var(--border-color)] flex items-center justify-between">
          <p className="text-xs text-[var(--text-secondary)]">共 {images.length} 张图片{!images.length ? '，请先导入本地图片' : ''}{busy ? '（正在处理…）' : ''}</p>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 border border-[var(--border-color)] rounded text-xs hover:bg-[var(--bg-secondary)] disabled:opacity-50" disabled>上一页</button>
            <button className="px-3 py-1 border border-[var(--border-color)] rounded text-xs bg-blue-600 text-white">1</button>
            <button disabled className="px-3 py-1 border border-[var(--border-color)] rounded text-xs hover:bg-[var(--bg-secondary)]">下一页</button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full bg-[var(--bg-secondary)] rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <h3 className="font-bold text-[var(--text-primary)]">{previewImage.name}</h3>
                <button onClick={() => setPreviewImage(null)} className="p-2 hover:bg-[var(--bg-primary)] rounded-full text-[var(--text-secondary)]">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 flex items-center justify-center bg-slate-900 min-h-[400px]">
                <img src={previewImage.url} alt={previewImage.name} className="max-w-full max-h-[70vh] object-contain shadow-lg" referrerPolicy="no-referrer" />
              </div>
              <div className="p-4 bg-[var(--bg-primary)] grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">分辨率</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{previewImage.resolution}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">文件大小</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{previewImage.size}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">上传时间</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{previewImage.uploadTime}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderBatchNaming = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <button disabled={busy} onClick={() => setView('list')} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">批量命名</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Image Selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase">选择图片</h3>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setSelectedIds(images.map(i => i.id))}
                  className="text-xs font-bold text-blue-500 hover:underline"
                >
                  全选
                </button>
                <button 
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-bold text-slate-500 hover:underline"
                >
                  取消全选
                </button>
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-left">
                <tbody className="divide-y divide-[var(--border-color)]">
                  {images.map((img) => (
                    <tr 
                      key={img.id} 
                      className={cn(
                        "hover:bg-[var(--bg-primary)] transition-colors cursor-pointer",
                        selectedIds.includes(img.id) && "bg-blue-50/50 dark:bg-blue-900/10"
                      )}
                      onClick={() => {
                        setSelectedIds(prev => 
                          prev.includes(img.id) ? prev.filter(id => id !== img.id) : [...prev, img.id]
                        );
                      }}
                    >
                      <td className="px-6 py-3 w-10">
                        <div className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center transition-all",
                          selectedIds.includes(img.id) ? "bg-blue-600 border-blue-600" : "border-[var(--border-color)] bg-white dark:bg-slate-800"
                        )}>
                          {selectedIds.includes(img.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{img.name}</td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{img.resolution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-[var(--bg-primary)] border-t border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-secondary)]">已选择 <span className="font-bold text-blue-600">{selectedIds.length}</span> 张图片；保存在本浏览器，请及时导出备份{storageError ? `；${storageError}` : ''}</p>
            </div>
          </div>
        </div>

        {/* Right: Rule Configuration */}
        <div className="space-y-6">
          <div className="card p-6 space-y-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase flex items-center">
              <Settings2 className="w-4 h-4 mr-2 text-blue-500" /> 命名规则配置
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">前缀</label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                  <input 
                    type="text" 
                    value={namingRule.prefix}
                    onChange={e => setNamingRule(prev => ({ ...prev, prefix: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                    placeholder="例如: task1_"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">后缀</label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                  <input 
                    type="text" 
                    value={namingRule.suffix}
                    onChange={e => setNamingRule(prev => ({ ...prev, suffix: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                    placeholder="例如: _final"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">起始序号</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                    <input 
                      type="number" 
                      value={namingRule.startNumber}
                      onChange={e => setNamingRule(prev => ({ ...prev, startNumber: parseInt(e.target.value) || 0 }))}
                      className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">序号位数</label>
                  <select 
                    value={namingRule.digits}
                    onChange={e => setNamingRule(prev => ({ ...prev, digits: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={1}>1位 (1)</option>
                    <option value={2}>2位 (01)</option>
                    <option value={3}>3位 (001)</option>
                    <option value={4}>4位 (0001)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div 
                    onClick={() => setNamingRule(prev => ({ ...prev, useTimestamp: !prev.useTimestamp }))}
                    className={cn(
                      "w-5 h-5 rounded border flex items-center justify-center transition-all",
                      namingRule.useTimestamp ? "bg-blue-600 border-blue-600" : "border-[var(--border-color)] bg-white dark:bg-slate-800"
                    )}
                  >
                    {namingRule.useTimestamp && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />
                    <span className="text-sm text-[var(--text-primary)]">包含时间戳</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div 
                    onClick={() => setNamingRule(prev => ({ ...prev, useOriginalName: !prev.useOriginalName }))}
                    className={cn(
                      "w-5 h-5 rounded border flex items-center justify-center transition-all",
                      namingRule.useOriginalName ? "bg-blue-600 border-blue-600" : "border-[var(--border-color)] bg-white dark:bg-slate-800"
                    )}
                  >
                    {namingRule.useOriginalName && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />
                    <span className="text-sm text-[var(--text-primary)]">包含原文件名</span>
                  </div>
                </label>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center">
                  <Copy className="w-3 h-3 mr-1" /> 重复文件处理
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['skip', 'overwrite', 'rename'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setNamingRule(prev => ({ ...prev, duplicateHandling: mode }))}
                      className={cn(
                        "px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all",
                        namingRule.duplicateHandling === mode 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : "bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-blue-500/50"
                      )}
                    >
                      {mode === 'skip' ? '跳过' : mode === 'overwrite' ? '覆盖' : '重命名'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] leading-tight">
                  {namingRule.duplicateHandling === 'skip' && "检测到重名时，将不处理该文件。"}
                  {namingRule.duplicateHandling === 'overwrite' && "检测到重名时，将替换本次列表中的目标文件，不修改磁盘原文件。"}
                  {namingRule.duplicateHandling === 'rename' && "检测到重名时，将自动在文件名后添加数字序号。"}
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">命名示例</p>
              <p className="text-sm font-mono font-bold text-blue-700 dark:text-blue-400 break-all">
                {exampleName}
              </p>
            </div>

            <button 
              onClick={() => { if (namingPlan.error) alert(namingPlan.error); else setView('preview'); }}
              disabled={selectedIds.length === 0 || busy || !!validateNamingRule(namingRule)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:shadow-none"
            >
              预览命名结果
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNamingPreview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button disabled={busy} onClick={() => setView('naming')} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">命名预览</h2>
        </div>
        <button 
          onClick={executeNaming}
          disabled={busy}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
        >
          {busy ? '正在处理…' : '执行命名'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <p className="text-sm text-[var(--text-secondary)]">
            即将对 <span className="font-bold text-blue-600">{selectedIds.length}</span> 张图片进行重命名操作，请核对：
          </p>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider sticky top-0 z-10">
                <th className="px-6 py-4 font-semibold">原文件名</th>
                <th className="px-6 py-4 font-semibold w-10"></th>
                <th className="px-6 py-4 font-semibold">新文件名</th>
                <th className="px-6 py-4 font-semibold text-right">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {previewResults.map((res, i) => (
                <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{res.originalName}</td>
                  <td className="px-6 py-4 text-center">
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-600 font-mono font-bold">{res.newName}</td>
                  <td className="px-6 py-4 text-right">
                    {res.status === 'success' ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 font-bold uppercase">Ready</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-900/20 font-bold uppercase">Skipped</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderExecutionResult = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">执行结果</h2>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setView('list')}
            className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-secondary)]"
          >
            返回列表
          </button>
          <button onClick={() => { if (archive) downloadBlob(archive, '批量命名结果.zip'); }} disabled={!archive} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center">
            <Download className="w-4 h-4 mr-2" /> 导出结果
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div className="card p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">批量命名已完成，点击导出结果下载图片</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            共处理 {results.length} 个文件，成功 {results.filter(r => r.status === 'success' && r.newName !== '(已跳过)').length} 个，跳过 {results.filter(r => r.newName === '(已跳过)').length} 个，失败 0 个
          </p>
        </div>
      </div>

      {/* Result List */}
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">原文件名</th>
              <th className="px-6 py-4 font-semibold">新文件名</th>
              <th className="px-6 py-4 text-right">执行状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {results.map((res, i) => (
              <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{res.originalName}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-primary)] font-mono font-medium">{res.newName}</td>
                <td className="px-6 py-4 text-right">
                  {res.newName === '(已跳过)' ? (
                    <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 font-bold uppercase">
                      <AlertCircle className="w-3 h-3 mr-1" /> Skipped
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 font-bold uppercase">
                      <Check className="w-3 h-3 mr-1" /> Success
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case 'naming': return renderBatchNaming();
      case 'preview': return renderNamingPreview();
      case 'result': return renderExecutionResult();
      case 'list':
      default: return renderImageProcessing();
    }
  };

  return (
    <div className="h-full">
      <AnimatePresence mode="wait">
        <motion.div
          inert={busy}
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
