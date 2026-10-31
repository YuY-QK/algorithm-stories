/**
 * 小游戏里的播放控制条：把 flows/player.ts 的状态机接到 GameRules 的 Outcome 上。
 * 规则把 PlayerState 放在自己的状态里，收到 transport 控件的操作就调用 applyTransport，
 * 自动播放时每走一步由界面按 after 调用 tickTransport（和 usePlayer 的定时器等价）。
 */
import type { SoundName, TransportOp } from '../types';
import * as flow from './player';

export interface TransportOut {
  p: flow.PlayerState;
  sound?: SoundName;
  /** 正在自动播放：过这么多毫秒再走一步 */
  after?: number;
}

function wrap(out: flow.PlayerOut): TransportOut {
  return { p: out.state, sound: out.sound, after: out.state.playing && out.timer !== 'stop' ? out.state.speed : undefined };
}

export function applyTransport(p: flow.PlayerState, op: TransportOp): TransportOut {
  if (op === 'reset') return wrap(flow.reset(p));
  if (op === 'prev') return wrap(flow.prev(p));
  if (op === 'next') return wrap(flow.next(p));
  if (op === 'toggle') return wrap(flow.toggle(p));
  return wrap(flow.setSpeed(p, op.speed));
}

/** 自动播放到点了：走一步；已经到头就停下 */
export function tickTransport(p: flow.PlayerState): TransportOut {
  return wrap(flow.tick(p));
}

/** 换了一道题：回到第一步并停下，速度不变 */
export function resetTransport(p: flow.PlayerState, total: number): flow.PlayerState {
  return { ...p, idx: 0, total, playing: false };
}
