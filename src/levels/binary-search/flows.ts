/**
 * 二分查找的流程：两个小游戏、猜下一步、挑战、逐步执行的输入。都是纯函数，规则全在这里，画面组件只负责画和转发点击。
 */
import {
  CHALLENGE_LIMIT, CHALLENGE_MAX, KID_N, genArray, genChallenge, genPredict, middle, missingValue, narrow,
  pickSecret, pickTarget, pointTo, rounds, sideMsg, stars, type Dir, type Round,
} from '../../engine/binary-search';
import { streakHit, streakMiss, type Effect, type Flow, type Next, type PredictState } from '../types';
import { msgOf, type Msg } from '../../i18n/format';
import { PAUSE_LONG, PAUSE_MID, PAUSE_SHORT } from '../../components/shared/timing';
import type zh from '../../locales/zh/binary-search.json';

const msg = msgOf<typeof zh>();

/* ---------- 玩法一「藏信」 ---------- */

// 孩子先把信藏好盖上叶子，再给小邮差指路。答案一开始就固定了，
// 指错方向时藏信的信箱会透光，提示孩子自己再看一眼。
export type HidePhase = 'hide' | 'hiding' | 'guide' | 'walking' | 'done';

export interface HideState {
  phase: HidePhase;
  secret: number | null;
  lo: number;
  hi: number;
  /** 小邮差站在第几个信箱前，0 是街口 */
  at: number;
  doors: Record<number, Dir>;
  tries: number;
  /** 透光提示：[信箱, 第几次]，次数变了动画就重播一遍 */
  glow: [number, number] | null;
  say: Msg;
}

export type HideAction =
  | { type: 'hide'; i: number }
  /** 小邮差走到剩下范围的正中间（定时触发） */
  | { type: 'arrive'; say: 'coming' | 'walk' }
  /** 小邮差问「信在哪边」（定时触发） */
  | { type: 'ask' }
  | { type: 'answer'; d: Dir }
  | { type: 'again' };

const hideStart = (): HideState => ({
  phase: 'hide', secret: null, lo: 1, hi: KID_N, at: 0, doors: {}, tries: 0, glow: null, say: msg('play.hide.start'),
});

export const hideFlow: Flow<HideState, HideAction> = {
  init: hideStart,
  step(s, a): Next<HideState, HideAction> {
    switch (a.type) {
      case 'hide':
        if (s.phase !== 'hide') return s;
        return {
          state: { ...s, secret: a.i, phase: 'hiding', say: msg('play.hide.hidden') },
          effects: [{ sound: 'tap' }, { after: PAUSE_LONG, then: { type: 'arrive', say: 'coming' } }],
        };
      case 'arrive':
        return {
          state: { ...s, phase: 'walking', at: middle(s.lo, s.hi), say: msg(a.say === 'coming' ? 'play.hide.coming' : 'play.hide.walk') },
          effects: [{ sound: 'tick' }, { after: PAUSE_SHORT, then: { type: 'ask' } }],
        };
      case 'ask':
        return { ...s, phase: 'guide', tries: s.tries + 1, say: msg('play.hide.ask') };
      case 'answer': {
        if (s.phase !== 'guide' || s.secret === null) return s;
        const right = pointTo(s.secret, s.at);
        if (a.d !== right) {
          return {
            state: { ...s, glow: [s.secret, (s.glow?.[1] ?? 0) + 1], say: msg('play.hide.lookLeaf') },
            effects: [{ sound: 'wrong' }],
          };
        }
        const doors = { ...s.doors, [s.at]: a.d };
        if (a.d === 'hit') {
          return {
            state: { ...s, glow: null, phase: 'done', doors, say: msg('play.hide.found', { n: s.tries }) },
            effects: [{ sound: 'right' }, { sound: 'win' }],
          };
        }
        return {
          state: { ...s, glow: null, doors, ...narrow(s.lo, s.hi, s.at, a.d), phase: 'walking', say: msg(a.d === 'left' ? 'play.hide.skipRight' : 'play.hide.skipLeft') },
          effects: [{ sound: 'right' }, { after: PAUSE_MID, then: { type: 'arrive', say: 'walk' } }],
        };
      }
      case 'again':
        return hideStart();
    }
  },
  // 切换标签时，走到一半的动画作废，回到可以重新藏信
  interrupt: (s) => (s.phase === 'hiding' || s.phase === 'walking' ? hideStart() : s),
};

/* ---------- 玩法二「当小邮差」 ---------- */

// 信由程序藏好，孩子自己点信箱找。引导：点灰信箱会摇头；第一次排除时追问「灰色的还要看吗」；
// 连续两局不到三颗星，可以看小邮差的秘诀（正中间一闪一闪）；拿到三颗星后问「点哪里最快」，让孩子自己说出「中间」。
export interface FindState {
  secret: number;
  lo: number;
  hi: number;
  at: number;
  doors: Record<number, Dir>;
  tries: number;
  done: boolean;
  /** 摇头的信箱：[信箱, 第几次] */
  shake: [number, number] | null;
  say: Msg;
  /** 连续几局不到三颗星 */
  lowRounds: number;
  /** 是否打开了秘诀 */
  hint: boolean;
  /** 「点哪里最快」问过没有（只问一次） */
  asked: boolean;
  quiz: 'ask' | 'right' | 'wrong' | null;
  /** 「灰色的还要看吗」说过没有 */
  greyTold: boolean;
}

export type FindAction =
  | { type: 'tap'; i: number }
  | { type: 'quiz'; where: 'edge' | 'middle' }
  | { type: 'again' }
  | { type: 'hint'; on: boolean };

function findRound(s: FindState, secret: number): FindState {
  return {
    ...s, secret, lo: 1, hi: KID_N, at: 0, doors: {}, tries: 0, done: false,
    say: msg(s.hint ? 'play.find.againHint' : 'play.find.again'),
  };
}

export const findFlow: Flow<FindState, FindAction> = {
  init: (rand) => ({
    secret: pickSecret(rand), lo: 1, hi: KID_N, at: 0, doors: {}, tries: 0, done: false, shake: null,
    say: msg('play.find.start'), lowRounds: 0, hint: false, asked: false, quiz: null, greyTold: false,
  }),
  step(s, a, rand): Next<FindState, FindAction> {
    switch (a.type) {
      case 'tap': {
        if (s.done) return s;
        if (a.i < s.lo || a.i > s.hi) {
          return { state: { ...s, shake: [a.i, (s.shake?.[1] ?? 0) + 1], say: msg('play.find.greyNo') }, effects: [{ sound: 'wrong' }] };
        }
        const tries = s.tries + 1;
        const d = pointTo(s.secret, a.i);
        const doors = { ...s.doors, [a.i]: d };
        if (d === 'hit') {
          const done: FindState = { ...s, tries, at: a.i, doors, done: true, say: msg('play.find.found', { n: tries }) };
          const effects: Effect<FindAction>[] = [{ sound: 'win' }];
          if (stars(tries) < 3) return { state: { ...done, lowRounds: s.lowRounds + 1 }, effects };
          return { state: { ...done, lowRounds: 0, ...(s.asked ? {} : { asked: true, quiz: 'ask' as const }) }, effects };
        }
        return {
          state: {
            ...s, tries, at: a.i, doors, ...narrow(s.lo, s.hi, a.i, d), greyTold: true,
            say: msg(s.greyTold ? 'play.find.dir' : 'play.find.dirAsk', { side: sideMsg(d) }),
          },
          effects: [{ sound: 'right' }],
        };
      }
      case 'quiz':
        return { state: { ...s, quiz: a.where === 'middle' ? 'right' : 'wrong' }, effects: [{ sound: a.where === 'middle' ? 'right' : 'wrong' }] };
      case 'again':
        return findRound(s, pickSecret(rand));
      case 'hint':
        return findRound({ ...s, hint: a.on, lowRounds: a.on ? 0 : s.lowRounds }, pickSecret(rand));
    }
  },
};

/* ---------- 做：猜下一步 ---------- */

// 每一轮循环先点出 mid，再选接下来怎么走。连对 5 次过关。
export const PREDICT_GOAL = 5;

export type Move = Round['move'];

export interface PredictBoard extends PredictState {
  arr: number[];
  target: number;
  list: Round[];
  /** 第几轮循环 */
  r: number;
  phase: 'mid' | 'move' | 'wrong' | 'end';
  /** 孩子点的格子（答错时标红） */
  picked: number | null;
  why: Msg | null;
  /** 画面上的范围：lo、hi、已经亮出来的 mid、找到的位置 */
  view: { lo: number; hi: number; mid: number | null; found: number };
}

export type PredictAction = { type: 'cell'; k: number } | { type: 'move'; move: Move } | { type: 'continue' } | { type: 'next' };

type Core = Omit<PredictBoard, keyof PredictState | 'view'> & { streak: number; passed: boolean };

/** 由核心状态算出外框和画面要的字段 */
function frame(c: Core): PredictBoard {
  const cur = c.list[c.r];
  const last = c.list[c.list.length - 1];
  const end = last.move === 'found'
    ? { lo: last.lo, hi: last.hi, found: last.mid }
    : last.move === 'right' ? { lo: last.mid + 1, hi: last.hi, found: -1 } : { lo: last.lo, hi: last.mid - 1, found: -1 };
  const view = c.phase === 'end' ? { ...end, mid: null } : { lo: cur.lo, hi: cur.hi, mid: c.phase === 'mid' ? null : cur.mid, found: -1 };
  const prompt = c.phase === 'end'
    ? (end.found >= 0 ? msg('do.predict.endFound', { i: end.found }) : msg('do.predict.endEmpty', { lo: end.lo, hi: end.hi }))
    : c.phase === 'mid'
      ? msg('do.predict.askMid', { lo: cur.lo, hi: cur.hi })
      : msg('do.predict.askMove', { mid: cur.mid, v: c.arr[cur.mid], target: c.target });
  return {
    ...c, view, prompt, goal: PREDICT_GOAL,
    wrong: c.phase === 'wrong' ? c.why : null,
    ended: c.phase === 'end',
    chips: [['target', c.target]],
  };
}

function fresh(streak: number, passed: boolean, rand: () => number): PredictBoard {
  const { arr, target } = genPredict(rand);
  return frame({ arr, target, list: rounds(arr, target), r: 0, phase: 'mid', picked: null, why: null, streak, passed });
}

export const predictFlow: Flow<PredictBoard, PredictAction> = {
  init: (rand) => fresh(0, false, rand),
  step(s, a, rand): Next<PredictBoard, PredictAction> {
    const cur = s.list[s.r];
    const miss = (why: Msg, extra: Partial<Core> = {}) => {
      const k = streakMiss(s);
      return { state: frame({ ...s, ...extra, streak: k.streak, passed: k.passed, why, phase: 'wrong' }), effects: [{ sound: k.sound }] };
    };
    const hit = (next: Partial<Core>) => {
      const k = streakHit(s, PREDICT_GOAL);
      return { state: frame({ ...s, ...next, streak: k.streak, passed: k.passed }), effects: [{ sound: k.sound }] };
    };
    /** 进入下一轮循环，或者结束 */
    const advance = (): Partial<Core> =>
      cur.move === 'found' || s.r >= s.list.length - 1 ? { picked: null, phase: 'end' } : { picked: null, r: s.r + 1, phase: 'mid' };

    switch (a.type) {
      case 'cell':
        if (s.phase !== 'mid') return s;
        return a.k === cur.mid ? hit({ picked: a.k, phase: 'move' }) : miss(cur.whyMid, { picked: a.k });
      case 'move':
        if (s.phase !== 'move') return s;
        return a.move === cur.move ? hit(advance()) : miss(cur.why);
      case 'continue':
        // 点错 mid 的，看完解释接着选下一步；选错下一步的，按正确答案继续
        if (s.picked !== null && s.picked !== cur.mid) return frame({ ...s, picked: null, phase: 'move' });
        return frame({ ...s, ...advance() });
      case 'next':
        return fresh(s.streak, s.passed, rand);
    }
  },
};

/* ---------- 做：挑战 ---------- */

// 1 到 1000 里猜一个数，10 次以内猜中过关。
export interface ChallengeGuess {
  g: number;
  dir: 'up' | 'down' | 'hit';
  /** 猜的时候剩下范围的正中间，结束后用来提示 */
  mid: number;
}

export interface ChallengeState {
  secret: number;
  lo: number;
  hi: number;
  log: ChallengeGuess[];
  input: string;
  msg: Msg | null;
  state: 'play' | 'win' | 'lose';
}

export type ChallengeAction = { type: 'input'; value: string } | { type: 'guess' } | { type: 'again' };

const challengeStart = (rand: () => number): ChallengeState => ({
  secret: genChallenge(rand), lo: 1, hi: CHALLENGE_MAX, log: [], input: '', msg: null, state: 'play',
});

export const challengeFlow: Flow<ChallengeState, ChallengeAction> = {
  init: challengeStart,
  step(s, a, rand) {
    switch (a.type) {
      case 'input':
        return { ...s, input: a.value };
      case 'again':
        return challengeStart(rand);
      case 'guess': {
        if (s.state !== 'play') return s;
        const g = parseInt(s.input, 10);
        if (isNaN(g) || g < 1 || g > CHALLENGE_MAX) return { ...s, msg: msg('do.challenge.badInput', { max: CHALLENGE_MAX }) };
        if (g < s.lo || g > s.hi) return { ...s, msg: msg('do.challenge.excluded', { g, lo: s.lo, hi: s.hi }) };
        const dir = g === s.secret ? 'hit' : g < s.secret ? 'up' : 'down';
        const log = [...s.log, { g, dir, mid: middle(s.lo, s.hi) } as ChallengeGuess];
        const next = { ...s, log, input: '', msg: null };
        if (dir === 'hit') return { ...next, state: 'win' };
        const range = dir === 'up' ? { lo: g + 1 } : { hi: g - 1 };
        return { ...next, ...range, state: log.length >= CHALLENGE_LIMIT ? 'lose' : 'play' };
      }
    }
  },
};

/* ---------- 做：逐步执行的输入 ---------- */

export const TRACE_SIZES = [8, 16, 32];

export interface TraceInput {
  size: number;
  arr: number[];
  target: number;
}

export type TraceAction =
  | { type: 'size'; size: number }
  | { type: 'target'; value: string }
  | { type: 'pickIn' }
  | { type: 'pickOut' }
  | { type: 'fresh' };

function freshArray(size: number, rand: () => number): TraceInput {
  const arr = genArray(size, rand);
  return { size, arr, target: pickTarget(arr, rand) };
}

export const traceInputFlow: Flow<TraceInput, TraceAction> = {
  init: (rand) => freshArray(16, rand),
  step(s, a, rand) {
    switch (a.type) {
      case 'size':
        return a.size === s.size ? s : freshArray(a.size, rand);
      case 'target': {
        const v = parseInt(a.value, 10);
        return isNaN(v) ? s : { ...s, target: v };
      }
      case 'pickIn':
        return { ...s, target: pickTarget(s.arr, rand) };
      case 'pickOut':
        return { ...s, target: missingValue(s.arr) };
      case 'fresh':
        return freshArray(s.size, rand);
    }
  },
};
