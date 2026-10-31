import { createInterfaceSample, type InterfaceSampleConfig, type SampleProtocol } from './interfaceSamples';

export interface HistoricalInterfaceSample extends InterfaceSampleConfig {
  legacyUrl?: string;
  legacyStatus: string;
  legacyTime: string;
  legacyApi?: string;
  legacyVersions?: number;
  legacyGroup: 'api' | 'version' | 'protocol';
  sample: true;
}

export function originalInterfaceSamples(): HistoricalInterfaceSample[] {
  const seed = (id: string, name: string, protocol: SampleProtocol, group: HistoricalInterfaceSample['legacyGroup'], meta: Partial<HistoricalInterfaceSample>) => ({
    ...createInterfaceSample(protocol), id, name, legacyStatus: 'none', legacyTime: '旧版示例', legacyGroup: group, sample: true as const, ...meta,
  });
  return [
    seed('legacy-api-face-detect', '人脸检测接口功能测试', 'HTTP', 'api', { legacyUrl: '/api/v1/face/detect', method: 'POST', legacyStatus: 'success' }),
    seed('legacy-api-vehicle-identify', '车辆识别接口连通性', 'HTTP', 'api', { legacyUrl: '/api/v1/vehicle/identify', method: 'GET', legacyStatus: 'failed' }),
    seed('legacy-api-track-query', '轨迹查询接口性能预检', 'HTTP', 'api', { legacyUrl: '/api/v1/track/query', method: 'POST', legacyStatus: 'none' }),
    seed('legacy-version-face', 'FaceAPI 多版本兼容性', 'HTTP', 'version', { legacyApi: '人脸检测接口', legacyVersions: 3, legacyStatus: 'success' }),
    seed('legacy-version-vehicle', 'VehicleAPI 升级回归测试', 'HTTP', 'version', { legacyApi: '车辆识别接口', legacyVersions: 2, legacyStatus: 'running' }),
    seed('legacy-protocol-https', 'HTTPS 安全协议适配', 'HTTP', 'protocol', { legacyApi: '人脸检测接口', legacyStatus: 'success' }),
    seed('legacy-protocol-http', 'HTTP 降级兼容测试', 'HTTP', 'protocol', { legacyApi: '车辆识别接口', legacyStatus: 'none' }),
    seed('legacy-protocol-ws', 'WebSocket 双向通信测试', 'WS', 'protocol', { legacyApi: '实时视频流推送', legacyStatus: 'running' }),
    seed('legacy-protocol-grpc', 'gRPC 接口性能评测', 'gRPC', 'protocol', { legacyApi: '特征向量检索服务', legacyStatus: 'success' }),
  ];
}
