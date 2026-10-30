/**
 * 猜下一步的状态机：按一道 Puzzle 依次回答每一问，答对连对加一，答错清零并讲解。
 * 一道题答完看结局，再换下一道（连对和过关保留）。
 */
import type { Msg, Puzzle, SoundName } from '../types';

export type PredictPhase = 'ask' | 'wrong' | 'right' | 'end';

export interface PredictState<V, T> {
  puzzle: Puzzle<V, T>;
  goal: number;
  /** 当前第几问 */
  i: number;
  phase: PredictPhase;
  /** 答错的那次点了什么（只有 pick 类的问才记，画面用来标出点错的格子） */
  picked: T | null;
  streak: number;
  passed: boolean;
  /** 刚才那一问是不是答对的（结局可以按它换一句） */
  lastRight: boolean;
}

export interface PredictOut<V, T> {
  state: PredictState<V, T>;
  sound?: SoundName;
}

export function startPredict<V, T>(puzzle: Puzzle<V, T>, goal = 5, carry?: { streak: number; passed: boolean }): PredictState<V, T> {
  return { puzzle, goal, i: 0, phase: 'ask', picked: null, streak: carry?.streak ?? 0, passed: carry?.passed ?? false, lastRight: false };
}

/** 换下一道题：连对和过关保留 */
export function nextPuzzle<V, T>(s: PredictState<V, T>, puzzle: Puzzle<V, T>): PredictState<V, T> {
  return startPredict(puzzle, s.goal, s);
}

/** 这一问答完了，进入下一问；没有下一问就看结局 */
function advance<V, T>(s: PredictState<V, T>): PredictState<V, T> {
  const last = s.i >= s.puzzle.asks.length - 1;
  return last ? { ...s, phase: 'end', picked: null } : { ...s, i: s.i + 1, phase: 'ask', picked: null };
}

/** 孩子答了一下（点了画面上的东西或选了选项）。此刻不接受就返回 null */
export function answer<V, T>(s: PredictState<V, T>, value: T): PredictOut<V, T> | null {
  if (s.phase !== 'ask') return null;
  const ask = s.puzzle.asks[s.i];
  if (!Object.is(value, ask.answer)) {
    return { state: { ...s, phase: 'wrong', streak: 0, lastRight: false, picked: ask.kind === 'pick' ? value : null }, sound: 'wrong' };
  }
  const streak = s.streak + 1;
  const justPassed = streak >= s.goal && !s.passed;
  const hit = { ...s, streak, lastRight: true, passed: s.passed || justPassed };
  return {
    state: ask.right ? { ...hit, phase: 'right' } : advance(hit),
    sound: justPassed ? 'win' : 'right',
  };
}

/** 看完解释（「知道了，继续」）或看完答对的讲解（「下一题」）后往下走 */
export function proceed<V, T>(s: PredictState<V, T>): PredictState<V, T> | null {
  return s.phase === 'wrong' || s.phase === 'right' ? advance(s) : null;
}

/** 此刻要画的东西 */
export interface PredictView<V, T> {
  view: V;
  prompt: Msg;
  wrong: Msg | null;
  right: Msg | null;
  ended: boolean;
  /** 画面此刻能不能点（pick 类的问在等回答） */
  pickable: boolean;
  /** 选项（choose 类的问在等回答时才有） */
  options: { value: T; label: Msg }[] | null;
  picked: T | null;
}

export function viewOf<V, T>(s: PredictState<V, T>): PredictView<V, T> {
  if (s.phase === 'end') {
    const { view, prompt } = (s.lastRight && s.puzzle.endRight) || s.puzzle.end;
    return { view, prompt, wrong: null, right: null, ended: true, pickable: false, options: null, picked: null };
  }
  const ask = s.puzzle.asks[s.i];
  const asking = s.phase === 'ask';
  const shown = s.phase === 'wrong' && ask.reveal ? ask.reveal : ask;
  return {
    view: shown.view,
    prompt: shown.prompt,
    wrong: s.phase === 'wrong' ? ask.why : null,
    right: s.phase === 'right' ? (ask.right ?? null) : null,
    ended: false,
    pickable: asking && ask.kind === 'pick',
    options: asking && ask.kind === 'choose' ? (ask.options ?? []) : null,
    picked: s.picked,
  };
}
