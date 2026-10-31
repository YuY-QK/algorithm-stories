import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mergeCopy, missingKeys, t } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, tickGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/binary-search/copy.zh.json';
import levelJson from '../content/algorithms/binary-search/level.json';
import * as bs from '../src/engine/binary-search';
import { asCopy, blockKeys, collectMsgs, keysOf, literalKeys } from './helpers/copy';
import { seeded } from './helpers/seeded';

// 文案测试（docs/refactor-plan.md 7.3）：跑遍引擎产生的 Msg，缺键为空；文案表里没有用不到的键
const copy = mergeCopy(asCopy(coreCopy), asCopy(levelCopy));
const own = asCopy(levelCopy);
const rand = seeded(2026);
const pickOf = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

/** 一个控件列表里所有按钮的操作，以及数字框提交出的几种操作 */
function actionsOf<A>(cs: Control<A>[]): A[] {
  const out: A[] = [];
  for (const c of cs) {
    if (c.type === 'button' && !c.disabled) out.push(c.action);
    else if (c.type === 'group') out.push(...actionsOf(c.items));
    else if (c.type === 'number') {
      for (const n of [1, 1000, 1001, 0, 500, Math.floor(rand() * 1000) + 1, Math.floor(rand() * 1000) + 1]) out.push(c.submit(n));
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
        msgs.push(...collectMsgs([t2.run.say, t2.run.state, rules.controls(t2.run.state), rules.hud?.(t2.run.state)]));
      }
    };
    seen(st);
    for (let k = 0; k < 40; k++) {
      const quiz = resultOf(rules, st.run)?.quiz?.options ?? [];
      const a = pickOf([...actionsOf(rules.controls(st.run.state)), ...actionsOf(quiz), ...extra(st.run.state)]);
      if (a === undefined) break;
      const next = actGame(rules, st.run, a, rand);
      if (next) seen(next);
      if (rand() < 0.02) seen({ run: rules.interrupt ? tickGame(rules, st.run).run : st.run });
    }
  }
}

function collectAll(): Msg[] {
  const msgs: Msg[] = [];
  const L = bs.level;

  // 看
  for (let secret = 1; secret <= bs.KID_N; secret++) msgs.push(...collectMsgs(L.look!.story.frames(secret)));

  // 逐步执行：各种大小、命中和未命中
  const tr = bs.traceRules;
  for (let k = 0; k < 300; k++) {
    let input = tr.start(rand);
    input = tr.act(input, { type: 'size', n: pickOf([8, 16, 32]) }, rand);
    if (k % 2) input = tr.act(input, { type: 'missing' }, rand);
    if (k % 5 === 0) input = tr.act(input, { type: 'target', n: Math.floor(rand() * 100) }, rand);
    msgs.push(...collectMsgs(tr.controls(input)));
    for (const step of tr.trace(input)) msgs.push(...collectMsgs([step.note, tr.vars(input, step), tr.summary?.(input, step)]));
  }

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
      s = pr.answer(s, right ? ask.answer : -1)?.state ?? pr.proceed(s)!;
      if (s.phase === 'wrong' || s.phase === 'right') s = pr.proceed(s)!;
    }
    msgs.push(...collectMsgs(pr.viewOf(s)));
  }

  // 找 bug
  const br = L.bugs!.main;
  for (const bug of br.bugs) {
    msgs.push(...collectMsgs([bug, br.input(bug)]));
    // 换几个目标值，让有 bug 的代码也跑到「找到了」的分支
    for (const target of [bug.target, ...(bug.values ?? []), 0, 1_000_000_000]) {
      for (const step of br.run({ ...bug, target })) msgs.push(...collectMsgs([step.note, br.vars(step, bug), br.verdict(step, bug)]));
    }
  }

  // 玩和挑战：随机玩很多局
  const pickAction = (s: bs.HideState | bs.FindState): bs.PlayAction[] => [
    { type: 'pick', i: Math.floor(rand() * 17) },
    { type: 'pick', i: Math.floor(rand() * 17) },
    { type: 'pick', i: s.lo + Math.floor(rand() * (s.hi - s.lo + 1)) },
    { type: 'pick', i: Math.floor((s.lo + s.hi) / 2) },
  ];
  fuzzGame(L.games!.hide, pickAction, 400, msgs);
  fuzzGame(L.games!.find, pickAction, 600, msgs);
  fuzzGame(L.games!.challenge, (s: bs.ChallengeState): bs.ChallengeAction[] => [
    { type: 'guess', n: Math.floor((s.lo + s.hi) / 2) },
    { type: 'guess', n: Math.floor((s.lo + s.hi) / 2) },
  ], 300, msgs);

  // 延伸
  msgs.push(...collectMsgs(bs.compareRows()));
  return msgs;
}

describe('二分查找 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键：键要么被引擎用到，要么是块的标题、说明、目标、正文，要么是画面用的', () => {
    const dir = new URL('../src/ui/vue/scenes/binary-search/', import.meta.url);
    const sceneKeys = readdirSync(dir)
      .filter((f) => f.endsWith('.vue'))
      .flatMap((f) => literalKeys(readFileSync(new URL(f, dir), 'utf8'), 'm'));
    const used = new Set([...keysOf(msgs), ...blockKeys(levelJson, own), ...sceneKeys]);
    expect(sceneKeys.length).toBeGreaterThan(0);
    expect(Object.keys(own).filter((k) => !used.has(k))).toEqual([]);
    // 画面用的键都在文案表里
    expect(sceneKeys.filter((k) => !(k in own))).toEqual([]);
  });

  it('level.json 的每个块都有标题；游戏块和练习块需要的文案齐全', () => {
    for (const blocks of Object.values(levelJson)) {
      for (const b of blocks as { id?: string; kind: string }[]) {
        if (!b.id) continue;
        expect(own[b.id + '.title'], b.id).toBeTruthy();
        if (b.kind === 'exercise') expect(own[b.id + '.body']).toBeTruthy();
      }
    }
  });

  it('块的目标提示里写死的次数和范围，和引擎常量一致', () => {
    expect(own['challenge.goal']).toContain('1 到 ' + bs.CHALLENGE_MAX);
    expect(own['challenge.goal']).toContain('最多猜 ' + bs.CHALLENGE_LIMIT + ' 次');
    expect(t(bs.level.games!.challenge.result!({ ...bs.challengeRules.start().state, status: 'win', log: [{ g: 1, dir: 'hit', mid: 1, say: { key: 'x' }, hint: null }], secret: 1 })!.body!, copy)).toContain('2¹⁰ = 1024 ≥ ' + bs.CHALLENGE_MAX);
  });
});
