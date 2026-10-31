import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { m, mergeCopy, missingKeys } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, tickGame, interruptGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/quick-sort/copy.zh.json';
import levelJson from '../content/algorithms/quick-sort/level.json';
import * as qs from '../src/engine/quick-sort';
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
  const L = qs.level;

  // 看：故事里的一排和很多随机的一排
  msgs.push(...collectMsgs(L.look!.story.frames(qs.STORY_ROW)));
  for (let k = 0; k < 100; k++) msgs.push(...collectMsgs(L.look!.story.frames(qs.permutation(2 + (k % 8), rand))));

  // 逐步执行：各种大小和初始顺序，含极小的数组
  const tr = qs.traceRules;
  for (let k = 0; k < 150; k++) {
    let input = tr.start(rand);
    input = tr.act(input, { type: 'size', n: pickOf([6, 8, 10]) }, rand);
    input = tr.act(input, { type: 'kind', kind: pickOf<qs.TraceKind>(['random', 'sorted', 'dup']) }, rand);
    msgs.push(...collectMsgs(tr.controls(input)));
    for (const step of tr.trace(input)) msgs.push(...collectMsgs([step.note, tr.vars(input, step), tr.summary?.(input, step)]));
  }
  msgs.push(...collectMsgs([tr.jump!.label, tr.foot]));
  for (const arr of [[], [5], [2, 1], [1, 2], [3, 3, 3]]) for (const step of qs.buildTrace(arr)) msgs.push(...collectMsgs(step.note));

  // 猜下一步：随机题目（含重复的数），答对答错各种走法
  const pd = L.predict!.main;
  msgs.push(...collectMsgs(pd.continueLabel));
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
      const wrongValue = ask.kind === 'choose' ? ask.options!.map((o) => o.value).find((x) => x !== ask.answer) : -1;
      s = pr.answer(s, rand() < 0.5 ? ask.answer : wrongValue)!.state;
    }
  }

  // 找 bug：三个坑，还有各种随机输入跑出的判定
  const br = L.bugs!.main;
  msgs.push(...collectMsgs(br.jump!.label));
  for (const bug of br.bugs) {
    msgs.push(...collectMsgs([bug, br.input(bug)]));
    for (const step of br.run(bug)) msgs.push(...collectMsgs([step.note, br.vars(step, bug), br.verdict(step, bug)]));
    for (let k = 0; k < 100; k++) {
      const last = qs.simulate(qs.genArray(2 + (k % 7), 5, rand), bug.id).at(-1)!;
      msgs.push(...collectMsgs(br.verdict(last, bug)));
    }
  }
  // 标杆是最小的时 swap-i 会越界（演示输入碰不到）
  for (const step of qs.simulate([2, 3, 1], 'swap-i')) msgs.push(...collectMsgs([step.note, br.verdict(step, br.bugs[2])]));
  msgs.push(...collectMsgs(br.verdict(qs.buildTrace([2, 1]).at(-1)!, br.bugs[0])));
  // 死循环的提示在正常输入下碰不到（步数上限 20000），直接造一个结局
  msgs.push(...collectMsgs(br.verdict({ ...qs.buildTrace([2, 1]).at(-1)!, outcome: 'stuck' }, br.bugs[0])), m('trace.note.stuck'));

  // 玩和挑战：随机玩很多局
  fuzzGame(L.games!.stand, (): qs.StandAction[] => [{ type: 'side', side: 'left' }, { type: 'side', side: 'right' }], 300, msgs);
  fuzzGame(L.games!.pick, (s: qs.PickState): qs.PickAction[] => [
    { type: 'pick', id: Math.floor(rand() * qs.PICK_N) }, { type: 'pick', id: qs.medianIdx(s.values) }, { type: 'retry' }, { type: 'next' },
  ], 300, msgs);
  fuzzGame(L.games!.challenge, (s: qs.ChallengeState): qs.ChallengeAction[] => [
    { type: 'pick', n: pickOf(qs.CHALLENGE_OPTIONS) }, { type: 'next' }, { type: 'size', n: pickOf(qs.TABLE_SIZES) }, { type: 'again' },
    { type: 'pick', n: s.finished ? 0 : qs.challengeAnswer(s.qs[s.qi]) },
  ], 100, msgs);
  // 挑战的题名和表格里的名字
  for (let k = 0; k < 20; k++) msgs.push(...collectMsgs(qs.genChallenge(rand)));
  msgs.push(...collectMsgs([qs.INPUT_NAME, qs.STRATEGY_NAME]));

  // 延伸
  msgs.push(...collectMsgs(qs.compareRows()));
  return msgs;
}

describe('快速排序 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键：键要么被引擎用到，要么是块的标题、说明、目标、正文，要么是画面用的', () => {
    const dir = new URL('../src/ui/vue/scenes/quick-sort/', import.meta.url);
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
    expect(own['predict.intro']).toContain('连对 ' + qs.level.predict!.main.goal + ' 次过关');
  });

  it('提示里写死的数字和引擎一致：挑战每组的个数、挑好标杆的回合数', () => {
    expect(qs.CHALLENGE_N).toBe(10);
    expect(own['chal.name.same']).toContain('十个数');
    expect(qs.PICK_ROUNDS).toBe(3);
    expect(own['pick.say.end']).toContain('三回合');
    expect(own['chal.all']).toContain('三题');
  });
});
