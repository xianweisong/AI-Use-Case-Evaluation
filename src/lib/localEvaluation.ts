import { parseTaskConfig } from './taskConfig';

export interface LocalCheck { item: string; result: 'success' | 'failed'; cost: string; error: string }
export interface LocalRun { mode: 'local-sample'; checks: LocalCheck[]; durationMs: number; passed: number; failed: number }

/** Isolated, local fixture validation. Never calls a network or evaluates submitted code. */
export function runLocalEvaluation(task: { type: string; config?: string }): LocalRun {
  const config = parseTaskConfig(task.config || '{}');
  const checks: LocalCheck[] = [];
  const begin = performance.now();
  const check = (item: string, action: () => boolean) => {
    const start = performance.now();
    let passed = false; let error = '-';
    try { passed = action(); if (!passed) error = '样例断言不匹配'; }
    catch (e) { error = e instanceof Error ? e.message : '校验失败'; }
    checks.push({ item, result: passed ? 'success' : 'failed', cost: `${(performance.now() - start).toFixed(2)}ms`, error });
  };
  if (task.type === 'UI测试') {
    const html = typeof config.html === 'string' ? config.html : '<form><input name="query"/><button type="submit">查询</button></form>';
    if (html.length > 100_000) throw new Error('样例 HTML 不能超过 100KB');
    // Template contents stay inert and cannot fetch image/iframe resources.
    const template = document.createElement('template');
    template.innerHTML = html;
    const doc = template.content;
    check('隔离 HTML 样例：表单存在', () => !!doc.querySelector('form'));
    check('隔离 HTML 样例：输入控件存在', () => !!doc.querySelector('input,textarea,select'));
    check('隔离 HTML 样例：目标元素存在', () => !!doc.querySelector(typeof config.selector === 'string' ? config.selector : 'button'));
  } else if (task.type === '性能测试') {
    const count = Number(config.iterations ?? 1000);
    if (!Number.isInteger(count) || count < 1 || count > 10000) throw new Error('本地样例迭代次数应为 1–10000');
    const input = JSON.stringify(config.sampleResponse ?? { status: 'OK', data: [1, 2, 3] });
    if (input.length > 100_000) throw new Error('样例数据不能超过 100KB');
    check(`本地 JSON 解析 ${count} 次（非服务端压测）`, () => {
      for (let i = 0; i < count; i++) JSON.parse(input);
      return true;
    });
  } else {
    const response: any = config.sampleResponse ?? { status: 'OK', data: { faces: [] } };
    check('隔离接口样例：状态码', () => Number(config.sampleStatus ?? 200) === Number(config.expectedStatus ?? 200));
    check('隔离接口样例：status 字段', () => response?.status === (config.expectedStatusText ?? 'OK'));
    check('隔离接口样例：faces 数组', () => Array.isArray(response?.data?.faces));
  }
  const passed = checks.filter(c => c.result === 'success').length;
  return { mode: 'local-sample', checks, durationMs: performance.now() - begin, passed, failed: checks.length - passed };
}

export function readLocalArray<T>(key: string, fallback: T[]): T[] {
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(value) ? value : fallback; }
  catch { return fallback; }
}

export function saveLocalArray(key: string, value: unknown[]): void {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event('platform-local-data'));
}
