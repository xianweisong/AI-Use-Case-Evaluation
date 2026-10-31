// Historical demo records from the original interface. These are examples, not evidence of execution.
const relativeDate = (days = 0, hours = 0, minutes = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(date.getHours() - hours);
  date.setMinutes(date.getMinutes() - minutes);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export function originalEvaluationTasks() {
  return [
    { id: 'TASK-001', name: '人脸识别精度测试', type: 'UI测试', target: 'FaceSDK-v2.1', status: 'completed', time: relativeDate(0, 2, 30), user: '张警官' },
    { id: 'TASK-002', name: '车辆识别接口压力测试', type: '接口测试', target: 'VehicleAPI-v1.0', status: 'running', time: relativeDate(0, 1, 15), user: '李警官' },
    { id: 'TASK-003', name: '视频流并发处理评测', type: '性能测试', target: 'StreamServer-v3', status: 'failed', time: relativeDate(0, 3, 45), user: '王警官' },
    { id: 'TASK-004', name: '移动端UI兼容性测试', type: 'UI测试', target: 'MobileApp-v1.2', status: 'pending', time: relativeDate(0, 0, 15), user: '赵警官' },
    { id: 'REP-001', name: '登录页面自动化测试', type: 'UI测试', target: '/login', page: '/login', status: 'completed', time: '2026-03-01 10:00', user: '示例' },
    { id: 'REP-004', name: '仪表盘组件渲染测试', type: 'UI测试', target: '/dashboard', page: '/dashboard', status: 'running', time: '2026-03-01 11:30', user: '示例' },
    { id: 'REP-002', name: '人脸特征提取API', type: '接口测试', target: '/api/v1/face/extract', method: 'POST', status: 'completed', time: '旧版示例', user: '示例' },
    { id: 'REP-005', name: '车辆轨迹查询API', type: '接口测试', target: '/api/v1/vehicle/track', method: 'GET', status: 'failed', time: '旧版示例', user: '示例' },
    { id: 'REP-003', name: '高并发视频流接入测试', type: '性能测试', target: 'StreamGateway-v2', concurrency: 500, status: 'completed', time: '旧版示例', user: '示例' },
    { id: 'REP-006', name: '数据库写入性能评测', type: '性能测试', target: 'PostgreSQL-Cluster', concurrency: 1000, status: 'running', time: '旧版示例', user: '示例' },
  ].map(task => ({ ...task, sample: true, config: '{}' }));
}

export function originalEvaluationReports() {
  return [
    { id: 'REP-001', name: '人脸识别精度测试', type: 'UI测试', result: '通过', time: relativeDate(0, 2, 45) },
    { id: 'REP-002', name: '车辆识别接口压力测试', type: '接口测试', result: '部分失败', time: relativeDate(0, 1, 30) },
    { id: 'REP-003', name: '视频流并发处理评测', type: '性能测试', result: '失败', time: relativeDate(0, 3, 0) },
    { id: 'REP-004', name: '仪表盘组件渲染测试', type: 'UI测试', result: '通过', time: relativeDate(0, 0, 45) },
    { id: 'REP-005', name: '车辆轨迹查询API', type: '接口测试', result: '失败', time: relativeDate(0, 1, 15) },
    { id: 'REP-006', name: '数据库写入性能评测', type: '性能测试', result: '通过', time: relativeDate(0, 4, 30) },
  ].map(report => ({ ...report, sample: true }));
}

export function originalWorkbenchTasks() {
  return [
    { id: 'T-1024', name: '人脸识别算法精度评测', type: '算法评测', status: 'running', progress: 65, user: '张警官', time: relativeDate(0, 0, 30), sample: true },
    { id: 'T-1023', name: '车辆特征提取性能测试', type: '性能测试', status: 'completed', progress: 100, user: '李警官', time: relativeDate(0, 1, 0), sample: true },
    { id: 'T-1022', name: '视频流接入稳定性校验', type: '接口评测', status: 'failed', progress: 42, user: '王警官', time: relativeDate(0, 2, 15), sample: true },
    { id: 'T-1021', name: '语义分割标注任务-03', type: '数据标注', status: 'pending', progress: 0, user: '赵警官', time: relativeDate(1), sample: true },
  ];
}
