/**
 * 猜下一步的状态机：按一道 Puzzle 依次回答每一问，答对连对加一，答错清零并讲解。
 * 一道题答完看结局，再换下一道（连对和过关保留）。
 */
import { PAUSE_START, PAUSE_TICK } from '../timing';
import type { Msg, Puzzle, SoundName, Var } from '../types';

/** anim：这一问答完后播动画（Ask.anim），播完才进入下一问 */
export type PredictPhase = 'ask' | 'wrong' | 'right' | 'anim' | 'end';

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
  /** 动画播到第几帧（phase 是 anim 时才有意义） */
  frame: number;
}

export interface PredictOut<V, T> {
  state: PredictState<V, T>;
  sound?: SoundName;
}

export function startPredict<V, T>(puzzle: Puzzle<V, T>, goal = 5, carry?: { streak: number; passed: boolean }): PredictState<V, T> {
  return { puzzle, goal, i: 0, phase: 'ask', picked: null, streak: carry?.streak ?? 0, passed: carry?.passed ?? false, frame: 0 };
}

/** 换下一道题：连对和过关保留 */
export function nextPuzzle<V, T>(s: PredictState<V, T>, puzzle: Puzzle<V, T>): PredictState<V, T> {
  return startPredict(puzzle, s.goal, s);
}

/** 进入下一问；没有下一问就看结局 */
function step<V, T>(s: PredictState<V, T>): PredictState<V, T> {
  const last = s.i >= s.puzzle.asks.length - 1;
  return last ? { ...s, phase: 'end', picked: null, frame: 0 } : { ...s, i: s.i + 1, phase: 'ask', picked: null, frame: 0 };
}

/** 这一问答完了：有动画先播动画，否则进入下一问 */
function advance<V, T>(s: PredictState<V, T>): PredictState<V, T> {
  return s.puzzle.asks[s.i].anim ? { ...s, phase: 'anim', picked: null, frame: 0 } : step(s);
}

/** 动画到点了：换下一帧，播完进入下一问。此刻不在播动画就返回 null */
export function tickAnim<V, T>(s: PredictState<V, T>): PredictState<V, T> | null {
  if (s.phase !== 'anim') return null;
  const frames = s.puzzle.asks[s.i].anim!.frames;
  return s.frame < frames.length - 1 ? { ...s, frame: s.frame + 1 } : step(s);
}

/** 下一帧过多少毫秒到：开头停一下，之后按节拍。不在播动画返回 null */
export function animDelay<V, T>(s: PredictState<V, T>): number | null {
  return s.phase === 'anim' ? (s.frame === 0 ? PAUSE_START : PAUSE_TICK) : null;
}

/** 孩子答了一下（点了画面上的东西或选了选项）。此刻不接受就返回 null */
export function answer<V, T>(s: PredictState<V, T>, value: T): PredictOut<V, T> | null {
  if (s.phase !== 'ask') return null;
  const ask = s.puzzle.asks[s.i];
  if (!Object.is(value, ask.answer)) {
    return { state: { ...s, phase: 'wrong', streak: 0, picked: ask.kind === 'pick' ? value : null }, sound: 'wrong' };
  }
  const streak = s.streak + 1;
  const justPassed = streak >= s.goal && !s.passed;
  const hit = { ...s, streak, passed: s.passed || justPassed };
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
  /** 选项（choose 类的问在等回答时才有；pick 类的问给了补充按钮时也有） */
  options: { value: T; label: Msg; aria?: Msg }[] | null;
  picked: T | null;
  /** 这一问时顶上的变量标签；问或结局没给就用整道题的 */
  chips: Var[] | undefined;
}

export function viewOf<V, T>(s: PredictState<V, T>): PredictView<V, T> {
  if (s.phase === 'anim') {
    const ask = s.puzzle.asks[s.i];
    const a = ask.anim!;
    return { view: a.frames[s.frame], prompt: a.prompt, wrong: null, right: null, ended: false, pickable: false, options: null, picked: null, chips: ask.chips ?? s.puzzle.chips };
  }
  if (s.phase === 'end') {
    const { view, prompt, chips } = s.puzzle.end;
    return { view, prompt, wrong: null, right: null, ended: true, pickable: false, options: null, picked: null, chips: chips ?? s.puzzle.chips };
  }
  const ask = s.puzzle.asks[s.i];
  const asking = s.phase === 'ask';
  const shown = s.phase === 'wrong' && ask.reveal ? ask.reveal : ask;
  return {
    view: shown.view,
    prompt: shown.prompt,
    wrong: s.phase === 'wrong' ? (ask.whyFor && s.picked !== null ? ask.whyFor(s.picked) : ask.why) : null,
    right: s.phase === 'right' ? (ask.right ?? null) : null,
    ended: false,
    pickable: asking && ask.kind === 'pick',
    options: asking && (ask.kind === 'choose' || ask.options) ? (ask.options ?? []) : null,
    picked: s.picked,
    chips: ask.chips ?? s.puzzle.chips,
  };
}
