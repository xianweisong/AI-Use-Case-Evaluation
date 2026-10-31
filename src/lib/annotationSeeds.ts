// Restored catalog entries from the original annotation demo. These are examples,
// not uploaded files, decoded video frames, or evidence of a completed export.
export const annotationSeedVersion = 'restore-original-data-v1';

export const imageTaskSeeds = [
  { id: 'IMG-TASK-001', name: '人脸识别评测集', total: 5, completed: 3, status: 'annotating', time: '2026-03-01 10:00', demo: true },
  { id: 'IMG-TASK-002', name: '车辆特征库', total: 3, completed: 3, status: 'completed', time: '2026-03-01 10:05', demo: true },
  { id: 'IMG-TASK-003', name: '行人属性标注', total: 3, completed: 0, status: 'pending', time: '2026-03-01 10:10', demo: true },
];

export const videoTaskSeeds = [
  { id: 'VID-TASK-001', name: '交通违法行为识别', total: 3, completed: 1, status: 'annotating', extractStatus: 'partial', time: '2026-03-01 09:00', demo: true },
  { id: 'VID-TASK-002', name: '安防监控异常检测', total: 2, completed: 2, status: 'completed', extractStatus: 'completed', time: '2026-03-01 11:15', demo: true },
];

export const datasetSeeds = [
  { id: 'DS-001', name: '标准人脸库-V1', type: 'image' as const, taskIds: ['IMG-TASK-001'], createdAt: '2026-02-15', dataCount: 5, demo: true },
  { id: 'DS-002', name: '城市交通监控-夜间', type: 'video' as const, taskIds: ['VID-TASK-001'], createdAt: '2026-02-20', dataCount: 3, demo: true },
  { id: 'DS-003', name: '违停车辆抓拍集', type: 'image' as const, taskIds: ['IMG-TASK-002'], createdAt: '2026-03-01', dataCount: 3, demo: true },
  { id: 'DS-004', name: '安防监控异常检测集', type: 'video' as const, taskIds: ['VID-TASK-002'], createdAt: '2026-03-02', dataCount: 2, demo: true },
];

export const exportHistorySeeds = [
  { id: 'EXP-001', datasetName: '标准人脸库-V1', format: 'COCO', status: 'completed' as const, time: '2026-03-03 10:00', downloadUrl: '#', demo: true },
  { id: 'EXP-002', datasetName: '违停车辆抓拍集', format: 'YOLO', status: 'processing' as const, time: '2026-03-03 11:30', demo: true },
];

export const imageFileSeeds = [
  { id: 101, taskId: 'IMG-TASK-001', name: 'face_detection_001.jpg', status: 'completed', demo: true, url: '/demo-annotation/face.svg', width: 800, height: 600 },
  { id: 102, taskId: 'IMG-TASK-001', name: 'face_detection_002.jpg', status: 'completed', demo: true, url: '/demo-annotation/face.svg', width: 800, height: 600 },
  { id: 103, taskId: 'IMG-TASK-001', name: 'face_detection_003.jpg', status: 'completed', demo: true, url: '/demo-annotation/face.svg', width: 800, height: 600 },
  { id: 104, taskId: 'IMG-TASK-001', name: 'passenger_face_004.jpg', status: 'pending', demo: true, url: '/demo-annotation/face.svg', width: 800, height: 600 },
  { id: 105, taskId: 'IMG-TASK-001', name: 'driver_face_005.jpg', status: 'pending', demo: true, url: '/demo-annotation/face.svg', width: 800, height: 600 },
  { id: 201, taskId: 'IMG-TASK-002', name: 'sedan_red_001.jpg', status: 'completed', demo: true, url: '/demo-annotation/vehicle.svg', width: 800, height: 600 },
  { id: 202, taskId: 'IMG-TASK-002', name: 'suv_black_002.jpg', status: 'completed', demo: true, url: '/demo-annotation/vehicle.svg', width: 800, height: 600 },
  { id: 203, taskId: 'IMG-TASK-002', name: 'truck_white_003.jpg', status: 'completed', demo: true, url: '/demo-annotation/vehicle.svg', width: 800, height: 600 },
  { id: 301, taskId: 'IMG-TASK-003', name: 'pedestrian_street_001.jpg', status: 'pending', demo: true, url: '/demo-annotation/pedestrian.svg', width: 800, height: 600 },
  { id: 302, taskId: 'IMG-TASK-003', name: 'pedestrian_crossing_002.jpg', status: 'pending', demo: true, url: '/demo-annotation/pedestrian.svg', width: 800, height: 600 },
  { id: 303, taskId: 'IMG-TASK-003', name: 'pedestrian_mall_003.jpg', status: 'pending', demo: true, url: '/demo-annotation/pedestrian.svg', width: 800, height: 600 },
];

export const videoFileSeeds = [
  { id: 1, taskId: 'VID-TASK-001', name: 'VIDEO_001.mp4', status: 'completed', extractStatus: 'ready', strategy: 'fps', fps: 5, totalFrames: 12, demo: true },
  { id: 2, taskId: 'VID-TASK-001', name: 'VIDEO_002.mp4', status: 'pending', extractStatus: 'pending', strategy: null, totalFrames: 0, demo: true },
  { id: 3, taskId: 'VID-TASK-001', name: 'VIDEO_003.mp4', status: 'pending', extractStatus: 'extracting', strategy: 'interval', interval: 10, totalFrames: 15, demo: true },
  { id: 4, taskId: 'VID-TASK-002', name: 'MONITOR_001.mp4', status: 'completed', extractStatus: 'ready', strategy: 'fps', fps: 10, totalFrames: 18, demo: true },
  { id: 5, taskId: 'VID-TASK-002', name: 'MONITOR_002.mp4', status: 'completed', extractStatus: 'ready', strategy: 'total', total: 10, totalFrames: 10, demo: true },
];

export const annotationSeeds: Record<string, Array<{ id: string; x: number; y: number; width: number; height: number; label: string; color: string }>> = {
  img_101: [{ id: '101-1', x: 100, y: 150, width: 200, height: 150, label: '人脸', color: '#3b82f6' }],
  img_102: [{ id: '102-1', x: 200, y: 100, width: 150, height: 180, label: '车辆', color: '#10b981' }],
  img_103: [{ id: '103-1', x: 150, y: 220, width: 180, height: 120, label: '车牌', color: '#f59e0b' }],
  img_201: [{ id: '201-1', x: 50, y: 80, width: 300, height: 250, label: '车辆', color: '#10b981' }],
  img_202: [{ id: '202-1', x: 120, y: 150, width: 220, height: 170, label: '行人', color: '#ef4444' }],
  img_203: [{ id: '203-1', x: 180, y: 200, width: 140, height: 110, label: '车牌', color: '#f59e0b' }],
  vid_1_0: [{ id: 'vid1-1', x: 100, y: 120, width: 250, height: 180, label: '车辆', color: '#10b981' }],
  vid_4_0: [{ id: 'vid4-1', x: 120, y: 140, width: 200, height: 150, label: '车辆', color: '#10b981' }],
  vid_5_0: [{ id: 'vid5-1', x: 150, y: 110, width: 220, height: 160, label: '行人', color: '#ef4444' }],
};
