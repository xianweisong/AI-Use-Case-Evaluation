import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  HelpCircle, 
  LogOut, 
  User, 
  Menu, 
  X, 
  ChevronRight, 
  ChevronDown,
  Sun,
  Moon,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NAV_ITEMS, NavItem } from '../constants';
import { readLocalArray } from '../lib/localEvaluation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (id: string) => void;
  activeSubTab: string;
  setActiveSubTab: (id: string) => void;
}

export default function Layout({ 
  children, 
  activeTab, 
  setActiveTab,
  activeSubTab,
  setActiveSubTab
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => { try { return localStorage.getItem('platform-theme') === 'dark'; } catch { return false; } });
  const [expandedItems, setExpandedItems] = useState<string[]>(['evaluation']);
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<'search' | 'help' | 'notifications' | null>(null);

  useEffect(() => {
    try { localStorage.setItem('platform-theme', isDarkMode ? 'dark' : 'light'); } catch { /* Theme still works for the current view. */ }
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const activeNavItem = NAV_ITEMS.find(item => item.id === activeTab);
  const searchTasks = readLocalArray<any>('platform-tasks-v1', []).filter(t => String(t.name).includes(search.trim()) || String(t.id).includes(search.trim()));
  const searchMenus = NAV_ITEMS.flatMap(item => item.subItems ? item.subItems.map(sub => ({ ...sub, tab: item.id })) : [{ ...item, tab: item.id }]).filter(item => item.label.includes(search.trim()));
  const failedReports = readLocalArray<any>('platform-reports-v1', []).filter(r => r.run && r.result === '失败');

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="sidebar flex flex-col shrink-0 transition-all duration-300 z-50"
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <img
            src="/h3c-logo.png"
            alt="H3C"
            width={1452}
            height={366}
            className={cn('h-auto shrink-0', isSidebarOpen ? 'w-12' : 'w-8')}
          />
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="ml-3 font-bold text-white truncate text-sm"
              >
                公安场景人工智能平台
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isExpanded = expandedItems.includes(item.id);
            const isActive = activeTab === item.id;
            
            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.subItems) toggleExpand(item.id);
                  }}
                  className={cn(
                    "w-full flex items-center px-3 py-2.5 rounded-lg transition-colors group",
                    isActive ? "sidebar-item-active" : "hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 shrink-0",
                    isActive ? "text-blue-400" : "text-slate-400 group-hover:text-white"
                  )} />
                  {isSidebarOpen && (
                    <div className="ml-3 flex-1 flex items-center justify-between overflow-hidden">
                      <span className="text-sm font-medium truncate">{item.label}</span>
                      {item.subItems && (
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4 opacity-50" />
                        </motion.div>
                      )}
                    </div>
                  )}
                </button>

                {/* Sub-items */}
                <AnimatePresence>
                  {isSidebarOpen && isExpanded && item.subItems && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pl-9 space-y-1"
                    >
                      {item.subItems.map((sub) => sub.href ? (
                        <a
                          key={sub.id}
                          href={sub.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-left px-3 py-2 rounded-md text-xs transition-colors text-slate-500 hover:text-white"
                        >
                          {sub.label}
                        </a>
                      ) : (
                        <button
                          key={sub.id}
                          onClick={() => {
                            window.dispatchEvent(new Event('platform-reset-view'));
                            setActiveTab(item.id);
                            setActiveSubTab(sub.id);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-md text-xs transition-colors",
                            activeSubTab === sub.id && activeTab === item.id
                              ? "text-white bg-white/5"
                              : "text-slate-500 hover:text-white"
                          )}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5">
          {isSidebarOpen && (
            <div className="mb-2 text-center text-xs text-slate-400 whitespace-nowrap">
              版本 E2026.114
            </div>
          )}
          <button 
            onClick={toggleSidebar}
            title={isSidebarOpen ? '收起侧栏' : '展开侧栏 · 版本 E2026.114'}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)]">
        {/* Topbar */}
        <header className="h-16 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-6 shrink-0 z-40">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-[var(--text-primary)] hidden md:block">
              公安场景人工智能平台
            </h1>
            <div className="h-6 w-px bg-[var(--border-color)] hidden md:block" />
            <div className="flex items-center text-sm text-[var(--text-secondary)]">
              <span>{activeNavItem?.label}</span>
              {activeSubTab && (
                <>
                  <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
                  <span className="text-[var(--text-primary)] font-medium">
                    {activeNavItem?.subItems?.find(s => s.id === activeSubTab)?.label}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input 
                type="text" 
                placeholder="搜索任务、数据..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && search.trim()) setPanel('search'); }}
                className="pl-10 pr-4 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
              />
            </div>

            {/* Theme Toggle */}
            <button 
              onClick={toggleDarkMode}
              aria-label="切换主题"
              className="p-2 rounded-lg hover:bg-[var(--bg-primary)] transition-colors text-[var(--text-secondary)]"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <button onClick={() => setPanel('notifications')} aria-label="通知" className="p-2 rounded-lg hover:bg-[var(--bg-primary)] transition-colors text-[var(--text-secondary)] relative">
              <Bell className="w-5 h-5" />
              {failedReports.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--bg-secondary)]" />}
            </button>

            <button onClick={() => setPanel('help')} aria-label="帮助" className="p-2 rounded-lg hover:bg-[var(--bg-primary)] transition-colors text-[var(--text-secondary)]">
              <HelpCircle className="w-5 h-5" />
            </button>

            <div className="h-8 w-px bg-[var(--border-color)]" />

            {/* User Profile */}
            <div className="flex items-center space-x-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-[var(--text-primary)] leading-none">管理员</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">浏览器本地模式</p>
              </div>
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 border border-blue-200 dark:border-blue-800">
                <User className="w-5 h-5" />
              </div>
              <button onClick={() => alert('当前为浏览器本地模式，未接入登录认证，没有服务器会话可退出。关闭页面不会删除已保存的本地数据。')} aria-label="退出" className="p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${activeSubTab}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {panel && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
        <div className="bg-[var(--bg-secondary)] w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--border-color)] p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold">{panel === 'search' ? '搜索结果' : panel === 'help' ? '使用帮助' : '本地通知'}</h2><button aria-label="关闭" onClick={() => setPanel(null)}><X className="w-5 h-5" /></button></div>
          {panel === 'help' && <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <p>当前为纯前端平台。任务配置、标注和用户角色在当前浏览器保存，不跨设备共享；请及时导出重要数据。</p>
            <p>评测任务执行隔离的接口响应、HTML 和 JSON 解析样例，不访问测试对象地址。可在任务 JSON 配置中指定 sampleResponse、expectedStatus、html、selector 或 iterations。</p>
            <p>图片处理支持批量命名与 ZIP 下载；矩形标注可导出 VOC、YOLO 或 COCO。报表支持 HTML、Word 可读格式及浏览器打印 PDF。</p>
            <p>服务器资源、真实接口、跨浏览器自动化和身份认证需后续接入；资源图表为明确标注的样例。顶部搜索支持任务和菜单名称，输入后按回车。</p>
          </div>}
          {panel === 'notifications' && <div className="space-y-3 text-sm">{failedReports.length ? failedReports.map(r => <p key={r.id}>{r.name}：本地样例存在失败项，请到测试报告查看。</p>) : <p>暂无本地评测失败通知。</p>}</div>}
          {panel === 'search' && <div className="space-y-2 text-sm">
            {searchMenus.map(item => 'href' in item && item.href ? <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg hover:bg-[var(--bg-primary)]">菜单 · {item.label}</a> : <button key={item.id} className="block w-full text-left p-3 rounded-lg hover:bg-[var(--bg-primary)]" onClick={() => { setActiveTab(item.tab); setActiveSubTab(item.id === item.tab ? '' : item.id); setExpandedItems(prev => [...new Set([...prev, item.tab])]); setPanel(null); }}>菜单 · {item.label}</button>)}
            {searchTasks.map(task => <button key={task.id} className="block w-full text-left p-3 rounded-lg hover:bg-[var(--bg-primary)]" onClick={() => { sessionStorage.setItem('platform-selected-task', task.id); setActiveTab('evaluation'); setActiveSubTab('task-mgmt'); window.dispatchEvent(new Event('platform-open-task')); setPanel(null); }}>任务 · {task.name}</button>)}
            {!searchMenus.length && !searchTasks.length && <p>未找到匹配的任务或菜单。</p>}
          </div>}
        </div>
      </div>}
    </div>
  );
}
