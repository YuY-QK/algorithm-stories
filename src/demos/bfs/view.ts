import { L, type BfsStep } from '../../engine/bfs';
import type { Tone } from './Maze.vue';

/** 逐步执行和找 bug 共用：把一步的状态画成格子的色调 */
export function stepTones(s: BfsStep): Record<number, Tone> {
  const t: Record<number, Tone> = {};
  s.visited.forEach((v, id) => {
    if (v) t[id] = 'old';
  });
  for (const id of s.queue) t[id] = 'queued';
  if (s.cur !== null) t[s.cur] = 'cur';
  if (s.nb !== null) t[s.nb] = 'nb';
  return t;
}

/** 已访问格子上写 dist；第 18 行刚标记、还没写 dist 的邻居写「?」 */
export function stepLabels(s: BfsStep): Record<number, string | number> {
  const l: Record<number, string | number> = {};
  s.visited.forEach((v, id) => {
    if (v) l[id] = s.line === L.mark && id === s.nb && s.dist[id] === 0 ? '?' : s.dist[id];
  });
  return l;
}
