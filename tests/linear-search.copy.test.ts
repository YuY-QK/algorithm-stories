import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mergeCopy, missingKeys, t } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, tickGame, interruptGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/linear-search/copy.zh.json';
import levelJson from '../content/algorithms/linear-search/level.json';
import * as ls from '../src/engine/linear-search';
import { asCopy, blockKeys, collectMsgs, keysOf, literalKeys } from './helpers/copy';
import { seeded } from './helpers/seeded';

// 文案测试（docs/refactor-plan.md 7.3）：跑遍引擎产生的 Msg，缺键为空；文案表里没有用不到的键
const copy = mergeCopy(asCopy(coreCopy), asCopy(levelCopy));
const own = asCopy(levelCopy);
const rand = seeded(2027);
const pickOf = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

/** 一个控件列表里所有按钮的操作，以及数字框提交出的几种操作 */
function actionsOf<A>(cs: Control<A>[]): A[] {
  const out: A[] = [];
  for (const c of cs) {
    if (c.type === 'button' && !c.disabled) out.push(c.action);
    else if (c.type === 'group') out.push(...actionsOf(c.items));
    else if (c.type === 'number') {
      for (const n of [1, 0, -2, 5, 11, 21, 41, Math.floor(rand() * 40) + 1]) out.push(c.submit(n));
      if (c.invalid) out.push(c.invalid);
    } else if (c.type === 'segmented') out.push(...c.options.map((o) => c.choose(o.value)));
  }
  return out;
}

/** 随机玩一局，把沿途所有 Msg 收集起来 */
function fuzzGame<S, A>(rules: GameRules<S, A>, extra: (s: S) => A[], plays: number, msgs: Msg[]) {
  for (let p = 0; p < plays; p++) {
    let st = startGame(rules, rand);
    const seen = (s: typeof st) => {
      st = s;
      msgs.push(...collectMsgs([s.run.say, s.run.state, rules.controls(s.run.state), rules.hud?.(s.run.state), resultOf(rules, s.run)]));
      while (st.after !== undefined) {
        // 自动步骤也要走完，其中的台词也算
        const t2 = tickGame(rules, st.run, rand);
        st = t2;
        msgs.push(...collectMsgs([t2.run.say, t2.run.state, rules.controls(t2.run.state), rules.hud?.(t2.run.state), resultOf(rules, t2.run)]));
      }
    };
    seen(st);
    for (let k = 0; k < 60; k++) {
      const quiz = resultOf(rules, st.run)?.quiz?.options ?? [];
      const a = pickOf([...actionsOf(rules.controls(st.run.state)), ...actionsOf(quiz), ...extra(st.run.state)]);
      if (a === undefined) break;
      const next = actGame(rules, st.run, a, rand);
      if (next) seen(next);
      if (rand() < 0.03) seen(interruptGame(rules, st.run));
    }
  }
}

function collectAll(): Msg[] {
  const msgs: Msg[] = [];
  const L = ls.level;

  // 看
  msgs.push(...collectMsgs(L.look!.story.frames(0)));

  // 逐步执行：五种题型，命中、没有、重复
  const tr = L.trace!.main;
  for (let k = 0; k < 300; k++) {
    let input = tr.start(rand);
    input = tr.act(input, { type: 'kind', kind: pickOf([...ls.PUZZLE_KINDS]) }, rand);
    msgs.push(...collectMsgs(tr.controls(input)));
    for (const step of tr.trace(input)) msgs.push(...collectMsgs([step.note, tr.vars(input, step), tr.summary?.(input, step)]));
  }
  // 空数组也要有台词
  for (const step of tr.trace({ kind: 'missing', arr: [], target: 1 })) msgs.push(...collectMsgs([step.note, tr.vars({ kind: 'missing', arr: [], target: 1 }, step)]));

  // 猜下一步：随机题目，答对答错各种走法
  const pd = L.predict!.main;
  for (let k = 0; k < 300; k++) {
    const puzzle = pd.puzzle(rand);
    msgs.push(...collectMsgs(puzzle));
    let s = pr.startPredict(puzzle);
    for (let guard = 0; guard < 100 && s.phase !== 'end'; guard++) {
      const v = pr.viewOf(s);
      msgs.push(...collectMsgs([v.prompt, v.wrong, v.right]));
      const ask = puzzle.asks[s.i];
      const right = rand() < 0.6;
      s = pr.answer(s, right ? ask.answer : '?')?.state ?? pr.proceed(s)!;
      if (s.phase === 'wrong' || s.phase === 'right') s = pr.proceed(s)!;
    }
    msgs.push(...collectMsgs(pr.viewOf(s)));
  }

  // 找 bug
  const br = L.bugs!.main;
  for (const bug of br.bugs) {
    msgs.push(...collectMsgs([bug, br.input(bug)]));
    // 换几个目标值，让有 bug 的代码也跑到「找到了」的分支
    for (const target of [bug.target, ...bug.arr, 99]) {
      for (const step of br.run({ ...bug, target })) msgs.push(...collectMsgs([step.note, br.vars(step, bug), br.verdict(step, bug)]));
    }
  }

  // 玩和挑战：随机玩很多局
  const taps = (): ls.FindAction[] => [0, 1, 2, 3, 4, 5, 6, 7].map((k) => ({ type: 'tap', k }));
  fuzzGame(L.games!.find, (): ls.FindAction[] => [...taps(), { type: 'answer', n: 8 }, { type: 'answer', n: 1 }, { type: 'answer', n: 0 }, { type: 'nextQuiz' }], 800, msgs);
  fuzzGame(L.games!.robot, (): ls.RobotAction[] => [0, 1, 2, 3, 4, 5, 6, 7, null].map((at) => ({ type: 'hide', at })), 200, msgs);
  fuzzGame(L.games!.challenge, (s: ls.ChallengeState): ls.ChallengeAction[] => [
    { type: 'guess', n: s.n }, { type: 'guess', n: s.n - 1 }, { type: 'guess', n: s.n + 5 },
    { type: 'guess', n: (s.n + 1) / 2 }, { type: 'guess', n: NaN }, { type: 'run' }, { type: 'fresh' },
  ], 300, msgs);

  // 机器人的引导语（画面直接取，不在状态里）
  for (const tally of [[], [{ at: 0, count: 1 }, { at: null, count: 8 }], [{ at: 3, count: 4 }, { at: 5, count: 6 }], [{ at: 3, count: 4 }]]) msgs.push(...collectMsgs(ls.robotNote(tally)));

  // 延伸
  msgs.push(...collectMsgs(ls.compareRows()));
  return msgs;
}

describe('顺序查找 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键：键要么被引擎用到，要么是块的标题、说明、目标、正文，要么是画面用的', () => {
    const dir = new URL('../src/ui/vue/scenes/linear-search/', import.meta.url);
    const sceneKeys = readdirSync(dir)
      .filter((f) => f.endsWith('.vue'))
      .flatMap((f) => literalKeys(readFileSync(new URL(f, dir), 'utf8'), 'm'));
    const used = new Set([...keysOf(msgs), ...blockKeys(levelJson, own), ...sceneKeys]);
    expect(sceneKeys.length).toBeGreaterThan(0);
    expect(Object.keys(own).filter((k) => !used.has(k))).toEqual([]);
    // 画面用的键都在文案表里
    expect(sceneKeys.filter((k) => !(k in own))).toEqual([]);
  });

  it('level.json 的每个块都有标题；练习块有正文', () => {
    for (const blocks of Object.values(levelJson)) {
      for (const b of blocks as { id?: string; kind: string }[]) {
        if (!b.id) continue;
        expect(own[b.id + '.title'], b.id).toBeTruthy();
        if (b.kind === 'exercise') expect(own[b.id + '.body']).toBeTruthy();
      }
    }
  });

  it('玩具名字、箱子数这些写进文案的数字，和引擎常量一致', () => {
    expect(ls.TOYS).toHaveLength(ls.TOY_COUNT);
    // 小熊本身从不报名字（找到时有专门的台词），其余玩具都要有名字
    for (let id = 0; id < ls.TOY_COUNT; id++) if (id !== ls.BEAR) expect(own['toy.' + id], 'toy.' + id).toBeTruthy();
    expect(t({ key: 'toy.0' }, copy)).toBe('积木');
    expect(own['scene.toyBoxes']).toContain(String(ls.KID_N));
    expect(own['find.quiz.worst.right']).toContain('前面 ' + (ls.KID_N - 1) + ' 个');
    expect(own['find.quiz.worst.right']).toContain('要开 ' + ls.KID_N + ' 个');
    expect(own['predict.intro']).toContain('连对 ' + ls.PREDICT_GOAL + ' 次');
  });
});
