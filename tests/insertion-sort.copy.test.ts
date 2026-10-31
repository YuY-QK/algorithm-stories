import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { m, mergeCopy, missingKeys } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, tickGame, interruptGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/insertion-sort/copy.zh.json';
import levelJson from '../content/algorithms/insertion-sort/level.json';
import * as is from '../src/engine/insertion-sort';
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
  const L = is.level;

  // 看：故事里的牌和很多随机的牌
  msgs.push(...collectMsgs(L.look!.story.frames(is.STORY_HAND)));
  for (let k = 0; k < 200; k++) msgs.push(...collectMsgs(L.look!.story.frames(is.dealHand(2 + (k % 8), rand))));

  // 逐步执行：各种大小和初始顺序，含极小的数组
  const tr = is.traceRules;
  for (let k = 0; k < 300; k++) {
    let input = tr.start(rand);
    input = tr.act(input, { type: 'size', n: pickOf([6, 8, 10]) }, rand);
    input = tr.act(input, { type: 'shape', shape: pickOf<is.Shape>(['random', 'nearly', 'reversed']) }, rand);
    msgs.push(...collectMsgs(tr.controls(input)));
    for (const step of tr.trace(input)) msgs.push(...collectMsgs([step.note, tr.vars(input, step), tr.summary?.(input, step)]));
  }
  msgs.push(...collectMsgs([tr.jump!.label, tr.foot]));
  for (const arr of [[], [5], [2, 1], [1, 2]]) for (const step of is.buildTrace(arr)) msgs.push(...collectMsgs(step.note));

  // 猜下一步：随机题目（含重复的数），答对答错各种走法
  const pd = L.predict!.main;
  for (let k = 0; k < 300; k++) {
    const puzzle = pd.puzzle(rand);
    msgs.push(...collectMsgs(puzzle));
    let s = pr.startPredict(puzzle);
    for (let guard = 0; guard < 300 && s.phase !== 'end'; guard++) {
      const v = pr.viewOf(s);
      msgs.push(...collectMsgs([v.prompt, v.wrong, v.right, v.options]));
      if (s.phase === 'wrong' || s.phase === 'right') {
        s = pr.proceed(s)!;
        continue;
      }
      const ask = puzzle.asks[s.i];
      s = pr.answer(s, rand() < 0.5 ? ask.answer : -1)!.state;
    }
    msgs.push(...collectMsgs(pr.viewOf(s)));
  }

  // 找 bug：三个坑，还有各种随机输入跑出的判定
  const br = L.bugs!.main;
  for (const bug of br.bugs) {
    msgs.push(...collectMsgs([bug, br.input(bug)]));
    for (const step of br.run(bug)) msgs.push(...collectMsgs([step.note, br.vars(step, bug), br.verdict(step, bug)]));
    for (let k = 0; k < 200; k++) {
      const last = is.simulate(is.genArray(2 + (k % 7), 5, rand), bug.id).at(-1)!;
      msgs.push(...collectMsgs(br.verdict(last, bug)));
    }
  }
  msgs.push(...collectMsgs(br.verdict(is.buildTrace([2, 1]).at(-1)!, br.bugs[0])));
  // 死循环的提示在正常输入下碰不到（步数上限 20000），直接造一个结局
  msgs.push(...collectMsgs(br.verdict({ ...is.buildTrace([2, 1]).at(-1)!, outcome: 'stuck' }, br.bugs[0])), m('trace.note.stuck'));

  // 玩和挑战：随机玩很多局
  fuzzGame(L.games!.place, (g: is.PlaceGame): is.PlaceAction[] => [
    { type: 'gap', g: Math.floor(rand() * (g.i + 1)) }, { type: 'gap', g: is.insertPos(is.placeHand(g), g.values[g.i]) },
  ], 300, msgs);
  fuzzGame(L.games!.shift, (g: is.ShiftGame): is.ShiftAction[] => [
    { type: 'card', id: g.slots[Math.max(g.hole - 1, 0)] ?? 0 }, { type: 'card', id: Math.floor(rand() * is.SHIFT_N) }, { type: 'hole' },
    { type: 'count', n: g.coins }, { type: 'count', n: g.coins + 1 },
  ], 300, msgs);
  fuzzGame(L.games!.challenge, (s: is.RaceState): is.RaceAction[] => [
    { type: 'choose', k: Math.floor(rand() * 4) }, { type: 'choose', k: is.raceFastest(s) }, { type: 'go' }, { type: 'skip' },
  ], 40, msgs);
  // 每个阶段顶上的话
  const race = is.challengeRules.start(rand).state;
  for (const phase of ['fast', 'slow', 'ready', 'race', 'end'] as const) msgs.push(...collectMsgs(is.racePrompt({ ...race, phase })));
  for (const kind of ['nearly', 'random', 'reversed', 'tail'] as const) msgs.push(...collectMsgs(is.laneName(kind)));

  // 延伸
  msgs.push(...collectMsgs(is.compareRows()));
  return msgs;
}

describe('插入排序 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键：键要么被引擎用到，要么是块的标题、说明、目标、正文，要么是画面用的', () => {
    const dir = new URL('../src/ui/vue/scenes/insertion-sort/', import.meta.url);
    const sceneKeys = readdirSync(dir)
      .filter((f) => f.endsWith('.vue'))
      .flatMap((f) => literalKeys(readFileSync(new URL(f, dir), 'utf8'), 'm'));
    const used = new Set([...keysOf(msgs), ...blockKeys(levelJson, own), ...sceneKeys]);
    expect(sceneKeys.length).toBeGreaterThan(0);
    expect(Object.keys(own).filter((k) => !used.has(k))).toEqual([]);
    // 画面用的键都在文案表里
    expect(sceneKeys.filter((k) => !(k in own))).toEqual([]);
  });

  it('level.json 的每个块都有标题；「玩」的目标提示和练习块的正文齐全', () => {
    for (const [stage, blocks] of Object.entries(levelJson)) {
      for (const b of blocks as { id?: string; kind: string }[]) {
        if (!b.id) continue;
        expect(own[b.id + '.title'], b.id).toBeTruthy();
        if (b.kind === 'game' && stage === 'play') expect(own[b.id + '.goal'], b.id).toBeTruthy();
        if (b.kind === 'exercise') expect(own[b.id + '.body']).toBeTruthy();
      }
    }
  });

  it('猜下一步的提示里写死的连对次数，和规则里的 goal 一致', () => {
    expect(own['predict.intro']).toContain('连对 ' + is.level.predict!.main.goal + ' 次过关');
  });

  it('提示里写死的数字和引擎一致：挑战的组数、每组个数', () => {
    expect(is.CHALLENGE_N).toBe(12);
    expect(own['chal.prompt.fast']).toContain('四组 {n} 个数');
  });
});
