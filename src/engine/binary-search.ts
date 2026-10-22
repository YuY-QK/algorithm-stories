import type { Step, Trace } from './types';

/* ---------- 初级：小邮差猜信箱 ---------- */

export type KidAnswer = 'smaller' | 'bigger' | 'hit';

export function kidGuess(lo: number, hi: number): number {
  return Math.floor((lo + hi) / 2);
}

/** 根据回答缩小范围；empty 表示回答前后矛盾，范围已空 */
export function kidNarrow(lo: number, hi: number, answer: KidAnswer) {
  const g = kidGuess(lo, hi);
  if (answer === 'bigger') lo = g + 1;
  else if (answer === 'smaller') hi = g - 1;
  return { lo, hi, empty: lo > hi };
}

/* ---------- 高级：逐步执行 ---------- */

export const CODE = [
  'def binary_search(arr, target):',
  '    lo, hi = 0, len(arr) - 1',
  '    while lo <= hi:',
  '        mid = lo + (hi - lo) // 2',
  '        if arr[mid] == target:',
  '            return mid',
  '        elif arr[mid] < target:',
  '            lo = mid + 1',
  '        else:',
  '            hi = mid - 1',
  '    return -1',
];

export interface BinaryStep extends Step {
  lo: number;
  hi: number;
  mid: number | null;
  /** 已经检查过的元素个数 */
  count: number;
  /** 找到的下标，没找到是 -1 */
  found: number;
}

/** 生成一个严格递增的随机数组 */
export function genArray(n: number, rand: () => number = Math.random): number[] {
  let v = Math.floor(rand() * 8) + 2;
  const a: number[] = [];
  for (let i = 0; i < n; i++) {
    a.push(v);
    v += Math.floor(rand() * 9) + 1;
  }
  return a;
}

/** 找一个不在数组里的值 */
export function missingValue(arr: number[]): number {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i + 1] - arr[i] > 1) return arr[i] + 1;
  }
  return arr[arr.length - 1] + 1;
}

export function buildTrace(arr: number[], target: number): Trace<BinaryStep> {
  const steps: BinaryStep[] = [];
  let lo = 0;
  let hi = arr.length - 1;
  let count = 0;
  const push = (line: number, note: string, extra: Partial<BinaryStep> = {}) => {
    steps.push({ line, lo, hi, mid: null, count, note, found: -1, done: false, ...extra });
  };

  push(2, '初始化：lo = 0，hi = ' + hi + '，整个数组都是候选范围。');
  while (true) {
    push(3, lo <= hi
      ? 'lo ≤ hi（' + lo + ' ≤ ' + hi + '），候选范围不为空，继续循环。'
      : 'lo > hi（' + lo + ' > ' + hi + '），候选范围已空，退出循环。');
    if (lo > hi) break;
    const mid = lo + Math.floor((hi - lo) / 2);
    count++;
    push(4, '取中点：mid = lo + (hi - lo) // 2 = ' + mid + '。', { mid });
    push(5, 'arr[' + mid + '] = ' + arr[mid] + '，等于目标 ' + target + ' 吗？', { mid });
    if (arr[mid] === target) {
      push(6, '相等，返回下标 ' + mid + '。', { mid, found: mid, done: true });
      return steps;
    }
    const less = arr[mid] < target;
    push(7, arr[mid] + (less ? ' < ' : ' > ') + target + '，目标在' + (less ? '右' : '左') + '半边。', { mid });
    if (less) {
      lo = mid + 1;
      push(8, '丢掉左半边：lo = mid + 1 = ' + lo + '。', { mid });
    } else {
      hi = mid - 1;
      push(10, '丢掉右半边：hi = mid - 1 = ' + hi + '。', { mid });
    }
  }
  push(11, '返回 -1，数组里没有 ' + target + '。', { done: true });
  return steps;
}
