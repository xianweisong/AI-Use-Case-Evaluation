export type FrameStrategy = 'fps' | 'interval' | 'total';
export interface FramePlan { strategy: FrameStrategy; value: number; maxFrames?: number }
export interface ExtractedFrame { blob: Blob; time: number; width: number; height: number }

/** Plans actual seek positions without fabricating frames beyond a video's finite duration. */
export function planFrameTimes(duration: number, plan: FramePlan): number[] {
  const max = plan.maxFrames ?? 300;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('视频时长无效或不可读取');
  if (!Number.isFinite(plan.value) || plan.value <= 0) throw new Error('抽帧参数必须是正数');
  if (!Number.isInteger(max) || max < 1 || max > 300) throw new Error('最大帧数必须在 1 至 300 之间');
  if (plan.strategy === 'total' && !Number.isInteger(plan.value)) throw new Error('总帧数必须是整数');
  if (!['fps', 'interval', 'total'].includes(plan.strategy)) throw new Error('抽帧策略不支持');
  const count = plan.strategy === 'total' ? plan.value : Math.ceil(duration / (plan.strategy === 'fps' ? 1 / plan.value : plan.value));
  if (!Number.isFinite(count) || count < 1 || count > max) throw new Error(`抽帧数量超过上限 ${max}，请降低频率或数量`);
  const step = plan.strategy === 'total' ? duration / count : plan.strategy === 'fps' ? 1 / plan.value : plan.value;
  return Array.from({ length: count }, (_, index) => Math.min(index * step, Math.max(0, duration - 0.001)));
}

function waitForVideo(video: HTMLVideoElement, event: 'loadedmetadata' | 'loadeddata' | 'seeked', timeoutMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { video.removeEventListener(event, done); video.removeEventListener('error', failed); signal?.removeEventListener('abort', aborted); clearTimeout(timer); };
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error('视频无法解码或编码不受支持')); };
    const aborted = () => { cleanup(); reject(new Error('抽帧已取消')); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('视频读取或定位超时')); }, timeoutMs);
    video.addEventListener(event, done, { once: true });
    video.addEventListener('error', failed, { once: true });
    signal?.addEventListener('abort', aborted, { once: true });
    if (signal?.aborted) aborted();
  });
}

function canvasBlob(canvas: HTMLCanvasElement, timeoutMs: number, signal?: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (result: Blob | Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', aborted);
      result instanceof Error ? reject(result) : resolve(result);
    };
    const aborted = () => finish(new Error('抽帧已取消'));
    const timer = setTimeout(() => finish(new Error('画布生成图片超时')), timeoutMs);
    signal?.addEventListener('abort', aborted, { once: true });
    if (signal?.aborted) { aborted(); return; }
    canvas.toBlob(value => finish(value ?? new Error('画布生成图片失败')), 'image/jpeg', 0.9);
  });
}

export async function extractVideoFrames(url: string, plan: FramePlan, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<ExtractedFrame[]> {
  if (!url.startsWith('blob:') && !url.startsWith('data:video/')) throw new Error('仅支持用户本地上传的视频地址');
  if (options.signal?.aborted) throw new Error('抽帧已取消');
  const timeoutMs = options.timeoutMs ?? 15000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('超时参数无效');
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  try {
    const metadata = waitForVideo(video, 'loadedmetadata', timeoutMs, options.signal);
    video.src = url;
    video.load();
    await metadata;
    const times = planFrameTimes(video.duration, plan);
    if (!video.videoWidth || !video.videoHeight) throw new Error('视频尺寸无效或编码不受支持');
    if (video.videoWidth * video.videoHeight > 16_000_000) throw new Error('视频画面超过 1600 万像素，请降低分辨率后重试');
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) await waitForVideo(video, 'loadeddata', timeoutMs, options.signal);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('浏览器不支持视频画布抽帧');
    const frames: ExtractedFrame[] = [];
    let totalBytes = 0;
    for (const time of times) {
      if (options.signal?.aborted) throw new Error('抽帧已取消');
      if (Math.abs(video.currentTime - time) > 0.001 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        const seeked = waitForVideo(video, 'seeked', timeoutMs, options.signal);
        video.currentTime = time;
        await seeked;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await canvasBlob(canvas, timeoutMs, options.signal);
      totalBytes += blob.size;
      if (totalBytes > 128 * 1024 * 1024) throw new Error('抽帧图片累计超过 128 MiB，请降低频率或帧数');
      frames.push({ blob, time, width: canvas.width, height: canvas.height });
    }
    return frames;
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}
