import { isWall, type DfsStep, type Maze } from '../../engine/dfs';
import type { Tone } from './Grid.vue';

/** 山洞里每个格子是不是岩石 */
export function wallsOf(m: Maze): boolean[] {
  return Array.from({ length: m.w * m.h }, (_, id) => isWall(m, id));
}

/** 探险家 🧭、宝藏 💎 的位置；crumbs 里为真的格子（没有别的 emoji 时）画面包屑 🍞 */
export function emojisOf(m: Maze, hero: number | null, crumbs: boolean[] = []): Record<number, string> {
  const e: Record<number, string> = {};
  crumbs.forEach((v, id) => {
    if (v) e[id] = '🍞';
  });
  e[m.end] = '💎';
  if (hero !== null) e[hero] = '🧭';
  return e;
}

/**
 * 逐步执行和找 bug 共用：把一步的状态画成格子的色调。
 * 调用栈里的格子是「现在这条路」，其余 visited 的是走过又退回来的。
 */
export function stepTones(s: DfsStep, m: Maze): Record<number, Tone> {
  const t: Record<number, Tone> = {};
  s.visited.forEach((v, id) => {
    if (v) t[id] = 'crumb';
  });
  for (const [r, c] of s.stack) {
    if (r >= 0 && r < m.h && c >= 0 && c < m.w) t[r * m.w + c] = 'path';
  }
  if (s.cur !== null) t[s.cur] = 'cur';
  return t;
}

/** 已访问格子上写它是第几个被标记的 */
export function stepLabels(s: DfsStep): Record<number, number> {
  const l: Record<number, number> = {};
  s.order.forEach((id, k) => {
    if (s.visited[id]) l[id] = k + 1;
  });
  return l;
}
