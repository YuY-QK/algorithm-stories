import type { Step, Trace } from './types';

/* ---------- 初级：排队拍合照 ---------- */

export const KID_NAMES = ['小明', '小红', '小刚', '小美', '小天', '小雨', '小乐', '小安'];

/** n 个互不相同的身高（厘米） */
export function kidHeights(n: number, rand: () => number = Math.random): number[] {
  const pool: number[] = [];
  for (let h = 112; h <= 150; h += 2) pool.push(h);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

export type KidChoice = 'swap' | 'keep';

/** 初级状态：a 当前队伍，j 正在看的一对的左边下标，end 及之后已排好 */
export interface KidState<T> {
  a: T[];
  j: number;
  end: number;
  swapped: boolean;
  compares: number;
  swaps: number;
  round: number;
  done: boolean;
  /** 刚走完一轮 */
  roundEnd: boolean;
}

export function kidInit<T>(people: T[]): KidState<T> {
  return { a: people.slice(), j: 0, end: people.length, swapped: false, compares: 0, swaps: 0, round: 1, done: people.length < 2, roundEnd: false };
}

export function kidNeed<T>(s: KidState<T>, key: (p: T) => number): KidChoice {
  return key(s.a[s.j]) > key(s.a[s.j + 1]) ? 'swap' : 'keep';
}

/** 答错返回 null，状态不变 */
export function kidStep<T>(s: KidState<T>, answer: KidChoice, key: (p: T) => number): KidState<T> | null {
  if (s.done) return s;
  const need = kidNeed(s, key);
  if (answer !== need) return null;
  const a = s.a.slice();
  let swapped = s.swapped;
  let swaps = s.swaps;
  if (need === 'swap') {
    [a[s.j], a[s.j + 1]] = [a[s.j + 1], a[s.j]];
    swapped = true;
    swaps++;
  }
  const n: KidState<T> = { a, j: s.j + 1, end: s.end, swapped, compares: s.compares + 1, swaps, round: s.round, done: false, roundEnd: false };
  if (n.j >= n.end - 1) {
    n.end--;
    n.roundEnd = true;
    if (!swapped || n.end <= 1) n.done = true;
    n.j = 0;
    n.swapped = false;
    n.round++;
  }
  return n;
}

/* ---------- 高级：逐步执行 ---------- */

export const CODE = [
  'def bubble_sort(a):',
  '    n = len(a)',
  '    for i in range(n - 1):',
  '        swapped = False',
  '        for j in range(n - 1 - i):',
  '            if a[j] > a[j + 1]:',
  '                a[j], a[j + 1] = a[j + 1], a[j]',
  '                swapped = True',
  '        if not swapped:',
  '            break',
  '    return a',
];

/** 「本轮结束」那一步对应的代码行，用于「跳到本轮结束」 */
export const ROUND_END_LINE = 9;

export type Shape = 'random' | 'nearly' | 'reversed';

export interface BubbleStep extends Step {
  a: number[];
  i: number | null;
  j: number | null;
  round: number;
  /** 这个下标及之后已经在最终位置 */
  sortedFrom: number;
  compares: number;
  swaps: number;
  swapped: boolean | null;
  /** 正在比较 a[j] 和 a[j+1] */
  cmp: boolean;
  /** 刚交换了 a[j] 和 a[j+1] */
  swap: boolean;
}

export function genArray(n: number, shape: Shape, rand: () => number = Math.random): number[] {
  const a: number[] = [];
  for (let i = 0; i < n; i++) a.push(Math.floor(rand() * 90) + 5);
  if (shape === 'reversed') a.sort((x, y) => y - x);
  if (shape === 'nearly' && n >= 2) {
    a.sort((x, y) => x - y);
    const k = Math.floor(rand() * (n - 1));
    [a[k], a[k + 1]] = [a[k + 1], a[k]];
  }
  return a;
}

export function buildTrace(input: number[]): Trace<BubbleStep> {
  const a = input.slice();
  const n = a.length;
  const steps: BubbleStep[] = [];
  let compares = 0, swaps = 0, sortedFrom = n, round = 0;
  let i: number | null = null, j: number | null = null, swapped: boolean | null = null;
  const push = (line: number, note: string, extra: Partial<BubbleStep> = {}) => {
    steps.push({ line, a: a.slice(), i, j, round, sortedFrom, compares, swaps, swapped, note, cmp: false, swap: false, done: false, ...extra });
  };

  push(2, 'n = ' + n + '。');
  for (i = 0; i < n - 1; i++) {
    round = i + 1;
    j = null;
    swapped = null;
    push(3, '第 ' + round + ' 轮：i = ' + i + '，前 ' + (n - i) + ' 个元素还没排好。');
    swapped = false;
    push(4, 'swapped = False，记录这一轮有没有交换过。');
    for (j = 0; j < n - 1 - i; j++) {
      push(5, 'j = ' + j + '，准备比较 a[' + j + '] 和 a[' + (j + 1) + ']。');
      compares++;
      const gt = a[j] > a[j + 1];
      push(6, 'a[' + j + '] = ' + a[j] + (gt ? ' > ' : ' ≤ ') + 'a[' + (j + 1) + '] = ' + a[j + 1] + (gt ? '，前面的大，要交换。' : '，顺序没问题，不换。'), { cmp: true });
      if (gt) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swaps++;
        push(7, '交换：现在 a[' + j + '] = ' + a[j] + '，a[' + (j + 1) + '] = ' + a[j + 1] + '。', { swap: true });
        swapped = true;
        push(8, 'swapped = True。');
      }
    }
    j = null;
    sortedFrom = n - 1 - i;
    push(9, swapped
      ? '这一轮交换过。最大的 ' + a[sortedFrom] + ' 已经冒到下标 ' + sortedFrom + '，它的位置定了。'
      : '这一轮一次都没交换，说明整个数组已经有序。');
    if (!swapped) {
      sortedFrom = 0;
      push(10, '提前退出，省下了后面 ' + (n - 2 - i) + ' 轮。');
      break;
    }
  }
  i = null;
  j = null;
  sortedFrom = 0;
  push(11, '返回。一共比较 ' + compares + ' 次，交换 ' + swaps + ' 次。', { done: true });
  return steps;
}
