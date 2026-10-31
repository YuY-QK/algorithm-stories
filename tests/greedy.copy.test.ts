import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mergeCopy, missingKeys } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, tickGame, interruptGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/greedy/copy.zh.json';
import levelJson from '../content/algorithms/greedy/level.json';
import * as g from '../src/engine/greedy';
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
  const L = g.level;

  // 看
  msgs.push(...collectMsgs(L.look!.story.frames(L.look!.story.first)));

  // 逐步执行：每套面值、很多金额（包括 0）
  const tr = g.traceRules;
  for (let k = 0; k < 300; k++) {
    let input = tr.start(rand);
    input = tr.act(input, { type: 'sys', id: pickOf(g.SYSTEMS).id }, rand);
    input = tr.act(input, { type: 'amount', n: Math.floor(rand() * 201) }, rand);
    if (rand() < 0.1) input = tr.act(input, { type: 'odd' }, rand);
    if (rand() < 0.1) input = tr.act(input, { type: 'random' }, rand);
    msgs.push(...collectMsgs(tr.controls(input)));
    for (const step of tr.trace(input)) msgs.push(...collectMsgs([step.note, tr.vars(input, step), tr.summary?.(input, step)]));
  }
  msgs.push(...collectMsgs(tr.jump!.label));
  // 凑不齐的面值（没有 1）也走一遍：收尾台词
  for (const step of g.buildTrace([5, 3], 9)) msgs.push(...collectMsgs(step.note));

  // 猜下一步：随机题目，答对答错各种走法
  const pd = L.predict!.main;
  for (let k = 0; k < 300; k++) {
    const puzzle = pd.puzzle(rand);
    msgs.push(...collectMsgs(puzzle));
    for (const ask of puzzle.asks) if (ask.whyFor) for (const c of puzzle.asks[0].view.coins) msgs.push(...collectMsgs(ask.whyFor(c)));
    let s = pr.startPredict(puzzle);
    for (let guard = 0; guard < 300 && s.phase !== 'end'; guard++) {
      const v = pr.viewOf(s);
      msgs.push(...collectMsgs([v.prompt, v.wrong, v.right, v.options, v.chips]));
      if (s.phase === 'wrong' || s.phase === 'right') {
        s = pr.proceed(s)!;
        continue;
      }
      const ask = puzzle.asks[s.i];
      s = pr.answer(s, rand() < 0.6 ? ask.answer : pickOf(puzzle.asks[0].view.coins))!.state;
    }
    msgs.push(...collectMsgs(pr.viewOf(s)));
  }

  // 找 bug
  const br = L.bugs!.main;
  for (const bug of br.bugs) {
    msgs.push(...collectMsgs([bug, br.input(bug), br.jump?.label]));
    for (const step of br.run(bug)) msgs.push(...collectMsgs([step.note, br.vars(step, bug), br.verdict(step, bug)]));
  }

  // 玩和挑战：随机玩很多局
  fuzzGame(L.games!.cashier, (s: g.CashierGame): g.CashierAction[] => [
    { type: 'tap', coin: pickOf(g.KID_COINS) }, { type: 'tap', coin: g.greedyNext(g.KID_COINS, g.cashierLeft(s)) ?? 1 },
    { type: 'tap', coin: g.greedyNext(g.KID_COINS, g.cashierLeft(s)) ?? 1 }, { type: 'tap', coin: g.greedyNext(g.KID_COINS, g.cashierLeft(s)) ?? 1 },
    { type: 'quiz', right: rand() < 0.5 },
  ], 400, msgs);
  fuzzGame(L.games!.robot, (s: g.RobotGame): g.RobotAction[] => [
    { type: 'tap', coin: pickOf(g.PUZZLES[s.level].coins) }, { type: 'tap', coin: pickOf(g.PUZZLES[s.level].coins) },
  ], 400, msgs);
  fuzzGame(L.games!.challenge, (): g.ChallengeAction[] => [], 100, msgs);
  // 挑战里每一题答对答错的揭晓
  for (let k = 0; k < g.CHALLENGE.length; k++) {
    for (const a of [true, false]) msgs.push(...collectMsgs(g.challengeReveal({ k, answers: g.CHALLENGE.map((_, i) => (i === k ? a : null)) })));
    msgs.push(...collectMsgs(g.CHALLENGE[k].note));
  }

  // 延伸
  msgs.push(...collectMsgs(g.compareRows()));
  return msgs;
}

describe('贪心 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键：键要么被引擎用到，要么是块的标题、说明、目标、正文，要么是画面用的', () => {
    const dir = new URL('../src/ui/vue/scenes/greedy/', import.meta.url);
    const sceneKeys = readdirSync(dir)
      .filter((f) => f.endsWith('.vue'))
      .flatMap((f) => literalKeys(readFileSync(new URL(f, dir), 'utf8'), 'm'));
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
    expect(own['predict.intro']).toContain('连对 ' + g.level.predict!.main.goal + ' 次过关');
  });
});
