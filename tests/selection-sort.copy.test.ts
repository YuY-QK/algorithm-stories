import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mergeCopy, missingKeys } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, tickGame, interruptGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/selection-sort/copy.zh.json';
import levelJson from '../content/algorithms/selection-sort/level.json';
import * as bs from '../src/engine/selection-sort';
import { asCopy, blockKeys, collectMsgs, keysOf, literalKeys } from './helpers/copy';
import { seeded } from './helpers/seeded';

// 文案测试（docs/refactor-plan.md 7.3）：跑遍引擎产生的 Msg，缺键为空；文案表里没有用不到的键
const copy = mergeCopy(asCopy(coreCopy), asCopy(levelCopy));
const own = asCopy(levelCopy);
const rand = seeded(2026);
const pickOf = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

/** 一个控件列表里所有可能产生的操作 */
function actionsOf<A>(cs: Control<A>[]): A[] {
  const out: A[] = [];
  for (const c of cs) {
    if (c.type === 'button' && !c.disabled) out.push(c.action);
    else if (c.type === 'group') out.push(...actionsOf(c.items));
    else if (c.type === 'segmented') out.push(...c.options.map((o) => c.choose(o.value)));
  }
  return out;
}

/** 随机玩很多局，把沿途所有 Msg 收集起来 */
function fuzzGame<S, A>(rules: GameRules<S, A>, extra: (s: S) => A[], plays: number, msgs: Msg[]) {
  for (let p = 0; p < plays; p++) {
    let step = startGame(rules, rand);
    const seen = () => {
      msgs.push(...collectMsgs([step.run.say, step.run.state, rules.controls(step.run.state), rules.hud?.(step.run.state), resultOf(rules, step.run)]));
      for (let guard = 0; step.after !== undefined && guard < 50; guard++) {
        step = tickGame(rules, step.run, rand);
        msgs.push(...collectMsgs([step.run.say, step.run.state, rules.controls(step.run.state), resultOf(rules, step.run)]));
      }
    };
    seen();
    for (let k = 0; k < 80; k++) {
      const a = pickOf([...actionsOf(rules.controls(step.run.state)), ...extra(step.run.state)]);
      if (a === undefined) break;
      const next = actGame(rules, step.run, a, rand);
      if (next) {
        step = next;
        seen();
      }
      if (rand() < 0.03) {
        step = interruptGame(rules, step.run);
        seen();
      }
    }
  }
}

function collectAll(): Msg[] {
  const msgs: Msg[] = [];
  const L = bs.level;

  // 看：故事里的队伍和很多随机队伍
  msgs.push(...collectMsgs(L.look!.story.frames(bs.STORY)));
  for (let k = 0; k < 300; k++) msgs.push(...collectMsgs(L.look!.story.frames(bs.genCandies(bs.KID_N, rand))));

  // 逐步执行：各种大小和初始顺序
  const tr = bs.traceRules;
  for (let k = 0; k < 300; k++) {
    let input = tr.start(rand);
    input = tr.act(input, { type: 'size', n: pickOf([6, 8, 10]) }, rand);
    input = tr.act(input, { type: 'shape', shape: pickOf<bs.Shape>(['random', 'dups', 'sorted', 'reversed']) }, rand);
    msgs.push(...collectMsgs(tr.controls(input)));
    for (const step of tr.trace(input)) msgs.push(...collectMsgs([step.note, tr.vars(input, step), tr.summary?.(input, step)]));
  }
  msgs.push(...collectMsgs(tr.jump!.label));
  // 极小的数组也走一遍：只有 0、1 个数时的收尾台词
  for (const arr of [[], [5], [2, 1], [1, 2]] as number[][]) for (const step of bs.buildTrace(arr)) msgs.push(...collectMsgs(step.note));

  // 猜下一步：随机题目，答对答错各种走法，动画的帧也要走
  const pd = L.predict!.main;
  for (let k = 0; k < 300; k++) {
    const puzzle = pd.puzzle(rand);
    msgs.push(...collectMsgs(puzzle));
    // 点错的解释随点的格子而变：每一格都问一遍
    for (const ask of puzzle.asks) if (ask.whyFor) for (let c = 0; c < puzzle.asks[0].view.a.length; c++) msgs.push(...collectMsgs(ask.whyFor(c)));
    let s = pr.startPredict(puzzle);
    for (let guard = 0; guard < 300 && s.phase !== 'end'; guard++) {
      const v = pr.viewOf(s);
      msgs.push(...collectMsgs([v.prompt, v.wrong, v.right, v.options]));
      if (s.phase === 'anim') {
        s = pr.tickAnim(s)!;
        continue;
      }
      if (s.phase === 'wrong' || s.phase === 'right') {
        s = pr.proceed(s)!;
        continue;
      }
      const ask = puzzle.asks[s.i];
      s = pr.answer(s, rand() < 0.6 ? ask.answer : -1)!.state;
    }
    msgs.push(...collectMsgs(pr.viewOf(s)));
  }

  // 找 bug
  const br = L.bugs!.main;
  for (const bug of br.bugs) {
    msgs.push(...collectMsgs([bug, br.input(bug)]));
    for (const step of br.run(bug)) msgs.push(...collectMsgs([step.note, br.vars(step, bug), br.verdict(step, bug)]));
  }

  // 玩和挑战：随机玩很多局
  fuzzGame(L.games!.pick, (g: bs.PickGame): bs.PickAction[] => [
    { type: 'pick', k: bs.minFrom(g.a, Math.min(g.i, g.a.length - 1)) },
    { type: 'pick', k: bs.minFrom(g.a, Math.min(g.i, g.a.length - 1)) },
    { type: 'pick', k: Math.floor(rand() * g.a.length) },
    { type: 'side', side: pickOf(['l', 'r'] as const) },
    { type: 'last', need: rand() < 0.5 },
  ], 300, msgs);
  fuzzGame(L.games!.hand, (g: bs.HandGame): bs.HandAction[] => [
    { type: 'answer', c: bs.handNeed(g.s) }, { type: 'answer', c: pickOf(['take', 'keep'] as const) },
  ], 300, msgs);
  fuzzGame(L.games!.challenge, (s: bs.ChallengeState): bs.ChallengeAction[] => {
    const i = s.a.findIndex((v, k) => k !== bs.minFrom(s.a, k));
    return [{ type: 'tap', k: Math.max(i, 0) }, { type: 'tap', k: i < 0 ? 0 : bs.minFrom(s.a, i) }, { type: 'tap', k: Math.floor(rand() * bs.CHALLENGE_N) }];
  }, 500, msgs);

  // 延伸
  msgs.push(...collectMsgs(bs.compareRows()));
  return msgs;
}

describe('选择排序 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键：键要么被引擎用到，要么是块的标题、说明、目标、正文，要么是画面用的', () => {
    const dir = new URL('../src/ui/vue/scenes/selection-sort/', import.meta.url);
    const sceneKeys = readdirSync(dir)
      .filter((f) => f.endsWith('.vue'))
      .flatMap((f) => literalKeys(readFileSync(new URL(f, dir), 'utf8'), 'm'))
    const used = new Set([...keysOf(msgs), ...blockKeys(levelJson, own), ...sceneKeys]);
    expect(sceneKeys.length).toBeGreaterThan(0);
    expect(Object.keys(own).filter((k) => !used.has(k))).toEqual([]);
    // 画面用的键都在文案表里
    expect(sceneKeys.filter((k) => !(k in own))).toEqual([]);
  });

  it('level.json 的每个块都有标题；游戏块的目标提示和练习块的正文齐全', () => {
    for (const blocks of Object.values(levelJson)) {
      for (const b of blocks as { id?: string; kind: string }[]) {
        if (!b.id) continue;
        expect(own[b.id + '.title'], b.id).toBeTruthy();
        if (b.kind === 'game') expect(own[b.id + '.goal'], b.id).toBeTruthy();
        if (b.kind === 'exercise') expect(own[b.id + '.body']).toBeTruthy();
      }
    }
  });

  it('猜下一步的提示里写死的连对次数，和规则里的 goal 一致', () => {
    expect(own['predict.intro']).toContain('连对 ' + bs.level.predict!.main.goal + ' 次过关');
  });
});
