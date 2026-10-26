/**
 * 找 bug 的状态机：选哪个坑、哪些已找到、点错了哪些行。
 * 播放有 bug 的代码怎么跑错用 player，这里只管「点出错的那一行」。
 */
import type { SoundName } from '../types';

export interface BugHuntState {
  which: string;
  solved: Record<string, boolean>;
  /** 每个坑里点错过的行 */
  tried: Record<string, number[]>;
  /** 刚点错的行（显示「不是第 N 行」），切换坑或答对后清掉 */
  miss: number | null;
}

export interface BugHuntOut {
  state: BugHuntState;
  sound?: SoundName;
}

export const startBugHunt = (firstId: string): BugHuntState => ({ which: firstId, solved: {}, tried: {}, miss: null });

export function choose(s: BugHuntState, id: string): BugHuntState {
  return id === s.which ? s : { ...s, which: id, miss: null };
}

/** 点了代码的第 line 行。这个坑已经找到了就不再理会 */
export function pick(s: BugHuntState, bug: { id: string; wrongLine: number }, line: number): BugHuntOut | null {
  if (s.solved[bug.id]) return null;
  if (line === bug.wrongLine) {
    return { state: { ...s, solved: { ...s.solved, [bug.id]: true }, miss: null }, sound: 'right' };
  }
  const tried = { ...s.tried, [bug.id]: [...(s.tried[bug.id] ?? []), line] };
  return { state: { ...s, tried, miss: line }, sound: 'wrong' };
}

/** 代码面板上各行的标记：点错的标红，找到的标绿 */
export function marks(s: BugHuntState, bug: { id: string; wrongLine: number }): Record<number, 'good' | 'bad'> {
  const m: Record<number, 'good' | 'bad'> = {};
  for (const l of s.tried[bug.id] ?? []) m[l] = 'bad';
  if (s.solved[bug.id]) m[bug.wrongLine] = 'good';
  return m;
}

export const solvedCount = (s: BugHuntState, ids: string[]) => ids.filter((id) => s.solved[id]).length;
