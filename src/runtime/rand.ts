import type { Rand } from '../levels/types';

/**
 * 一个交互块用的随机源。平时就是 Math.random；
 * 页面文字快照（scripts/snapshot-text.cjs）会提供 __islandRandom，按块在页面上的位置给固定种子，
 * 这样各块加载的先后不影响结果。
 */
export function islandRand(el: Element | null): Rand {
  const hook = (globalThis as { __islandRandom?: (el: Element) => Rand }).__islandRandom;
  const island = el?.closest('astro-island');
  return hook && island ? hook(island) : Math.random;
}
