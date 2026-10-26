/**
 * 逐步播放的状态机：当前第几步、速度、是否在自动播放。
 * 每个函数收旧状态，返回新状态和界面要做的事（出声、开关定时器），自己不碰定时器，也不依赖 Vue。
 * 界面（usePlayer）负责：timer 为 'start' 就按 state.speed 毫秒间隔调用 tick，'stop' 就清掉。
 */
import type { SoundName } from '../types';
import { MANUAL } from '../timing';

export interface PlayerState {
  idx: number;
  /** 总步数；步骤轨迹变了由界面更新 */
  total: number;
  /** 自动播放的间隔（毫秒），MANUAL 表示点一下走一步 */
  speed: number;
  playing: boolean;
}

export interface PlayerOut {
  state: PlayerState;
  sound?: SoundName;
  timer?: 'start' | 'stop';
}

export const initPlayer = (total: number, speed: number): PlayerState => ({ idx: 0, total, speed, playing: false });

export const atStart = (s: PlayerState) => s.idx === 0;
export const atEnd = (s: PlayerState) => s.idx >= s.total - 1;
export const isManual = (s: PlayerState) => s.speed === MANUAL;

/** 走到 idx：只在往后走一格时出「嗒」声（翻页、重置、往回退不出声） */
function go(s: PlayerState, idx: number): PlayerOut {
  return { state: { ...s, idx }, sound: idx === s.idx + 1 ? 'tick' : undefined };
}

const stopped = (s: PlayerState): PlayerState => ({ ...s, playing: false });

/** 定时器到点。走到最后一步后的下一次到点才停下 */
export function tick(s: PlayerState): PlayerOut {
  if (atEnd(s)) return { state: stopped(s), timer: 'stop' };
  return go(s, s.idx + 1);
}

export function toggle(s: PlayerState): PlayerOut {
  if (s.playing) return { state: stopped(s), timer: 'stop' };
  if (atEnd(s)) {
    // 到头了再点：回到开头，手动档不自动播放
    const back = { ...s, idx: 0 };
    return isManual(s) ? { state: back } : { state: { ...back, playing: true }, timer: 'start' };
  }
  if (isManual(s)) return next(s);
  return { state: { ...s, playing: true }, timer: 'start' };
}

export function next(s: PlayerState): PlayerOut {
  const out = atEnd(s) ? { state: s } : go(s, s.idx + 1);
  return { ...out, state: stopped(out.state), timer: 'stop' };
}

export function prev(s: PlayerState): PlayerOut {
  return { state: stopped({ ...s, idx: atStart(s) ? s.idx : s.idx - 1 }), timer: 'stop' };
}

export function reset(s: PlayerState): PlayerOut {
  return { state: stopped({ ...s, idx: 0 }), timer: 'stop' };
}

/** 停下，不动位置（切标签、卸载） */
export function stop(s: PlayerState): PlayerOut {
  return { state: stopped(s), timer: 'stop' };
}

/** 往后跳到第一个满足条件的步骤（按下标判断），找不到就停在最后一步 */
export function jumpTo(s: PlayerState, pred: (idx: number) => boolean): PlayerOut {
  let idx = s.idx;
  while (idx < s.total - 1) {
    idx++;
    if (pred(idx)) break;
  }
  const out = go(s, idx);
  return { ...out, state: stopped(out.state), timer: 'stop' };
}

/** 换速度档：正在播放就按新间隔重新开始，手动档则停下 */
export function setSpeed(s: PlayerState, speed: number): PlayerOut {
  const state = { ...s, speed };
  if (!s.playing) return { state };
  return speed === MANUAL ? { state: stopped(state), timer: 'stop' } : { state, timer: 'start' };
}

/** 步骤轨迹换了：回到第一步并停下 */
export function setTotal(s: PlayerState, total: number): PlayerOut {
  return { state: stopped({ ...s, idx: 0, total }), timer: 'stop' };
}
