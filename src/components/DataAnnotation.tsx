import React, { useState, useRef, useEffect } from 'react';
import { 
  BarChart3,
  Search, 
  Filter, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Info,
  MousePointer2,
  Square,
  Undo2,
  Redo2,
  Save,
  FileOutput,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Layers,
  Image as ImageIcon,
  Video as VideoIcon,
  Database,
  ArrowLeft,
  X,
  Maximize2,
  Minimize2,
  Settings2,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const DB_NAME = 'DataAnnotationDB';
const STORE_NAME = 'files';

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

const getIndexedDBFile = async (key: string): Promise<any> => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.error('IndexedDB get error:', err);
    return null;
  }
};

const saveIndexedDBFile = async (key: string, value: any): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB save error:', err);
  }
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DataAnnotationProps {
  activeSubTab: string;
}

type AnnotationView = 'list' | 'imageEditor' | 'videoEditor' | 'videoDetail' | 'datasetMgmt';

interface Rect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
}

interface Dataset {
  id: string;
  name: string;
  type: 'image' | 'video';
  taskIds: string[];
  createdAt: string;
  dataCount: number;
}

interface ExportRecord {
  id: string;
  datasetName: string;
  format: string;
  status: 'completed' | 'processing' | 'failed';
  time: string;
  downloadUrl?: string;
}

export default function DataAnnotation({ activeSubTab }: DataAnnotationProps) {
  const [view, setView] = useState<AnnotationView>('list');
  
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [alertState, setAlertState] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: ''
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      open: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, open: false }));
      }
    });
  };

  const showAlert = (title: string, message: string) => {
    setAlertState({
      open: true,
      title,
      message
    });
  };

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [extractModalOpen, setExtractModalOpen] = useState(false);
  
  // Filter States
  const [imgSearch, setImgSearch] = useState('');
  const [imgStatusFilter, setImgStatusFilter] = useState('所有状态');
  
  const [vidSearch, setVidSearch] = useState('');
  const [vidStatusFilter, setVidStatusFilter] = useState('所有状态');

  // Persistence Helpers
  const STORAGE_KEYS = {
    IMAGE_TASKS: 'as-eval-image-tasks',
    VIDEO_TASKS: 'as-eval-video-tasks',
    DATASETS: 'as-eval-datasets',
    EXPORT_HISTORY: 'as-eval-export-history',
    IMAGE_FILES: 'as-eval-image-files',
    VIDEO_FILES: 'as-eval-video-files',
    ANNOTATIONS: 'as-eval-annotations',
    LABELS: 'as-eval-labels'
  };

  const getSavedData = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      console.error(`Error loading ${key} from localStorage`, e);
      return defaultValue;
    }
  };

  // State Definitions with Persistence
  const [imageTasks, setImageTasks] = useState(() => getSavedData(STORAGE_KEYS.IMAGE_TASKS, [
    { id: 'IMG-TASK-001', name: '人脸识别评测集', total: 5, completed: 3, status: 'annotating', time: '2026-03-01 10:00' },
    { id: 'IMG-TASK-002', name: '车辆特征库', total: 3, completed: 3, status: 'completed', time: '2026-03-01 10:05' },
    { id: 'IMG-TASK-003', name: '行人属性标注', total: 3, completed: 0, status: 'pending', time: '2026-03-01 10:10' },
  ]));

  const [videoTasks, setVideoTasks] = useState(() => getSavedData(STORAGE_KEYS.VIDEO_TASKS, [
    { id: 'VID-TASK-001', name: '交通违法行为识别', total: 3, completed: 1, status: 'annotating', extractStatus: 'partial', time: '2026-03-01 09:00' },
    { id: 'VID-TASK-002', name: '安防监控异常检测', total: 2, completed: 2, status: 'completed', extractStatus: 'completed', time: '2026-03-01 11:15' },
  ]));

  const [datasets, setDatasets] = useState<Dataset[]>(() => getSavedData(STORAGE_KEYS.DATASETS, [
    { id: 'DS-001', name: '标准人脸库-V1', type: 'image', taskIds: ['IMG-TASK-001'], createdAt: '2026-02-15', dataCount: 5 },
    { id: 'DS-002', name: '城市交通监控-夜间', type: 'video', taskIds: ['VID-TASK-001'], createdAt: '2026-02-20', dataCount: 3 },
    { id: 'DS-003', name: '违停车辆抓拍集', type: 'image', taskIds: ['IMG-TASK-002'], createdAt: '2026-03-01', dataCount: 3 },
    { id: 'DS-004', name: '安防监控异常检测集', type: 'video', taskIds: ['VID-TASK-002'], createdAt: '2026-03-02', dataCount: 2 },
  ]));

  const [exportHistory, setExportHistory] = useState<ExportRecord[]>(() => getSavedData(STORAGE_KEYS.EXPORT_HISTORY, [
    { id: 'EXP-001', datasetName: '标准人脸库-V1', format: 'COCO', status: 'completed', time: '2026-03-03 10:00', downloadUrl: '#' },
    { id: 'EXP-002', datasetName: '违停车辆抓拍集', format: 'YOLO', status: 'processing', time: '2026-03-03 11:30' },
  ]));

  const [imageFiles, setImageFiles] = useState(() => {
    const raw = getSavedData(STORAGE_KEYS.IMAGE_FILES, []);
    if (raw.length === 0 || raw.some((f: any) => !f.taskId)) {
      return [
        { id: 101, taskId: 'IMG-TASK-001', name: 'face_detection_001.jpg', status: 'completed' },
        { id: 102, taskId: 'IMG-TASK-001', name: 'face_detection_002.jpg', status: 'completed' },
        { id: 103, taskId: 'IMG-TASK-001', name: 'face_detection_003.jpg', status: 'completed' },
        { id: 104, taskId: 'IMG-TASK-001', name: 'passenger_face_004.jpg', status: 'pending' },
        { id: 105, taskId: 'IMG-TASK-001', name: 'driver_face_005.jpg', status: 'pending' },
        
        { id: 201, taskId: 'IMG-TASK-002', name: 'sedan_red_001.jpg', status: 'completed' },
        { id: 202, taskId: 'IMG-TASK-002', name: 'suv_black_002.jpg', status: 'completed' },
        { id: 203, taskId: 'IMG-TASK-002', name: 'truck_white_003.jpg', status: 'completed' },
        
        { id: 301, taskId: 'IMG-TASK-003', name: 'pedestrian_street_001.jpg', status: 'pending' },
        { id: 302, taskId: 'IMG-TASK-003', name: 'pedestrian_crossing_002.jpg', status: 'pending' },
        { id: 303, taskId: 'IMG-TASK-003', name: 'pedestrian_mall_003.jpg', status: 'pending' },
      ];
    }
    return raw;
  });

  const [videoFiles, setVideoFiles] = useState(() => {
    const raw = getSavedData(STORAGE_KEYS.VIDEO_FILES, []);
    if (raw.length === 0) {
      return [
        { id: 1, taskId: 'VID-TASK-001', name: 'VIDEO_001.mp4', status: 'completed', extractStatus: 'ready', strategy: 'fps', fps: 5, totalFrames: 12 },
        { id: 2, taskId: 'VID-TASK-001', name: 'VIDEO_002.mp4', status: 'pending', extractStatus: 'pending', strategy: null, totalFrames: 0 },
        { id: 3, taskId: 'VID-TASK-001', name: 'VIDEO_003.mp4', status: 'pending', extractStatus: 'extracting', strategy: 'interval', interval: 10, totalFrames: 15 },
        { id: 4, taskId: 'VID-TASK-002', name: 'MONITOR_001.mp4', status: 'completed', extractStatus: 'ready', strategy: 'fps', fps: 10, totalFrames: 18 },
        { id: 5, taskId: 'VID-TASK-002', name: 'MONITOR_002.mp4', status: 'completed', extractStatus: 'ready', strategy: 'total', total: 10, totalFrames: 10 },
      ];
    }
    return raw;
  });

  const [annotations, setAnnotations] = useState<Record<string, Rect[]>>(() => {
    const defaultAnnotations = {
      'img_101': [
        { id: '101-1', x: 100, y: 150, width: 200, height: 150, label: '人脸', color: '#3b82f6' },
      ],
      'img_102': [
        { id: '102-1', x: 200, y: 100, width: 150, height: 180, label: '车辆', color: '#10b981' },
      ],
      'img_103': [
        { id: '103-1', x: 150, y: 220, width: 180, height: 120, label: '车牌', color: '#f59e0b' },
      ],
      'img_201': [
        { id: '201-1', x: 50, y: 80, width: 300, height: 250, label: '车辆', color: '#10b981' },
      ],
      'img_202': [
        { id: '202-1', x: 120, y: 150, width: 220, height: 170, label: '行人', color: '#ef4444' },
      ],
      'img_203': [
        { id: '203-1', x: 180, y: 200, width: 140, height: 110, label: '车牌', color: '#f59e0b' },
      ],
      'vid_1_0': [
        { id: 'vid1-1', x: 100, y: 120, width: 250, height: 180, label: '车辆', color: '#10b981' },
      ],
      'vid_4_0': [
        { id: 'vid4-1', x: 120, y: 140, width: 200, height: 150, label: '车辆', color: '#10b981' },
      ],
      'vid_5_0': [
        { id: 'vid5-1', x: 150, y: 110, width: 220, height: 160, label: '行人', color: '#ef4444' },
      ]
    };
    const saved = getSavedData<Record<string, Rect[]> | null>(STORAGE_KEYS.ANNOTATIONS, null);
    if (!saved || Object.keys(saved).length === 0) {
      return defaultAnnotations;
    }
    return saved;
  });

  const [labels, setLabels] = useState(() => getSavedData(STORAGE_KEYS.LABELS, [
    { name: '人脸', color: '#3b82f6' },
    { name: '车辆', color: '#10b981' },
    { name: '车牌', color: '#f59e0b' },
    { name: '行人', color: '#ef4444' },
  ]));

  // Auto-save Effects with try-catch to prevent QuotaExceededError crashes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.IMAGE_TASKS, JSON.stringify(imageTasks));
    } catch (e) {
      console.warn('Failed to save image tasks to localStorage', e);
    }
  }, [imageTasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VIDEO_TASKS, JSON.stringify(videoTasks));
    } catch (e) {
      console.warn('Failed to save video tasks to localStorage', e);
    }
  }, [videoTasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DATASETS, JSON.stringify(datasets));
    } catch (e) {
      console.warn('Failed to save datasets to localStorage', e);
    }
  }, [datasets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPORT_HISTORY, JSON.stringify(exportHistory));
    } catch (e) {
      console.warn('Failed to save export history to localStorage', e);
    }
  }, [exportHistory]);

  useEffect(() => {
    try {
      const sanitized = imageFiles.map((f: any) => {
        if (f.url && f.url.startsWith('data:')) {
          const { url, ...rest } = f;
          return rest;
        }
        return f;
      });
      localStorage.setItem(STORAGE_KEYS.IMAGE_FILES, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('Failed to save image files to localStorage (possibly due to base64 size limit)', e);
    }
  }, [imageFiles]);

  useEffect(() => {
    try {
      const sanitized = videoFiles.map((f: any) => {
        if (f.url && f.url.startsWith('data:')) {
          const { url, ...rest } = f;
          return rest;
        }
        return f;
      });
      localStorage.setItem(STORAGE_KEYS.VIDEO_FILES, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('Failed to save video files to localStorage', e);
    }
  }, [videoFiles]);

  // Load saved large URL files on mount from IndexedDB
  useEffect(() => {
    const loadSavedLargeFiles = async () => {
      try {
        setImageFiles(prev => {
          Promise.all(
            prev.map(async (f: any) => {
              if (!f.url) {
                const savedUrl = await getIndexedDBFile(`file_url_${f.id}`);
                if (savedUrl) {
                  return { ...f, url: savedUrl };
                }
              }
              return f;
            })
          ).then(loadedImageFiles => {
            const hasChanges = loadedImageFiles.some((f, i) => f.url !== prev[i]?.url);
            if (hasChanges) {
              setImageFiles(loadedImageFiles);
            }
          });
          return prev;
        });

        setVideoFiles(prev => {
          Promise.all(
            prev.map(async (f: any) => {
              if (!f.url) {
                const savedUrl = await getIndexedDBFile(`file_url_${f.id}`);
                if (savedUrl) {
                  return { ...f, url: savedUrl };
                }
              }
              return f;
            })
          ).then(loadedVideoFiles => {
            const hasChanges = loadedVideoFiles.some((f, i) => f.url !== prev[i]?.url);
            if (hasChanges) {
              setVideoFiles(loadedVideoFiles);
            }
          });
          return prev;
        });
      } catch (err) {
        console.error('Failed to restore large file URLs from IndexedDB', err);
      }
    };
    
    loadSavedLargeFiles();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ANNOTATIONS, JSON.stringify(annotations));
    } catch (e) {
      console.warn('Failed to save annotations to localStorage', e);
    }
  }, [annotations]);

  useEffect(() => {
    // Automatically sync image file status based on whether it has annotations
    setImageFiles(prevFiles => {
      let changed = false;
      const nextFiles = prevFiles.map(f => {
        const hasBoxes = annotations[`img_${f.id}`] && annotations[`img_${f.id}`].length > 0;
        const newStatus = hasBoxes ? 'completed' : 'pending';
        if (f.status !== newStatus) {
          changed = true;
          return { ...f, status: newStatus };
        }
        return f;
      });
      return changed ? nextFiles : prevFiles;
    });

    // Automatically sync video file status based on whether any of its frames have annotations
    setVideoFiles(prevFiles => {
      let changed = false;
      const nextFiles = prevFiles.map(f => {
        let hasAnyBox = false;
        const total = f.totalFrames || 0;
        if (total > 0) {
          for (let idx = 0; idx < total; idx++) {
            const key = `vid_${f.id}_${idx}`;
            if (annotations[key] && annotations[key].length > 0) {
              hasAnyBox = true;
              break;
            }
          }
        }
        const newStatus = hasAnyBox ? 'completed' : f.status;
        if (f.status !== newStatus) {
          changed = true;
          return { ...f, status: newStatus };
        }
        return f;
      });
      return changed ? nextFiles : prevFiles;
    });
  }, [annotations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LABELS, JSON.stringify(labels));
    } catch (e) {
      console.warn('Failed to save labels to localStorage', e);
    }
  }, [labels]);

  const [datasetModalConfig, setDatasetModalConfig] = useState<{ open: boolean; dataset?: Dataset }>({ open: false });
  const [exportDatasetModalConfig, setExportDatasetModalConfig] = useState<{ open: boolean; datasets: Dataset[] }>({ open: false, datasets: [] });

  const [importModalConfig, setImportModalConfig] = useState<{ open: boolean; type?: 'image' | 'video' }>({ open: false });
  const [statsModalConfig, setStatsModalConfig] = useState<{ open: boolean; task?: any }>({ open: false });

  const currentImageFiles = React.useMemo(() => {
    if (!selectedItem) return [];
    return imageFiles.filter((f: any) => f.taskId === selectedItem.id);
  }, [imageFiles, selectedItem]);

  const currentTaskFiles = React.useMemo(() => {
    if (!selectedItem) return [];
    return videoFiles.filter((f: any) => f.taskId === selectedItem.id);
  }, [videoFiles, selectedItem]);

  const imageEditorStats = React.useMemo(() => {
    const total = currentImageFiles.length;
    const completed = currentImageFiles.filter((f: any) => f.status === 'completed').length;
    const pending = total - completed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, progress };
  }, [currentImageFiles]);

  const videoEditorStats = React.useMemo(() => {
    const total = currentTaskFiles.length;
    const completed = currentTaskFiles.filter((f: any) => f.status === 'completed').length;
    const pending = total - completed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, progress };
  }, [currentTaskFiles]);

  const filteredImageTasks = React.useMemo(() => {
    return imageTasks.filter((task: any) => {
      const matchesSearch = task.name.toLowerCase().includes(imgSearch.toLowerCase()) || 
                           task.id.toLowerCase().includes(imgSearch.toLowerCase());
      const statusMap: Record<string, string> = {
        '未开始': 'pending',
        '标注中': 'annotating',
        '已完成': 'completed'
      };
      const matchesStatus = imgStatusFilter === '所有状态' || task.status === statusMap[imgStatusFilter];
      return matchesSearch && matchesStatus;
    });
  }, [imageTasks, imgSearch, imgStatusFilter]);

  const filteredVideoTasks = React.useMemo(() => {
    return videoTasks.filter((task: any) => {
      const matchesSearch = task.name.toLowerCase().includes(vidSearch.toLowerCase()) ||
                           task.id.toLowerCase().includes(vidSearch.toLowerCase());
      const statusMap: Record<string, string> = {
        '未开始': 'pending',
        '标注中': 'annotating',
        '已完成': 'completed'
      };
      const matchesStatus = vidStatusFilter === '所有状态' || task.status === statusMap[vidStatusFilter];
      return matchesSearch && matchesStatus;
    });
  }, [videoTasks, vidSearch, vidStatusFilter]);

  const allTasks = React.useMemo(() => {
    const imgTasks = imageTasks.map((t: any) => ({
      id: t.id,
      name: t.name,
      type: '图片',
      total: t.total,
      count: t.completed,
      progress: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
      time: t.time,
      isImage: true
    }));
    const vidTasks = videoTasks.map((t: any) => ({
      id: t.id,
      name: t.name,
      type: '视频',
      total: t.total,
      count: t.completed,
      progress: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
      time: t.time,
      isImage: false
    }));
    return [...imgTasks, ...vidTasks];
  }, [imageTasks, videoTasks]);
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  const activeImageFile = currentImageFiles[currentImageIndex];
  const currentKey = view === 'imageEditor' 
    ? (activeImageFile ? `img_${activeImageFile.id}` : '') 
    : `vid_${selectedVideo?.id}_${currentFrameIndex}`;
  const rects = annotations[currentKey] || [];

  const setRects = (newRects: Rect[] | ((prev: Rect[]) => Rect[])) => {
    setAnnotations(prev => {
      const current = prev[currentKey] || [];
      const next = typeof newRects === 'function' ? newRects(current) : newRects;
      return { ...prev, [currentKey]: next };
    });
  };

  const [selectedRectId, setSelectedRectId] = useState<string | null>(null);

  const handleDeleteImageTask = (taskId: string) => {
    showConfirm('删除确认', '确定要删除该图片标注任务及关联数据吗？', () => {
      setImageTasks((prev: any) => prev.filter((t: any) => t.id !== taskId));
      setImageFiles((prev: any) => prev.filter((f: any) => f.taskId !== taskId));
      setDatasets((prev: any) => prev.map((ds: any) => ({
        ...ds,
        taskIds: ds.taskIds.filter((id: string) => id !== taskId)
      })));
      showAlert('删除成功', '图片标注任务删除成功');
    });
  };

  const handleDeleteVideoTask = (taskId: string) => {
    showConfirm('删除确认', '确定要删除该视频标注任务及关联数据吗？', () => {
      setVideoTasks((prev: any) => prev.filter((t: any) => t.id !== taskId));
      setVideoFiles((prev: any) => prev.filter((f: any) => f.taskId !== taskId));
      setDatasets((prev: any) => prev.map((ds: any) => ({
        ...ds,
        taskIds: ds.taskIds.filter((id: string) => id !== taskId)
      })));
      showAlert('删除成功', '视频标注任务删除成功');
    });
  };
  const [tool, setTool] = useState<'select' | 'rect'>('select');
  const [zoom, setZoom] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
    setZoom(100);
    setSelectedRectId(null);
    if (!activeImageFile) return;
    const imgUrl = activeImageFile.url || `https://picsum.photos/seed/${activeImageFile.id}/800/600`;
    const img = new Image();
    img.src = imgUrl;
    img.onload = () => {
      const maxWidth = 800;
      const maxHeight = 600;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (!w || !h) {
        setImageSize({ width: 800, height: 600 });
        return;
      }
      const ratio = w / h;
      if (w > maxWidth) {
        w = maxWidth;
        h = w / ratio;
      }
      if (h > maxHeight) {
        h = maxHeight;
        w = h * ratio;
      }
      setImageSize({ width: Math.round(w), height: Math.round(h) });
    };
    img.onerror = () => {
      setImageSize({ width: 800, height: 600 });
    };
  }, [activeImageFile]);

  const [activeLabel, setActiveLabel] = useState('人脸');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<Rect | null>(null);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'select') {
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      setIsPanning(true);
      setPanStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y
      });
      return;
    }

    if (tool !== 'rect') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (zoom / 100);
    const y = (e.clientY - rect.top) / (zoom / 100);
    
    setIsDrawing(true);
    setStartPos({ x, y });
    const newRect: Rect = {
      id: 'drawing',
      x,
      y,
      width: 0,
      height: 0,
      label: activeLabel,
      color: labels.find(l => l.name === activeLabel)?.color || '#3b82f6'
    };
    setCurrentRect(newRect);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!isDrawing || !currentRect) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (zoom / 100);
    const y = (e.clientY - rect.top) / (zoom / 100);
    
    const newX = Math.min(x, startPos.x);
    const newY = Math.min(y, startPos.y);
    const newWidth = Math.abs(x - startPos.x);
    const newHeight = Math.abs(y - startPos.y);
    
    setCurrentRect({
      ...currentRect,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    });
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing || !currentRect) return;
    if (currentRect.width > 5 && currentRect.height > 5) {
      const finalRect = { ...currentRect, id: Math.random().toString(36).substr(2, 9) };
      setRects([...rects, finalRect]);
      setSelectedRectId(finalRect.id);
    }
    setIsDrawing(false);
    setCurrentRect(null);
  };

  useEffect(() => {
    // Sync video task status with file statuses
    setVideoTasks(prevTasks => prevTasks.map(task => {
      const taskFiles = videoFiles.filter(f => f.taskId === task.id);
      if (taskFiles.length === 0) return task;

      const total = taskFiles.length;
      const completed = taskFiles.filter(f => f.status === 'completed').length;

      const allReady = taskFiles.every(f => f.extractStatus === 'ready');
      const anyExtracting = taskFiles.some(f => f.extractStatus === 'extracting');
      const anyReady = taskFiles.some(f => f.extractStatus === 'ready');
      const allPending = taskFiles.every(f => f.extractStatus === 'pending');

      let newExtractStatus = task.extractStatus;
      if (allReady) newExtractStatus = 'completed';
      else if (anyExtracting) newExtractStatus = 'extracting';
      else if (anyReady) newExtractStatus = 'partial';
      else if (allPending) newExtractStatus = 'pending';

      // Also sync annotation status
      const allAnnotated = completed === total && total > 0;
      const anyAnnotated = completed > 0;
      let newStatus = task.status;
      if (allAnnotated) newStatus = 'completed';
      else if (anyAnnotated) newStatus = 'annotating';
      else newStatus = 'pending';

      return { ...task, total, completed, extractStatus: newExtractStatus, status: newStatus };
    }));
  }, [videoFiles]);

  useEffect(() => {
    // Sync image task status with file statuses
    setImageTasks(prevTasks => prevTasks.map(task => {
      const taskFiles = imageFiles.filter(f => f.taskId === task.id);
      if (taskFiles.length === 0) return { ...task, total: 0, completed: 0, status: 'pending' };

      const total = taskFiles.length;
      const completed = taskFiles.filter(f => f.status === 'completed').length;

      const allAnnotated = completed === total && total > 0;
      const anyAnnotated = completed > 0;
      let newStatus = task.status;
      if (allAnnotated) newStatus = 'completed';
      else if (anyAnnotated) newStatus = 'annotating';
      else newStatus = 'pending';

      return { ...task, total, completed, status: newStatus };
    }));
  }, [imageFiles]);

  useEffect(() => {
    // Reset index when switching tasks
    setCurrentImageIndex(0);
    setCurrentFrameIndex(0);
    setSelectedRectId(null);
  }, [selectedItem?.id]);

  useEffect(() => {
    setView('list');
  }, [activeSubTab]);

  const getImageStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 font-medium">已完成</span>;
      case 'annotating': return <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 font-medium">标注中</span>;
      case 'pending': return <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">未开始</span>;
      default: return <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">未标注</span>;
    }
  };

  const getVideoStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 font-medium">已完成</span>;
      case 'annotating': return <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 font-medium">标注中</span>;
      case 'extracting': return <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 font-medium flex items-center"><Clock className="w-3 h-3 mr-1 animate-spin" /> 抽帧中</span>;
      case 'partial': return <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 font-medium">部分抽帧中</span>;
      case 'ready': return <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 font-medium">可标注</span>;
      case 'pending': return <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">待抽帧</span>;
      default: return <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">未标注</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    return getVideoStatusBadge(status);
  };

  // --- Render Functions ---

  const renderImageAnnotationList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">图片标注</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">数据标注 / 图片标注任务列表</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setImportModalConfig({ open: true, type: 'image' })}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4 mr-2" /> 导入数据集
          </button>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input 
            type="text" 
            placeholder="搜索任务名称、ID..." 
            value={imgSearch}
            onChange={(e) => setImgSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
          />
        </div>
        <select 
          value={imgStatusFilter}
          onChange={(e) => setImgStatusFilter(e.target.value)}
          className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[var(--text-primary)]"
        >
          <option>所有状态</option>
          <option>未开始</option>
          <option>标注中</option>
          <option>已完成</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">任务名称</th>
              <th className="px-6 py-4 font-semibold">任务ID</th>
              <th className="px-6 py-4 font-semibold">数据总量</th>
              <th className="px-6 py-4 font-semibold">已完成</th>
              <th className="px-6 py-4 font-semibold">进度</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">创建时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filteredImageTasks.length > 0 ? filteredImageTasks.map((task) => (
              <tr key={task.id} className="hover:bg-[var(--bg-primary)] transition-colors group">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{task.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{task.id}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.total}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.completed}</td>
                <td className="px-6 py-4">
                  <div className="w-24">
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${(task.completed / task.total) * 100}%` }} 
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{getImageStatusBadge(task.status)}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    <button 
                      onClick={() => { setSelectedItem(task); setView('imageEditor'); }}
                      className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                    >
                      开始标注
                    </button>
                    <button 
                      onClick={() => handleDeleteImageTask(task.id)}
                      className="text-red-500 hover:text-red-600 text-sm font-medium"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                  未找到匹配的标注任务
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderVideoAnnotationList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">视频标注</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">数据标注 / 视频标注任务列表</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setImportModalConfig({ open: true, type: 'video' })}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4 mr-2" /> 导入数据集
          </button>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input 
            type="text" 
            placeholder="搜索任务名称、ID..." 
            value={vidSearch}
            onChange={(e) => setVidSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
          />
        </div>
        <select 
          value={vidStatusFilter}
          onChange={(e) => setVidStatusFilter(e.target.value)}
          className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[var(--text-primary)]"
        >
          <option>所有状态</option>
          <option>未开始</option>
          <option>标注中</option>
          <option>已完成</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">任务名称</th>
              <th className="px-6 py-4 font-semibold">任务ID</th>
              <th className="px-6 py-4 font-semibold">视频总量</th>
              <th className="px-6 py-4 font-semibold">抽帧状态</th>
              <th className="px-6 py-4 font-semibold">已完成</th>
              <th className="px-6 py-4 font-semibold">进度</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">创建时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filteredVideoTasks.length > 0 ? filteredVideoTasks.map((task) => (
              <tr key={task.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{task.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{task.id}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.total}</td>
                <td className="px-6 py-4">{getVideoStatusBadge(task.extractStatus)}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.completed}</td>
                <td className="px-6 py-4">
                  <div className="w-24">
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${(task.completed / task.total) * 100}%` }} 
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{getVideoStatusBadge(task.status)}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    <button 
                      onClick={() => { setSelectedItem(task); setView('videoDetail'); }}
                      className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                    >
                      进入详情
                    </button>
                    <button 
                      onClick={() => handleDeleteVideoTask(task.id)}
                      className="text-red-500 hover:text-red-600 text-sm font-medium"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                  未找到匹配的标注任务
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAnnotationManagement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">标注管理</h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setView('datasetMgmt')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20"
          >
            <Database className="w-4 h-4 mr-2" /> 数据集管理
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">任务名称</th>
              <th className="px-6 py-4 font-semibold">数据类型</th>
              <th className="px-6 py-4 font-semibold">数据总量</th>
              <th className="px-6 py-4 font-semibold">已标注数</th>
              <th className="px-6 py-4 font-semibold">标注进度</th>
              <th className="px-6 py-4 font-semibold">创建时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {allTasks.length > 0 ? allTasks.map((task) => (
              <tr key={task.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{task.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.type}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.total}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.count}</td>
                <td className="px-6 py-4">
                  <div className="w-32">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-blue-500 font-medium">{task.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${task.progress}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{task.time}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    <button 
                      onClick={() => {
                        if (task.isImage) {
                          const realTask = imageTasks.find((t: any) => t.id === task.id);
                          if (realTask) {
                            setSelectedItem(realTask);
                            setView('imageEditor');
                          }
                        } else {
                          const realTask = videoTasks.find((t: any) => t.id === task.id);
                          if (realTask) {
                            setSelectedItem(realTask);
                            setView('videoDetail');
                          }
                        }
                      }}
                      className="text-xs font-medium text-blue-500 hover:text-blue-600"
                    >
                      查看
                    </button>
                    <button 
                      onClick={() => {
                        if (task.isImage) {
                          handleDeleteImageTask(task.id);
                        } else {
                          handleDeleteVideoTask(task.id);
                        }
                      }}
                      className="text-xs font-medium text-red-500 hover:text-red-600"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                  暂无标注任务
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderImageEditor = () => (
    <div className="h-full flex flex-col -m-6">
      {/* Editor Toolbar */}
      <div className="h-14 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center space-x-2">
          <button onClick={() => setView('list')} className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-[var(--border-color)] mx-2" />
          <div className="flex items-center px-3 py-1 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] mr-2">
            <span className="text-xs font-bold text-blue-500 mr-2">任务:</span>
            <span className="text-xs font-medium truncate max-w-[120px]">{selectedItem?.name}</span>
          </div>
          <div className="flex items-center px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900/30 mr-2 text-[11px] font-bold text-emerald-600">
            <span>已标注 {imageEditorStats.completed}</span>
          </div>
          <div className="flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/30 mr-2 text-[11px] font-bold text-amber-600">
            <span>待标注 {imageEditorStats.pending}</span>
          </div>
          <div className="flex items-center px-2.5 py-1 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-[var(--border-color)] mr-4 text-[11px] font-medium text-[var(--text-secondary)]">
            <span>总数 {imageEditorStats.total}</span>
          </div>
          <button 
            onClick={() => setTool('select')}
            className={cn("p-2 rounded-lg transition-colors", tool === 'select' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30" : "hover:bg-[var(--bg-primary)] text-[var(--text-secondary)]")}
          >
            <MousePointer2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setTool('rect')}
            className={cn("p-2 rounded-lg transition-colors", tool === 'rect' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30" : "hover:bg-[var(--bg-primary)] text-[var(--text-secondary)]")}
          >
            <Square className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setRects([])}
            className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-red-500"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.multiple = true;
              input.onchange = (e: any) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                  const promises = files.map((file: any, idx) => {
                    return new Promise<any>((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const fileId = Date.now() + idx + Math.floor(Math.random() * 1000);
                        const url = reader.result;
                        if (url) {
                          saveIndexedDBFile(`file_url_${fileId}`, url);
                        }
                        resolve({
                          id: fileId,
                          taskId: selectedItem?.id,
                          name: file.name,
                          status: 'pending',
                          url
                        });
                      };
                      reader.readAsDataURL(file);
                    });
                  });
                  Promise.all(promises).then((newFiles) => {
                    setImageFiles(prev => [...prev, ...newFiles]);
                    showAlert('导入成功', `成功导入 ${newFiles.length} 张图片`);
                  });
                }
              };
              input.click();
            }}
            className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--text-secondary)]"
            title="导入图片"
          >
            <Upload className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-[var(--border-color)] mx-2" />
          <button className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--text-secondary)]">
            <Undo2 className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--text-secondary)]">
            <Redo2 className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] px-2">
            <button onClick={() => setZoom(z => Math.max(10, z - 10))} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <Minimize2 className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-12 text-center">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(500, z + 10))} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setExportDatasetModalConfig({ 
              open: true, 
              datasets: datasets.filter(ds => ds.taskIds.includes(selectedItem?.id)) 
            })}
            className="flex items-center px-4 py-1.5 border border-blue-500 text-blue-500 rounded-lg text-sm font-medium hover:bg-blue-50"
          >
            <FileOutput className="w-4 h-4 mr-2" /> 导出标注
          </button>
          <button 
            onClick={() => {
              showAlert('保存成功', '标注已保存成功');
            }}
            className="flex items-center px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" /> 保存标注
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Image List */}
        <div className="w-64 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col shrink-0">
          <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <h3 id="image-annotation-count-heading" className="text-sm font-bold flex items-center">
              <ImageIcon className="w-4 h-4 mr-2 text-blue-500" /> 待标注图片 ({imageEditorStats.pending})
            </h3>
            <button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const fileId = Date.now();
                      const url = reader.result;
                      if (url) {
                        saveIndexedDBFile(`file_url_${fileId}`, url);
                      }
                      const newFile = { 
                        id: fileId, 
                        taskId: selectedItem?.id, 
                        name: file.name, 
                        status: 'pending',
                        url
                      };
                      setImageFiles((prev: any) => [...prev, newFile]);
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              className="p-1 hover:bg-[var(--bg-primary)] rounded text-blue-500"
              title="添加图片"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {currentImageFiles.map((file, idx) => (
              <div 
                key={file.id} 
                onClick={() => { setCurrentImageIndex(idx); setSelectedRectId(null); }}
                className={cn(
                  "p-2 rounded-lg border transition-all cursor-pointer group",
                  currentImageIndex === idx ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10" : "border-transparent hover:bg-[var(--bg-primary)]"
                )}
              >
                <div className="aspect-video rounded bg-slate-200 dark:bg-slate-800 mb-2 overflow-hidden">
                  <img src={file.url || `https://picsum.photos/seed/${file.id}/200/120`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex items-center justify-between text-[var(--text-primary)]">
                  <span className="text-xs truncate font-medium max-w-[120px]">{file.name}</span>
                  <div className="flex items-center space-x-1">
                    {file.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-400" />}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        showConfirm('删除确认', `确定要删除图片 ${file.name} 吗？`, () => {
                          setImageFiles(prev => prev.filter(f => f.id !== file.id));
                          if (currentImageIndex >= currentImageFiles.length - 1 && currentImageIndex > 0) {
                            setCurrentImageIndex(prev => prev - 1);
                          }
                        });
                      }}
                      className="p-1 text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="删除图片"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Canvas */}
        <div 
          onWheel={(e) => {
            const scaleFactor = 1.1;
            if (e.deltaY < 0) {
              setZoom(z => Math.min(500, Math.round(z * scaleFactor)));
            } else {
              setZoom(z => Math.max(10, Math.round(z / scaleFactor)));
            }
          }}
          className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center"
        >
          <div 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={cn(
              "absolute bg-white shadow-2xl select-none",
              tool === 'select' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'
            )}
            style={{ 
              left: '50%',
              top: '50%',
              width: `${imageSize.width}px`, 
              height: `${imageSize.height}px`, 
              transform: `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px)) scale(${zoom / 100})`,
              transformOrigin: 'center center',
              backgroundImage: activeImageFile ? (activeImageFile.url ? `url(${activeImageFile.url})` : `url(https://picsum.photos/seed/${activeImageFile.id}/800/600)`) : 'none',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Rects */}
            <div className="absolute inset-0">
              {rects.map((rect) => (
                <div 
                  key={rect.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedRectId(rect.id); }}
                  className={cn(
                    "absolute border-2 transition-all",
                    selectedRectId === rect.id ? "ring-2 ring-white ring-offset-2 ring-offset-blue-500" : ""
                  )}
                  style={{ 
                    left: `${rect.x}px`, 
                    top: `${rect.y}px`, 
                    width: `${rect.width}px`, 
                    height: `${rect.height}px`,
                    borderColor: rect.color,
                    backgroundColor: `${rect.color}20`
                  }}
                >
                  <span 
                    className="absolute -top-6 left-0 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap"
                    style={{ backgroundColor: rect.color }}
                  >
                    {rect.label}
                  </span>
                  {selectedRectId === rect.id && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setRects(rects.filter(r => r.id !== rect.id));
                        setSelectedRectId(null);
                      }}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {/* Current Drawing Rect */}
              {currentRect && (
                <div 
                  className="absolute border-2 border-dashed"
                  style={{ 
                    left: `${currentRect.x}px`, 
                    top: `${currentRect.y}px`, 
                    width: `${currentRect.width}px`, 
                    height: `${currentRect.height}px`,
                    borderColor: currentRect.color,
                    backgroundColor: `${currentRect.color}10`
                  }}
                />
              )}
            </div>
          </div>

          {/* Canvas Controls Overlay */}
          <div id="canvas-navigation-overlay" className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-4 bg-[var(--bg-secondary)]/80 backdrop-blur-md border border-[var(--border-color)] rounded-full px-6 py-2 shadow-xl">
            <button 
              disabled={currentImageIndex === 0}
              onClick={() => { setCurrentImageIndex(prev => prev - 1); setSelectedRectId(null); }}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-full disabled:opacity-30 text-[var(--text-primary)]"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {currentImageFiles.length > 0 ? currentImageIndex + 1 : 0} / {currentImageFiles.length}
            </span>
            <button 
              disabled={currentImageIndex >= currentImageFiles.length - 1}
              onClick={() => { setCurrentImageIndex(prev => prev + 1); setSelectedRectId(null); }}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-full disabled:opacity-30 text-[var(--text-primary)]"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-[var(--border-color)] mx-1" />
            <button className="p-1.5 hover:bg-white rounded-full"><Settings2 className="w-4 h-4" /></button>
            <div className="h-4 w-px bg-[var(--border-color)] mx-1" />
            <span className="text-xs font-mono">x: 422, y: 156</span>
          </div>
        </div>

        {/* Right: Properties */}
        <div className="w-72 border-l border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col shrink-0">
          <div className="p-4 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-bold flex items-center">
              <Layers className="w-4 h-4 mr-2 text-blue-500" /> 标注属性
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Label Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">标签管理</span>
                <button 
                  onClick={() => setIsAddingLabel(!isAddingLabel)}
                  className={cn("text-blue-500 hover:text-blue-600 transition-transform", isAddingLabel && "rotate-45")}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {isAddingLabel && (
                <div className="flex items-center space-x-2 animate-in slide-in-from-top-2 duration-200">
                  <input 
                    autoFocus
                    type="text" 
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLabelName) {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                        const color = colors[labels.length % colors.length];
                        setLabels([...labels, { name: newLabelName, color }]);
                        setNewLabelName('');
                        setIsAddingLabel(false);
                      }
                    }}
                    placeholder="标签名称..."
                    className="flex-1 px-2 py-1 bg-[var(--bg-primary)] border border-blue-500 rounded text-xs focus:outline-none"
                  />
                  <button 
                    onClick={() => {
                      if (newLabelName) {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                        const color = colors[labels.length % colors.length];
                        setLabels([...labels, { name: newLabelName, color }]);
                        setNewLabelName('');
                        setIsAddingLabel(false);
                      }
                    }}
                    className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {labels.map((l) => (
                  <div key={l.name} className="relative group">
                    <button 
                      onClick={() => setActiveLabel(l.name)}
                      className={cn(
                        "w-full flex items-center px-2 py-1.5 rounded border text-xs transition-all",
                        activeLabel === l.name ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-[var(--border-color)] hover:bg-[var(--bg-primary)]"
                      )}
                    >
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: l.color }} />
                      <span className="truncate">{l.name}</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setLabels(labels.filter(item => item.name !== l.name));
                        if (activeLabel === l.name && labels.length > 1) {
                          setActiveLabel(labels.find(item => item.name !== l.name)?.name || '');
                        }
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Rect Info */}
            {selectedRectId && (
              <div className="space-y-4 p-3 bg-[var(--bg-primary)] rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-500 uppercase">标注详情</span>
                  <button 
                    onClick={() => {
                      setRects(rects.filter(r => r.id !== selectedRectId));
                      setSelectedRectId(null);
                    }}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase">修改标签</label>
                  <select 
                    value={rects.find(r => r.id === selectedRectId)?.label}
                    onChange={(e) => {
                      const newLabel = e.target.value;
                      const newColor = labels.find(l => l.name === newLabel)?.color || '#3b82f6';
                      setRects(rects.map(r => r.id === selectedRectId ? { ...r, label: newLabel, color: newColor } : r));
                    }}
                    className="w-full px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-xs"
                  >
                    {labels.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-secondary)]">X 坐标</label>
                    <input type="number" value={Math.round(rects.find(r => r.id === selectedRectId)?.x || 0)} className="w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-xs" readOnly />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-secondary)]">Y 坐标</label>
                    <input type="number" value={Math.round(rects.find(r => r.id === selectedRectId)?.y || 0)} className="w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-xs" readOnly />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-secondary)]">宽度</label>
                    <input type="number" value={Math.round(rects.find(r => r.id === selectedRectId)?.width || 0)} className="w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-xs" readOnly />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-secondary)]">高度</label>
                    <input type="number" value={Math.round(rects.find(r => r.id === selectedRectId)?.height || 0)} className="w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-xs" readOnly />
                  </div>
                </div>
              </div>
            )}

            {/* Annotation List */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">已标注列表 ({rects.length})</span>
              <div className="space-y-2">
                {rects.map((r) => (
                  <div 
                    key={r.id} 
                    onClick={() => setSelectedRectId(r.id)}
                    className={cn(
                      "flex items-center justify-between p-2 rounded border transition-all cursor-pointer group",
                      selectedRectId === r.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10" : "bg-[var(--bg-primary)] border-[var(--border-color)]"
                    )}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: r.color }} />
                      <span className="text-xs font-medium">{r.label}_{r.id.slice(0, 4)}</span>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 hover:text-red-500" onClick={(e) => { e.stopPropagation(); setRects(rects.filter(item => item.id !== r.id)); }}><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVideoEditor = () => {
    const totalFrames = selectedVideo?.totalFrames || 100;
    
    return (
      <div className="h-full flex flex-col -m-6">
        {/* Video Toolbar */}
        <div className="h-14 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center space-x-2">
            <button onClick={() => setView('videoDetail')} className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--text-secondary)]">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-[var(--border-color)] mx-2" />
            <div className="flex items-center px-3 py-1 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] mr-2">
              <span className="text-xs font-bold text-blue-500 mr-2">视频:</span>
              <span className="text-xs font-medium truncate max-w-[120px]">{selectedVideo?.name}</span>
            </div>
            <div className="flex items-center px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900/30 mr-2 text-[11px] font-bold text-emerald-600">
              <span>已标注 {videoEditorStats.completed}</span>
            </div>
            <div className="flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/30 mr-2 text-[11px] font-bold text-amber-600">
              <span>待标注 {videoEditorStats.pending}</span>
            </div>
            <div className="flex items-center px-2.5 py-1 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-[var(--border-color)] mr-4 text-[11px] font-medium text-[var(--text-secondary)]">
              <span>总数 {videoEditorStats.total}</span>
            </div>
            <button className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--text-secondary)]"><MousePointer2 className="w-5 h-5" /></button>
            <button className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 rounded-lg"><Square className="w-5 h-5" /></button>
            <div className="h-6 w-px bg-[var(--border-color)] mx-2" />
            <span className="text-xs font-medium text-[var(--text-primary)]">帧号: {currentFrameIndex + 1} / {totalFrames}</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] px-2">
              <button onClick={() => setZoom(z => Math.max(10, z - 10))} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <Minimize2 className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(500, z + 10))} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={() => setExportDatasetModalConfig({ 
                open: true, 
                datasets: datasets.filter(ds => ds.taskIds.includes(selectedItem?.id)) 
              })}
              className="px-4 py-1.5 border border-blue-500 text-blue-500 rounded-lg text-sm font-medium hover:bg-blue-50 flex items-center"
            >
              <FileOutput className="w-4 h-4 mr-2" /> 导出标注
            </button>
            <button 
              onClick={() => {
                setVideoFiles(prev => prev.map(f => f.id === selectedVideo.id ? { ...f, status: 'completed' } : f));
                showAlert('保存成功', '标注已保存成功');
              }}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              保存标注
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Frame List */}
          <div className="w-64 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col shrink-0">
            <div className="p-4 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold flex items-center">
                <Layers className="w-4 h-4 mr-2 text-blue-500" /> 帧序列 ({totalFrames})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {Array.from({ length: totalFrames }).map((_, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setCurrentFrameIndex(idx)}
                  className={cn(
                    "p-2 rounded-lg border transition-all cursor-pointer group flex items-center space-x-3",
                    currentFrameIndex === idx ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10" : "border-transparent hover:bg-[var(--bg-primary)]"
                  )}
                >
                  <div className="w-16 aspect-video rounded bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
                    <img src={`https://picsum.photos/seed/vid-${selectedVideo?.id}-frame-${idx}/160/90`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-blue-500">Frame {idx + 1}</span>
                    <span className="text-[9px] text-[var(--text-secondary)] font-mono">{(idx * 0.2).toFixed(2)}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center: Frame Image & Canvas */}
          <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-auto">
            <div className="flex-1 relative flex items-center justify-center p-8 min-h-[600px]">
              <div 
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className={cn(
                  "relative bg-white shadow-2xl transition-transform duration-200 select-none",
                  tool === 'rect' ? 'cursor-crosshair' : 'cursor-default'
                )}
                style={{ 
                  width: '800px', 
                  height: '600px', 
                  transform: `scale(${zoom / 100})`,
                  backgroundImage: `url(https://picsum.photos/seed/vid-${selectedVideo?.id}-frame-${currentFrameIndex}/800/600)`,
                  backgroundSize: 'cover'
                }}
              >
                {/* Rects */}
                <div className="absolute inset-0">
                  {rects.map((rect) => (
                    <div 
                      key={rect.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedRectId(rect.id); }}
                      className={cn(
                        "absolute border-2 transition-all",
                        selectedRectId === rect.id ? "ring-2 ring-white ring-offset-2 ring-offset-blue-500" : ""
                      )}
                      style={{ 
                        left: `${rect.x}px`, 
                        top: `${rect.y}px`, 
                        width: `${rect.width}px`, 
                        height: `${rect.height}px`,
                        borderColor: rect.color,
                        backgroundColor: `${rect.color}20`
                      }}
                    >
                      <span 
                        className="absolute -top-6 left-0 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap"
                        style={{ backgroundColor: rect.color }}
                      >
                        {rect.label}
                      </span>
                      {selectedRectId === rect.id && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setRects(rects.filter(r => r.id !== rect.id));
                            setSelectedRectId(null);
                          }}
                          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {/* Current Drawing Rect */}
                  {currentRect && (
                    <div 
                      className="absolute border-2 border-dashed"
                      style={{ 
                        left: `${currentRect.x}px`, 
                        top: `${currentRect.y}px`, 
                        width: `${currentRect.width}px`, 
                        height: `${currentRect.height}px`,
                        borderColor: currentRect.color,
                        backgroundColor: `${currentRect.color}10`
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Frame Navigation */}
            <div className="h-20 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] px-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setCurrentFrameIndex(prev => Math.max(0, prev - 1))}
                  className="flex items-center px-3 py-1.5 border border-[var(--border-color)] rounded-lg text-xs font-medium hover:bg-[var(--bg-primary)] disabled:opacity-50"
                  disabled={currentFrameIndex === 0}
                >
                  <SkipBack className="w-4 h-4 mr-2" /> 上一帧
                </button>
                <button 
                  onClick={() => setCurrentFrameIndex(prev => Math.min(totalFrames - 1, prev + 1))}
                  className="flex items-center px-3 py-1.5 border border-[var(--border-color)] rounded-lg text-xs font-medium hover:bg-[var(--bg-primary)] disabled:opacity-50"
                  disabled={currentFrameIndex === totalFrames - 1}
                >
                  下一帧 <SkipForward className="w-4 h-4 ml-2" />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs text-[var(--text-secondary)]">跳转至:</span>
                <input 
                  type="number" 
                  min={1} 
                  max={totalFrames}
                  value={currentFrameIndex + 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 1 && val <= totalFrames) setCurrentFrameIndex(val - 1);
                  }}
                  className="w-16 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-center"
                />
                <span className="text-xs text-[var(--text-secondary)]">/ {totalFrames}</span>
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">当前时间戳</span>
                  <span className="text-sm font-mono font-bold">{(currentFrameIndex * 0.2).toFixed(3)}s</span>
                </div>
                <div className="h-8 w-px bg-[var(--border-color)]" />
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">标注进度</span>
                  <span className="text-sm font-bold text-blue-500">{Math.round(((currentFrameIndex + 1) / totalFrames) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Properties */}
          <div className="w-72 border-l border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
            <h3 className="text-sm font-bold mb-4">标注属性</h3>
            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">标签</label>
                 <select className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm">
                   <option>车辆</option>
                   <option>行人</option>
                   <option>非机动车</option>
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">帧属性</label>
                 <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] space-y-3">
                   <label className="flex items-center space-x-2 cursor-pointer">
                     <input type="checkbox" className="rounded text-blue-500" />
                     <span className="text-xs">关键帧</span>
                   </label>
                   <label className="flex items-center space-x-2 cursor-pointer">
                     <input type="checkbox" className="rounded text-blue-500" />
                     <span className="text-xs">模糊/遮挡</span>
                   </label>
                 </div>
               </div>
               <div className="pt-4 border-t border-[var(--border-color)]">
                 <button 
                   onClick={() => {
                     if (currentFrameIndex > 0) {
                       const prevKey = `vid_${selectedVideo?.id}_${currentFrameIndex - 1}`;
                       const prevRects = annotations[prevKey] || [];
                       const newRects = prevRects.map(r => ({ ...r, id: Math.random().toString(36).substr(2, 9) }));
                       setRects(newRects);
                     }
                   }}
                   className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-[var(--text-primary)] rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
                   disabled={currentFrameIndex === 0}
                 >
                   复制上一帧标注
                 </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVideoDetail = () => (
    <div className="h-full flex flex-col -m-6">
      <div className="h-16 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center space-x-4">
          <button onClick={() => setView('list')} className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{selectedItem?.name}</h2>
            <p className="text-xs text-[var(--text-secondary)]">数据集详情 / 视频列表</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => {
               const input = document.createElement('input');
               input.type = 'file';
               input.accept = 'video/*';
               input.multiple = true;
               input.onchange = (e: any) => {
                 const newFiles = Array.from(e.target.files).map((file: any) => ({
                   id: Date.now() + Math.random(),
                   taskId: selectedItem.id,
                   name: file.name,
                   status: 'pending',
                   extractStatus: 'pending',
                   strategy: null,
                   totalFrames: 0
                 }));
                 setVideoFiles([...videoFiles, ...newFiles]);
               };
               input.click();
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" /> 上传视频
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">视频名称</th>
                <th className="px-6 py-4 font-semibold">抽帧策略</th>
                <th className="px-6 py-4 font-semibold">抽帧状态</th>
                <th className="px-6 py-4 font-semibold">总帧数</th>
                <th className="px-6 py-4 font-semibold">标注状态</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {currentTaskFiles.map((file) => (
                <tr key={file.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{file.name}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {file.strategy ? (
                      <span className="flex items-center">
                        <Settings2 className="w-3 h-3 mr-1" />
                        {file.strategy === 'fps' ? `固定帧率 (${file.fps}fps)` : 
                         file.strategy === 'interval' ? `按间隔 (${file.interval}帧)` : 
                         file.strategy === 'keyframes' ? '按关键帧' : '按总帧数'}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(file.extractStatus)}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{file.totalFrames || '-'}</td>
                  <td className="px-6 py-4">{getStatusBadge(file.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      {file.extractStatus === 'pending' && (
                        <button 
                          onClick={() => { setSelectedVideo(file); setExtractModalOpen(true); }}
                          className="text-xs font-medium text-blue-500 hover:text-blue-600"
                        >
                          配置抽帧
                        </button>
                      )}
                      {file.extractStatus === 'ready' && (
                        <button 
                          onClick={() => { setSelectedVideo(file); setView('videoEditor'); }}
                          className="text-xs font-medium text-emerald-500 hover:text-emerald-600"
                        >
                          开始标注
                        </button>
                      )}
                      {file.extractStatus === 'extracting' && (
                        <button disabled className="text-xs font-medium text-slate-400 cursor-not-allowed">
                          抽帧中...
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          showConfirm('删除确认', `确定要删除视频 ${file.name} 吗？`, () => {
                            setVideoFiles(prev => prev.filter(f => f.id !== file.id));
                          });
                        }}
                        className="text-xs font-medium text-red-500 hover:text-red-600"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );


  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [dsSearch, setDsSearch] = useState('');

  const filteredDatasets = datasets.filter(ds => 
    ds.name.toLowerCase().includes(dsSearch.toLowerCase()) || 
    ds.id.toLowerCase().includes(dsSearch.toLowerCase())
  );

  const isDatasetExportable = (dataset: Dataset) => {
    const associatedTasks = [...imageTasks, ...videoTasks].filter(t => dataset.taskIds.includes(t.id));
    return associatedTasks.length > 0 && associatedTasks.every(t => t.status === 'completed');
  };

  const renderDatasetMgmt = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">数据集管理</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">统一管理图片与视频数据集，支持标注成果导出</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setDatasetModalConfig({ open: true })}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> 新建数据集
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input 
              type="text" 
              placeholder="搜索数据集名称..." 
              value={dsSearch}
              onChange={(e) => setDsSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
            />
          </div>
          <div className="flex items-center space-x-2">
            <button 
              disabled={selectedDatasetIds.length === 0}
              onClick={() => {
                const selectedDatasets = datasets.filter(ds => selectedDatasetIds.includes(ds.id));
                const exportable = selectedDatasets.filter(isDatasetExportable);
                if (exportable.length < selectedDatasets.length) {
                  showAlert('部分数据集无法导出', '部分选中的数据集有关联任务未完成，无法导出');
                }
                if (exportable.length > 0) {
                  setExportDatasetModalConfig({ open: true, datasets: exportable });
                }
              }}
              className="flex items-center px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs font-medium hover:bg-[var(--bg-primary)] disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" /> 标准文件导出
            </button>
            <button 
              disabled={selectedDatasetIds.length === 0}
              onClick={() => {
                const selectedDatasets = datasets.filter(ds => selectedDatasetIds.includes(ds.id));
                const deletable = selectedDatasets.filter(ds => ds.taskIds.length === 0);
                const undeletable = selectedDatasets.filter(ds => ds.taskIds.length > 0);
                
                if (undeletable.length > 0) {
                  showAlert('无法删除', `选中的数据集项中有 ${undeletable.length} 个已关联标注任务，无法删除。只能删除未关联任务的数据集。`);
                }
                
                if (deletable.length > 0) {
                  showConfirm('批量删除确认', `确定要删除选中的 ${deletable.length} 个未关联任务的数据集吗？`, () => {
                    const deletableIds = deletable.map(ds => ds.id);
                    setDatasets(prev => prev.filter(ds => !deletableIds.includes(ds.id)));
                    setSelectedDatasetIds(prev => prev.filter(id => !deletableIds.includes(id)));
                  });
                }
              }}
              className="flex items-center px-3 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-2" /> 批量删除
            </button>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 w-10">
                <input 
                  type="checkbox" 
                  className="rounded text-blue-500"
                  checked={selectedDatasetIds.length === filteredDatasets.length && filteredDatasets.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDatasetIds(filteredDatasets.map(ds => ds.id));
                    } else {
                      setSelectedDatasetIds([]);
                    }
                  }}
                />
              </th>
              <th className="px-6 py-4 font-semibold">数据集名称</th>
              <th className="px-6 py-4 font-semibold">类型</th>
              <th className="px-6 py-4 font-semibold">数据量</th>
              <th className="px-6 py-4 font-semibold">关联任务</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filteredDatasets.map((ds) => {
              const exportable = isDatasetExportable(ds);
              const associatedTasks = [...imageTasks, ...videoTasks].filter(t => ds.taskIds.includes(t.id));
              
              return (
                <tr key={ds.id} className="hover:bg-[var(--bg-primary)] transition-colors group">
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded text-blue-500"
                      checked={selectedDatasetIds.includes(ds.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDatasetIds([...selectedDatasetIds, ds.id]);
                        } else {
                          setSelectedDatasetIds(selectedDatasetIds.filter(id => id !== ds.id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 mr-3">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">{ds.name}</div>
                        <div className="text-[10px] text-[var(--text-secondary)]">ID: {ds.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                      ds.type === 'image' ? "bg-purple-50 text-purple-600" : "bg-orange-50 text-orange-600"
                    )}>
                      {ds.type === 'image' ? '图片' : '视频'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{ds.dataCount}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {associatedTasks.map(t => (
                        <span key={t.id} className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded border flex items-center",
                          t.status === 'completed' ? "border-emerald-200 text-emerald-600 bg-emerald-50" : "border-blue-200 text-blue-600 bg-blue-50"
                        )}>
                          {t.status === 'completed' && <CheckCircle2 className="w-2 h-2 mr-1" />}
                          {t.name}
                        </span>
                      ))}
                      {associatedTasks.length === 0 && <span className="text-[10px] text-slate-400 italic">未关联任务</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button 
                        disabled={!exportable}
                        onClick={() => setExportDatasetModalConfig({ open: true, datasets: [ds] })}
                        className={cn(
                          "text-xs font-medium transition-colors",
                          exportable ? "text-blue-500 hover:text-blue-600" : "text-slate-300 cursor-not-allowed"
                        )}
                        title={exportable ? "导出标注成果" : "有关联任务未完成，无法导出"}
                      >
                        导出
                      </button>
                      <button 
                        onClick={() => setDatasetModalConfig({ open: true, dataset: ds })}
                        className="text-xs font-medium text-slate-500 hover:text-slate-600"
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => {
                          if (ds.taskIds.length > 0) {
                            showAlert('无法删除', '该数据集已关联标注任务，无法删除。请先删除相关标注任务后再尝试。');
                            return;
                          }
                          showConfirm('删除确认', `确定要删除数据集 ${ds.name} 吗？`, () => {
                            setDatasets(prev => prev.filter(item => item.id !== ds.id));
                          });
                        }}
                        className={cn(
                          "text-xs font-medium transition-colors",
                          ds.taskIds.length > 0 ? "text-slate-300 cursor-not-allowed" : "text-red-500 hover:text-red-600"
                        )}
                        title={ds.taskIds.length > 0 ? "已关联标注任务，无法删除" : "删除数据集"}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const DatasetModal = ({ config, onClose }: { config: any; onClose: () => void }) => {
    const [name, setName] = useState(config.dataset?.name || '');
    const [type, setType] = useState(config.dataset?.type || 'image');
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) {
        setFiles(Array.from(e.dataTransfer.files));
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (config.dataset) {
        setDatasets(prev => prev.map(ds => ds.id === config.dataset.id ? { ...ds, name, type } : ds));
        showAlert('更新成功', '数据集更新成功');
        onClose();
      } else {
        const newDsId = `DS-${Math.floor(Math.random() * 1000)}`;
        const readFilesPromises = files.map((file, idx) => {
          return new Promise<any>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                name: file.name,
                url: reader.result
              });
            };
            reader.readAsDataURL(file);
          });
        });

        Promise.all(readFilesPromises).then(async (readFiles) => {
          if (readFiles.length > 0) {
            try {
              await saveIndexedDBFile(`dataset_loaded_files_${newDsId}`, readFiles);
            } catch (err) {
              console.error('Failed to save source files to IndexedDB due to limits:', err);
            }
          }

          const newDs: Dataset = {
            id: newDsId,
            name,
            type,
            taskIds: [],
            createdAt: new Date().toISOString().split('T')[0],
            dataCount: files.length || Math.floor(Math.random() * 5) + 3
          };
          setDatasets([newDs, ...datasets]);
          showAlert('创建成功', `数据集创建成功，共包含 ${newDs.dataCount} 个文件`);
          onClose();
        });
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center">
              <Database className="w-5 h-5 mr-2 text-blue-500" />
              <h3 className="text-lg font-bold">{config.dataset ? '编辑数据集' : '新建数据集'}</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-primary)] rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">数据集名称</label>
                  <input 
                    required
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="请输入数据集名称"
                    className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">数据集类型</label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value as 'image' | 'video')}
                    className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="image">图片数据集</option>
                    <option value="video">视频数据集</option>
                  </select>
                </div>
              </div>

              {!config.dataset && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">上传文件</label>
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer",
                      isDragging ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10" : "border-[var(--border-color)] hover:border-blue-400 hover:bg-[var(--bg-primary)]"
                    )}
                  >
                    <input 
                      type="file"
                      multiple
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files) {
                          setFiles(Array.from(e.target.files));
                        }
                      }}
                      className="hidden"
                      accept={type === 'image' ? "image/*,.zip,.tar" : "video/*,.zip,.tar"}
                    />
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-4">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium">点击或拖拽文件到此处上传</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">支持图片/视频文件或压缩包</p>
                    
                    {files.length > 0 && (
                      <div className="mt-4 w-full bg-[var(--bg-primary)] rounded-lg p-3 border border-[var(--border-color)]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium truncate max-w-[200px]">{files.length} 个文件已选择</span>
                          <span className="text-[10px] text-[var(--text-secondary)]">{(files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        <div className="mt-2 h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 w-full" />
                        </div>
                        <div className="mt-2 space-y-1">
                          {files.slice(0, 3).map((f, i) => (
                            <div key={i} className="text-[10px] text-[var(--text-secondary)] truncate flex items-center">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-emerald-500" /> {f.name}
                            </div>
                          ))}
                          {files.length > 3 && <div className="text-[10px] text-[var(--text-secondary)]">...以及另外 {files.length - 3} 个文件</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-primary)]">取消</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20">确定</button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };

  const ExportDatasetModal = ({ config, onClose }: { config: any; onClose: () => void }) => {
    const [format, setFormat] = useState('COCO');
    const [includeImages, setIncludeImages] = useState(true);

    const handleExport = () => {
      config.datasets.forEach((ds: Dataset) => {
        const newRecord: ExportRecord = {
          id: `EXP-${Math.floor(Math.random() * 10000)}`,
          datasetName: ds.name,
          format,
          status: 'processing',
          time: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0].slice(0, 5)
        };
        setExportHistory(prev => [newRecord, ...prev]);

        // Generate and trigger download with enriched standard formats
        let annotationContent = '';
        if (format === 'YOLO') {
          annotationContent = `# Standard YOLO format: <class_id> <x_center> <y_center> <width> <height>
# Exported from AI Scenario Evaluation Platform
# Dataset: ${ds.name}
# Classes: 0: person, 1: car, 2: bicycle, 3: dog
0 0.4521 0.5214 0.2110 0.3520
1 0.1245 0.4512 0.0820 0.1240
0 0.7841 0.6120 0.1540 0.4210
2 0.3210 0.8540 0.1200 0.0850
3 0.6540 0.2140 0.1850 0.2450
1 0.8540 0.1240 0.1420 0.0850`;
        } else if (format === 'Pascal VOC') {
          annotationContent = `<?xml version="1.0" encoding="UTF-8"?>
<annotation>
  <folder>VOC_EXPORT_${new Date().getFullYear()}</folder>
  <filename>${ds.name}_001.jpg</filename>
  <path>/datasets/${ds.name}/images/${ds.name}_001.jpg</path>
  <source>
    <database>AI Scenario Evaluation Platform (v2.4.0)</database>
    <annotation>PASCAL VOC2007</annotation>
    <image>custom_capture</image>
    <flickrid>0</flickrid>
  </source>
  <owner>
    <flickrid>admin</flickrid>
    <name>AI_Platform_Service</name>
  </owner>
  <size>
    <width>1920</width>
    <height>1080</height>
    <depth>3</depth>
  </size>
  <segmented>0</segmented>
  <object>
    <name>person</name>
    <pose>Unspecified</pose>
    <truncated>0</truncated>
    <difficult>0</difficult>
    <occluded>0</occluded>
    <bndbox>
      <xmin>450</xmin>
      <ymin>320</ymin>
      <xmax>850</xmax>
      <ymax>920</ymax>
    </bndbox>
  </object>
  <object>
    <name>car</name>
    <pose>Rear</pose>
    <truncated>1</truncated>
    <difficult>0</difficult>
    <occluded>1</occluded>
    <bndbox>
      <xmin>120</xmin>
      <ymin>600</ymin>
      <xmax>420</xmax>
      <ymax>850</ymax>
    </bndbox>
  </object>
  <object>
    <name>bicycle</name>
    <pose>Left</pose>
    <truncated>0</truncated>
    <difficult>1</difficult>
    <occluded>0</occluded>
    <bndbox>
      <xmin>900</xmin>
      <ymin>750</ymin>
      <xmax>1150</xmax>
      <ymax>980</ymax>
    </bndbox>
  </object>
</annotation>`;
        } else {
          // Comprehensive COCO JSON
          const cocoData = {
            info: {
              year: new Date().getFullYear(),
              version: "2.1",
              description: `Full export of dataset: ${ds.name}`,
              contributor: "Public Security AI Research Institute",
              url: "https://ais-platform.gov.cn",
              date_created: new Date().toISOString()
            },
            licenses: [
              { id: 1, name: "Attribution-NonCommercial-ShareAlike License", url: "http://creativecommons.org/licenses/by-nc-sa/2.0/" }
            ],
            images: [
              { id: 1, width: 1920, height: 1080, file_name: `${ds.name}_001.jpg`, license: 1, date_captured: "2026-01-15 10:20:30" },
              { id: 2, width: 1920, height: 1080, file_name: `${ds.name}_002.jpg`, license: 1, date_captured: "2026-01-15 10:21:45" },
              { id: 3, width: 1280, height: 720, file_name: `${ds.name}_003.jpg`, license: 1, date_captured: "2026-01-15 10:25:12" }
            ],
            annotations: [
              { id: 1, image_id: 1, category_id: 1, segmentation: [[450,320, 850,320, 850,920, 450,920]], area: 240000, bbox: [450, 320, 400, 600], iscrowd: 0 },
              { id: 2, image_id: 1, category_id: 2, segmentation: [[120,600, 420,600, 420,850, 120,850]], area: 75000, bbox: [120, 600, 300, 250], iscrowd: 0 },
              { id: 3, image_id: 2, category_id: 1, segmentation: [[1000,200, 1200,200, 1200,500, 1000,500]], area: 60000, bbox: [1000, 200, 200, 300], iscrowd: 0 },
              { id: 4, image_id: 3, category_id: 3, segmentation: [[300,400, 500,400, 500,600, 300,600]], area: 40000, bbox: [300, 400, 200, 200], iscrowd: 0 }
            ],
            categories: [
              { id: 1, name: "person", supercategory: "human" },
              { id: 2, name: "car", supercategory: "vehicle" },
              { id: 3, name: "bicycle", supercategory: "vehicle" },
              { id: 4, name: "dog", supercategory: "animal" }
            ]
          };
          annotationContent = JSON.stringify(cocoData, null, 2);
        }

        const blob = new Blob([annotationContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${ds.name}_${format.replace(' ', '_')}_export.${format === 'Pascal VOC' ? 'xml' : format === 'YOLO' ? 'txt' : 'json'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Simulate completion in history
        setTimeout(() => {
          setExportHistory(prev => prev.map(r => r.id === newRecord.id ? { ...r, status: 'completed', downloadUrl: url } : r));
        }, 1500);
      });
      showAlert('导出开始', '正在导出标注文件...');
      onClose();
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <h3 className="text-lg font-bold">导出标注成果</h3>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-primary)] rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">待导出数据集 ({config.datasets.length})</label>
              <div className="flex flex-wrap gap-2">
                {config.datasets.map((ds: Dataset) => (
                  <span key={ds.id} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium border border-blue-100">
                    {ds.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">导出格式</label>
              <div className="grid grid-cols-3 gap-3">
                {['COCO', 'YOLO', 'Pascal VOC'].map((f) => (
                  <button 
                    key={f}
                    onClick={() => setFormat(f)}
                    className={cn(
                      "px-4 py-3 rounded-lg border-2 transition-all text-center",
                      format === f ? "border-blue-500 bg-blue-50 text-blue-600" : "border-[var(--border-color)] hover:border-blue-500"
                    )}
                  >
                    <div className="text-sm font-bold">{f}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="rounded text-blue-500"
                />
                <span className="text-sm">包含原始图片/视频帧</span>
              </label>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg p-3 flex items-start">
              <AlertCircle className="w-4 h-4 text-amber-500 mr-2 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                提示：导出大规模数据集可能需要较长时间，您可以在“导出历史记录”中查看进度并下载结果。
              </p>
            </div>

            <div className="pt-4 flex justify-end space-x-3">
              <button onClick={onClose} className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-primary)]">取消</button>
              <button onClick={handleExport} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center">
                <Download className="w-4 h-4 mr-2" /> 开始导出
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };
  const ImportModal = ({ config, onClose, onImport }: { config: any; onClose: () => void; onImport: (data: any) => void }) => {
    const [name, setName] = useState('');
    const [selectedDsId, setSelectedDsId] = useState('');
    const [format, setFormat] = useState('COCO');

    const availableDatasets = datasets.filter(ds => ds.type === config.type);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const selectedDs = datasets.find(ds => ds.id === selectedDsId);
      onImport({
        name: name || selectedDs?.name,
        datasetId: selectedDsId,
        fileCount: selectedDs?.dataCount || 120
      });
      onClose();
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center">
              <Layers className="w-5 h-5 mr-2 text-blue-500" />
              <h3 className="text-lg font-bold">导入数据集</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-primary)] rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">任务名称</label>
                <input 
                  required
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入任务名称"
                  className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">选择数据集</label>
                  <select 
                    required
                    value={selectedDsId}
                    onChange={(e) => setSelectedDsId(e.target.value)}
                    className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">请选择数据集</option>
                    {availableDatasets.map(ds => (
                      <option key={ds.id} value={ds.id}>{ds.name} ({ds.dataCount})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">标注格式</label>
                  <select 
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option>COCO</option>
                    <option>YOLO</option>
                    <option>Pascal VOC</option>
                    <option>LabelMe</option>
                    <option>Raw Files (无标注)</option>
                  </select>
                </div>
              </div>

              {availableDatasets.length === 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-lg flex items-start">
                  <Info className="w-4 h-4 text-blue-500 mr-2 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700 dark:text-blue-400">
                    暂无可用数据集。请先前往 <button type="button" onClick={() => { setView('datasetMgmt'); onClose(); }} className="font-bold underline">数据集管理</button> 上传数据。
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end space-x-3">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-primary)]"
              >
                取消
              </button>
              <button 
                type="submit"
                disabled={!name || !selectedDsId}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                开始标注
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };

  const StatsModal = ({ task, onClose }: { task: any; onClose: () => void }) => {
    const stats = [
      { label: '人脸', count: 450, color: '#3b82f6' },
      { label: '车辆', count: 280, color: '#10b981' },
      { label: '车牌', count: 120, color: '#f59e0b' },
      { label: '行人', count: 85, color: '#ef4444' },
    ];

    const totalAnnotations = stats.reduce((acc, curr) => acc + curr.count, 0);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
              <h3 className="text-lg font-bold">标注统计 - {task?.name}</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-primary)] rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-center">
                <p className="text-xs text-[var(--text-secondary)] font-medium uppercase mb-1">总标注数</p>
                <p className="text-2xl font-bold text-blue-500">{totalAnnotations}</p>
              </div>
              <div className="p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-center">
                <p className="text-xs text-[var(--text-secondary)] font-medium uppercase mb-1">已标注图片</p>
                <p className="text-2xl font-bold text-emerald-500">{task?.completed || 420}</p>
              </div>
              <div className="p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-center">
                <p className="text-xs text-[var(--text-secondary)] font-medium uppercase mb-1">标注进度</p>
                <p className="text-2xl font-bold text-amber-500">{Math.round(((task?.completed || 420) / (task?.total || 500)) * 100)}%</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">标签分布</h4>
              <div className="space-y-3">
                {stats.map((s) => (
                  <div key={s.label} className="space-y-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-[var(--text-secondary)]">{s.count} ({Math.round((s.count / totalAnnotations) * 100)}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500" 
                        style={{ width: `${(s.count / totalAnnotations) * 100}%`, backgroundColor: s.color }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20"
              >
                关闭
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const ExtractModal = ({ video, onClose }: { video: any; onClose: () => void }) => {
    const [strategy, setStrategy] = useState('fps');
    const [value, setValue] = useState('5');

    const handleStart = () => {
      setVideoFiles(prev => prev.map(f => f.id === video.id ? {
        ...f,
        extractStatus: 'extracting',
        strategy,
        [strategy === 'fps' ? 'fps' : strategy === 'interval' ? 'interval' : 'total']: parseInt(value)
      } : f));
      
      // Simulate extraction completion
      setTimeout(() => {
        setVideoFiles(prev => prev.map(f => f.id === video.id ? {
          ...f,
          extractStatus: 'ready',
          totalFrames: strategy === 'total' ? parseInt(value) : 120
        } : f));
      }, 3000);
      
      onClose();
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <h3 className="text-lg font-bold">配置抽帧策略</h3>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-primary)] rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">抽帧方式</label>
              <select 
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="fps">固定帧率 (FPS)</option>
                <option value="interval">按帧间隔</option>
                <option value="keyframes">按关键帧</option>
                <option value="total">按总帧数</option>
              </select>
            </div>

            {strategy !== 'keyframes' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {strategy === 'fps' ? '帧率 (每秒帧数)' : 
                   strategy === 'interval' ? '间隔帧数' : '总抽帧数'}
                </label>
                <input 
                  type="number" 
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-lg p-3 flex items-start">
              <AlertCircle className="w-4 h-4 text-blue-500 mr-2 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 dark:text-blue-400">
                提示：抽帧过程将在后台异步进行，完成后您将收到通知。抽帧期间无法进行标注。
              </p>
            </div>

            <div className="pt-4 flex justify-end space-x-3">
              <button 
                onClick={onClose}
                className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-[var(--bg-primary)]"
              >
                取消
              </button>
              <button 
                onClick={handleStart}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20"
              >
                开始抽帧
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderContent = () => {
    return (
      <>
        {confirmState.open && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-500 font-bold">
                  <AlertCircle className="w-5 h-5" />
                  <span>{confirmState.title || '确认提示'}</span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">{confirmState.message}</p>
                <div className="mt-6 flex justify-end space-x-3">
                  <button 
                    onClick={() => setConfirmState(prev => ({ ...prev, open: false }))}
                    className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-xs font-medium hover:bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => confirmState.onConfirm()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium shadow-md shadow-red-500/10"
                  >
                    确认删除
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {alertState.open && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-500 font-bold">
                  <Info className="w-5 h-5" />
                  <span>{alertState.title || '系统提示'}</span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">{alertState.message}</p>
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={() => setAlertState(prev => ({ ...prev, open: false }))}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-md"
                  >
                    知道啦
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {datasetModalConfig.open && (
          <DatasetModal 
            config={datasetModalConfig}
            onClose={() => setDatasetModalConfig({ open: false })}
          />
        )}
        {exportDatasetModalConfig.open && (
          <ExportDatasetModal 
            config={exportDatasetModalConfig}
            onClose={() => setExportDatasetModalConfig({ open: false, datasets: [] })}
          />
        )}
        {importModalConfig.open && (
          <ImportModal
            config={importModalConfig}
            onClose={() => setImportModalConfig({ open: false })}
            onImport={async (data) => {
              const newTaskId = `${importModalConfig.type === 'image' ? 'IMG' : 'VID'}-TASK-${Math.floor(Math.random() * 1000)}`;
              
              // Load any persistent source files uploaded during dataset creation
              let loadedFiles: any[] = [];
              try {
                loadedFiles = await getIndexedDBFile(`dataset_loaded_files_${data.datasetId}`) || [];
              } catch (err) {
                console.error(err);
              }

              // File count calculation
              const computedFileCount = loadedFiles.length > 0 ? loadedFiles.length : (data.fileCount || 5);

              const newTask = {
                id: newTaskId,
                name: data.name,
                total: computedFileCount,
                completed: 0,
                status: 'pending',
                extractStatus: importModalConfig.type === 'video' ? 'pending' : undefined,
                time: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0].slice(0, 5)
              };
              
              if (importModalConfig.type === 'image') {
                setImageTasks([newTask, ...imageTasks]);
                if (loadedFiles.length > 0) {
                  const generatedImageFiles = loadedFiles.map((f: any, idx: number) => {
                    const fileId = Date.now() + idx + Math.floor(Math.random() * 1000);
                    if (f.url) {
                      saveIndexedDBFile(`file_url_${fileId}`, f.url);
                    }
                    return {
                      id: fileId,
                      taskId: newTaskId,
                      name: f.name,
                      status: 'pending',
                      url: f.url
                    };
                  });
                  setImageFiles((prev: any) => [...prev, ...generatedImageFiles]);
                } else {
                  const generatedImageFiles = Array.from({ length: computedFileCount }).map((_, idx) => ({
                    id: Date.now() + idx + Math.floor(Math.random() * 1000),
                    taskId: newTaskId,
                    name: `${data.name || 'image'}_${idx + 1}.jpg`,
                    status: 'pending'
                  }));
                  setImageFiles((prev: any) => [...prev, ...generatedImageFiles]);
                }
              } else {
                setVideoTasks([newTask, ...videoTasks]);
                if (loadedFiles.length > 0) {
                  const generatedVideoFiles = loadedFiles.map((f: any, idx: number) => {
                    const fileId = Date.now() + idx + Math.floor(Math.random() * 1000);
                    if (f.url) {
                      saveIndexedDBFile(`file_url_${fileId}`, f.url);
                    }
                    return {
                      id: fileId,
                      taskId: newTaskId,
                      name: f.name,
                      status: 'pending',
                      extractStatus: 'pending',
                      strategy: null,
                      totalFrames: 0,
                      url: f.url
                    };
                  });
                  setVideoFiles((prev: any) => [...prev, ...generatedVideoFiles]);
                } else {
                  const generatedVideoFiles = Array.from({ length: computedFileCount }).map((_, idx) => ({
                    id: Date.now() + idx + Math.floor(Math.random() * 1000),
                    taskId: newTaskId,
                    name: `${data.name || 'video'}_${idx + 1}.mp4`,
                    status: 'pending',
                    extractStatus: 'pending',
                    strategy: null,
                    totalFrames: 0
                  }));
                  setVideoFiles((prev: any) => [...prev, ...generatedVideoFiles]);
                }
              }

              // Link task to dataset
              if (data.datasetId) {
                setDatasets(prev => prev.map(ds => 
                  ds.id === data.datasetId 
                    ? { ...ds, taskIds: [...ds.taskIds, newTaskId], dataCount: computedFileCount } 
                    : ds
                ));
              }
              showAlert('任务创建成功', `成功创建标注任务: ${data.name}`);
            }}
          />
        )}
        {statsModalConfig.open && (
          <StatsModal 
            task={statsModalConfig.task}
            onClose={() => setStatsModalConfig({ open: false })}
          />
        )}

        {(() => {
          if (view === 'imageEditor') return renderImageEditor();
          if (view === 'videoEditor') return renderVideoEditor();
          if (view === 'videoDetail') return renderVideoDetail();
          if (view === 'datasetMgmt') return renderDatasetMgmt();

          switch (activeSubTab) {
            case 'img-anno': return renderImageAnnotationList();
            case 'video-anno': return renderVideoAnnotationList();
            case 'dataset-mgmt': return renderDatasetMgmt();
            default: return renderAnnotationManagement();
          }
        })()}
        {extractModalOpen && (
          <ExtractModal 
            video={selectedVideo}
            onClose={() => setExtractModalOpen(false)}
          />
        )}
      </>
    );
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
