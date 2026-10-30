import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mergeCopy, missingKeys } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, tickGame, interruptGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/hash-lookup/copy.zh.json';
import levelJson from '../content/algorithms/hash-lookup/level.json';
import * as hl from '../src/engine/hash-lookup';
import { asCopy, blockKeys, collectMsgs, keysOf, literalKeys } from './helpers/copy';
import { seeded } from './helpers/seeded';

// 文案测试（docs/refactor-plan.md 7.3）：跑遍引擎产生的 Msg，缺键为空；文案表里没有用不到的键
const copy = mergeCopy(asCopy(coreCopy), asCopy(levelCopy));
const own = asCopy(levelCopy);
const rand = seeded(2028);
const pickOf = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

function actionsOf<A>(cs: Control<A>[]): A[] {
  const out: A[] = [];
  for (const c of cs) {
    if (c.type === 'button' && !c.disabled) out.push(c.action);
    else if (c.type === 'group') out.push(...actionsOf(c.items));
    else if (c.type === 'number') out.push(c.submit(Math.floor(rand() * 60) - 10));
    else if (c.type === 'segmented') out.push(...c.options.map((o) => c.choose(o.value)));
  }
  return out;
}

function fuzzGame<S, A>(rules: GameRules<S, A>, extra: (s: S) => A[], plays: number, msgs: Msg[]) {
  for (let p = 0; p < plays; p++) {
    let st = startGame(rules, rand);
    const seen = (s: typeof st) => {
      st = s;
      msgs.push(...collectMsgs([s.run.say, s.run.state, rules.controls(s.run.state), rules.hud?.(s.run.state), resultOf(rules, s.run)]));
      while (st.after !== undefined) {
        const t2 = tickGame(rules, st.run, rand);
        st = t2;
        msgs.push(...collectMsgs([t2.run.say, t2.run.state, rules.controls(t2.run.state), rules.hud?.(t2.run.state), resultOf(rules, t2.run)]));
      }
    };
    seen(st);
    for (let k = 0; k < 120; k++) {
      const a = pickOf([...actionsOf(rules.controls(st.run.state)), ...extra(st.run.state)]);
      if (a === undefined) break;
      const next = actGame(rules, st.run, a, rand);
      if (next) seen(next);
      if (rand() < 0.03) seen(interruptGame(rules, st.run));
    }
  }
}

function collectAll(): Msg[] {
  const msgs: Msg[] = [];
  const L = hl.level;
  msgs.push(...collectMsgs(L.look!.story.frames(0)));

  const tr = L.trace!.main;
  for (let k = 0; k < 400; k++) {
    let input = tr.start(rand);
    input = tr.act(input, { type: 'op', op: pickOf(['get', 'put', 'remove'] as hl.Op[]) }, rand);
    if (k % 3 === 0) input = tr.act(input, { type: 'clashKey' }, rand);
    if (k % 7 === 0) input = tr.act(input, { type: 'key', n: -3 }, rand);
    msgs.push(...collectMsgs(tr.controls(input)));
    for (const step of tr.trace(input)) msgs.push(...collectMsgs([step.note, tr.vars(input, step), tr.summary?.(input, step)]));
  }
  // 表满放不下
  const full = { table: [0, 1, 2], op: 'put' as hl.Op, key: 9 };
  for (const step of tr.trace(full)) msgs.push(...collectMsgs([step.note, tr.summary?.(full, step)]));

  const pd = L.predict!.main;
  for (let k = 0; k < 400; k++) {
    const puzzle = pd.puzzle(rand);
    msgs.push(...collectMsgs(puzzle));
    let s = pr.startPredict(puzzle);
    const ask = puzzle.asks[0];
    s = pr.answer(s, rand() < 0.5 ? ask.answer : -1)?.state ?? s;
    if (s.phase === 'wrong') s = pr.proceed(s)!;
    msgs.push(...collectMsgs(pr.viewOf(s)));
  }
  for (const kind of ['place', 'find'] as const) msgs.push(...collectMsgs(hl.askRound(hl.fixedRound(kind))));

  const br = L.bugs!.main;
  for (const bug of br.bugs) {
    msgs.push(...collectMsgs([bug, br.input(bug)]));
    for (const step of br.run(bug)) msgs.push(...collectMsgs([step.note, br.vars(step, bug), br.verdict(step, bug)]));
  }

  fuzzGame(L.games!.walk, (s: hl.WalkState): hl.WalkAction[] => [...[0, 1, 2, 3, 4, 5, 6].map((i): hl.WalkAction => ({ type: 'tap', i })), ...(s.placed ? [{ type: 'next' } as const] : [])], 300, msgs);
  fuzzGame(L.games!.clash, (): hl.ClashAction[] => [...[0, 1, 2, 3, 4, 5, 6].map((i): hl.ClashAction => ({ type: 'shelf', i })), { type: 'put' }], 300, msgs);
  fuzzGame(L.games!.challenge, (): hl.ChallengeAction[] => hl.CHALLENGE_CAPS.map((c) => ({ type: 'cap', c })), 200, msgs);

  // 游戏里碰不到、但函数能给的：小数的「余数」提示
  msgs.push(...collectMsgs(hl.restText(4)));
  // 两种办法都玩一遍，才有「比一比」的结算
  const rules = L.games!.clash;
  let run = startGame(rules, rand).run;
  for (const mode of ['chain', 'probe'] as const) {
    const step = (a: hl.ClashAction) => {
      let st = actGame(rules, run, a, rand)!;
      run = st.run;
      msgs.push(...collectMsgs([run.say, run.state, rules.controls(run.state), resultOf(rules, run)]));
      while (st.after !== undefined) {
        st = tickGame(rules, run, rand);
        run = st.run;
        msgs.push(...collectMsgs([run.say, run.state, rules.controls(run.state), resultOf(rules, run)]));
      }
    };
    step({ type: 'put' }); step({ type: 'next' }); step({ type: 'put' }); step({ type: 'next' });
    step({ type: 'put' }); step({ type: 'choose', mode }); step({ type: 'next' });
    step({ type: 'put' }); step({ type: 'next' }); step({ type: 'put' }); step({ type: 'next' });
    step({ type: 'shelf', i: 3 }); step({ type: 'shelf', i: 2 });
    step({ type: 'reset' });
  }

  msgs.push(...collectMsgs(hl.compareRows()));
  return msgs;
}

describe('哈希查找 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键', () => {
    const dir = new URL('../src/ui/vue/scenes/hash-lookup/', import.meta.url);
    const sceneKeys = readdirSync(dir)
      .filter((f) => f.endsWith('.vue'))
      .flatMap((f) => literalKeys(readFileSync(new URL(f, dir), 'utf8'), 'm'));
    // 画面里 m('clash.mode.' + 模式) 这样拼出来的键，引擎的结算里也会用到
    const used = new Set([...keysOf(msgs), ...blockKeys(levelJson, own), ...sceneKeys]);
    expect(sceneKeys.length).toBeGreaterThan(0);
    expect(Object.keys(own).filter((k) => !used.has(k))).toEqual([]);
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

  it('写进文案的数字和引擎常量一致', () => {
    expect(own['predict.intro']).toContain('连对 ' + hl.PREDICT_GOAL + ' 次');
    expect(own['predict.intro']).toContain('0 到 ' + (hl.KID_CAP - 1));
    expect(own['walk.btn.again']).toContain('六本');
    expect(hl.PLAY_BOOKS).toHaveLength(6);
  });
});
