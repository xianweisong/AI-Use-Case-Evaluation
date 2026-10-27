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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['evaluation']);

  useEffect(() => {
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
          <button 
            onClick={toggleSidebar}
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
                className="pl-10 pr-4 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
              />
            </div>

            {/* Theme Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-[var(--bg-primary)] transition-colors text-[var(--text-secondary)]"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <button className="p-2 rounded-lg hover:bg-[var(--bg-primary)] transition-colors text-[var(--text-secondary)] relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--bg-secondary)]" />
            </button>

            <button className="p-2 rounded-lg hover:bg-[var(--bg-primary)] transition-colors text-[var(--text-secondary)]">
              <HelpCircle className="w-5 h-5" />
            </button>

            <div className="h-8 w-px bg-[var(--border-color)]" />

            {/* User Profile */}
            <div className="flex items-center space-x-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-[var(--text-primary)] leading-none">管理员</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">超级管理员</p>
              </div>
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 border border-blue-200 dark:border-blue-800">
                <User className="w-5 h-5" />
              </div>
              <button className="p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)]">
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
    </div>
  );
}
