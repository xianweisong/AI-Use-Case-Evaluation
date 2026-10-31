export function parseTaskConfig(value: string): Record<string, unknown> {
  if (value.length > 100000) throw new Error('测试配置不能超过 100KB');
  const config = JSON.parse(value);
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('测试配置必须是 JSON 对象');
  }
  const stack: {value: any; depth: number}[] = [{ value: config, depth: 0 }];
  let nodes = 0;
  while (stack.length) {
    const item = stack.pop()!;
    if (++nodes > 10000 || item.depth > 32) throw new Error('测试配置过于复杂，最多支持 32 层和 10000 个值');
    if (item.value && typeof item.value === 'object') Object.values(item.value).forEach(value => stack.push({value, depth: item.depth + 1}));
  }
  return config;
}

export function createTaskInput(form: { name: string; type: string; target: string; config: string }) {
  if (!form.name.trim() || !form.target.trim()) throw new Error('请填写任务名称和测试对象');
  parseTaskConfig(form.config);
  return { ...form, name: form.name.trim(), target: form.target.trim() };
}

export function compareSampleResponses(base: unknown, target: unknown) {
  const flatten = (value: unknown, path = '$', out = new Map<string, unknown>(), depth = 0) => {
    if (depth > 32 || out.size > 10000) throw new Error('样例结构过于复杂，无法比较');
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length) {
      Object.entries(value).forEach(([key, item]) => flatten(item, `${path}[${JSON.stringify(key)}]`, out, depth + 1));
    } else out.set(path, value);
    return out;
  };
  const a = flatten(base); const b = flatten(target);
  return [...new Set([...a.keys(), ...b.keys()])].filter(path => !a.has(path) || !b.has(path) || JSON.stringify(a.get(path)) !== JSON.stringify(b.get(path))).map(path => {
    const type = !a.has(path) ? 'added' : !b.has(path) ? 'deleted' : 'modified';
    return { path, method: 'JSON', type, impact: type === 'deleted' ? 'breaking' : type === 'added' ? 'none' : 'low', description: `${JSON.stringify(a.get(path)) ?? '不存在'} → ${JSON.stringify(b.get(path)) ?? '不存在'}` };
  });
}
