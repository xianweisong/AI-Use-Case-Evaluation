import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Tags, 
  Zap, 
  Activity, 
  Database, 
  ShieldCheck, 
  Settings,
  Image as ImageIcon,
  Video,
  FileJson,
  Cpu,
  Layers,
  Search,
  Users,
  Lock,
  History,
  Sliders
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  subItems?: SubNavItem[];
}

export interface SubNavItem {
  id: string;
  label: string;
  href?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'workbench', label: '工作台', icon: LayoutDashboard },
  { 
    id: 'evaluation', 
    label: '评测管理', 
    icon: ClipboardCheck,
    subItems: [
      { id: 'task-mgmt', label: '测试任务管理' },
      { id: 'reports', label: '测试报告' },
      { id: 'ui-test', label: 'UI测试' },
      { id: 'api-test', label: '接口测试' },
      { id: 'perf-test', label: '性能测试' },
    ]
  },
  { 
    id: 'annotation', 
    label: '数据标注', 
    icon: Tags,
    subItems: [
      { id: 'img-anno', label: '图片标注' },
      { id: 'video-anno', label: '视频标注' },
      { id: 'dataset-mgmt', label: '数据集管理' },
    ]
  },
  { 
    id: 'interface', 
    label: '接口评测', 
    icon: Zap,
    subItems: [
      { id: 'api-compat', label: 'API测试' },
      { id: 'multi-ver', label: '多版本测试' },
      { id: 'multi-proto', label: '多协议测试' },
    ]
  },
  { 
    id: 'resource', 
    label: '资源评测', 
    icon: Activity,
    subItems: [
      { id: 'res-monitor', label: '资源监控' },
      { id: 'perf-stats', label: '性能统计' },
      { id: 'history-log', label: '历史记录' },
    ]
  },
  { 
    id: 'data-proc', 
    label: '数据处理', 
    icon: Database,
    subItems: [
      { id: 'img-proc', label: '图片处理' },
      { id: 'batch-rename', label: '批量命名' },
    ]
  },
  { 
    id: 'verification', 
    label: '结果校验', 
    icon: ShieldCheck,
    subItems: [
      { id: 'res-list', label: '测试结果' },
      { id: 'res-comp', label: '结果对比' },
      { id: 'diff-analysis', label: '差异分析' },
    ]
  },
  { 
    id: 'system', 
    label: '系统管理', 
    icon: Settings,
    subItems: [
      { id: 'user-mgmt', label: '用户管理' },
      { id: 'perm-mgmt', label: '权限管理' },
      { id: 'v-mgmt', label: '虚拟化管理', href: 'https://10.13.27.121:40299' },
      { id: 'cloud-desktop', label: '云桌面管理', href: 'http://10.13.27.26:8083' },
      { id: 'terminal', label: '终端安全管理', href: 'https://10.13.84.16:443' },
    ]
  },
];
