import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mergeCopy, missingKeys } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, tickGame, interruptGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/lru-cache/copy.zh.json';
import levelJson from '../content/algorithms/lru-cache/level.json';
import * as lru from '../src/engine/lru-cache';
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
    for (let k = 0; k < 120; k++) {
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
  const L = lru.level;

  // 看
  msgs.push(...collectMsgs(L.look!.story.frames(L.look!.story.first)));

  // 逐步执行：经典例子和随机序列，各种容量
  const tr = lru.traceRules;
  for (let k = 0; k < 150; k++) {
    let input = tr.start(rand);
    input = tr.act(input, { type: 'cap', n: pickOf([2, 3]) }, rand);
    if (k % 2) input = tr.act(input, { type: 'random' }, rand);
    msgs.push(...collectMsgs(tr.controls(input)));
    for (const step of tr.trace(input)) msgs.push(...collectMsgs([step.note, tr.vars(input, step)]));
  }

  // 猜下一步：随机题目，答对答错各走一遍
  const pd = L.predict!.main;
  for (let k = 0; k < 400; k++) {
    const puzzle = pd.puzzle(rand);
    msgs.push(...collectMsgs(puzzle));
    let s = pr.startPredict(puzzle);
    msgs.push(...collectMsgs(pr.viewOf(s)));
    const ask = puzzle.asks[0];
    s = pr.answer(s, rand() < 0.5 ? ask.answer : -1)!.state;
    msgs.push(...collectMsgs(pr.viewOf(s)));
  }

  // 找 bug：换些别的操作序列，让有 bug 的代码也跑到其他分支
  const br = L.bugs!.main;
  for (const bug of br.bugs) {
    msgs.push(...collectMsgs([bug, br.input(bug)]));
    const variants = [bug.ops, ...Array.from({ length: 60 }, () => lru.genOps(4 + Math.floor(rand() * 8), 4, rand))];
    for (const ops of variants) {
      const b = { ...bug, ops };
      for (const step of br.run(b)) msgs.push(...collectMsgs([step.note, br.vars(step, b), br.verdict(step, b)]));
    }
  }

  // 玩和挑战：随机玩很多局
  fuzzGame(L.games!.evict, (s: lru.EvictGame): lru.EvictAction[] => {
    const a = lru.evictAccess(s);
    return [
      { type: 'desk', book: s.desk[0] ?? 1 },
      { type: 'desk', book: s.desk.at(-1) ?? 1 },
      { type: 'desk', book: a.book },
      { type: 'shelf', book: a.book },
      { type: 'shelf', book: 1 + Math.floor(rand() * lru.EVICT_BOOKS) },
      s.phase === 'evict' ? { type: 'desk', book: s.desk[0] } : { type: 'desk', book: a.book },
    ];
  }, 150, msgs);
  fuzzGame(L.games!.trips, (): lru.TripsAction[] => [
    { type: 'guess', g: 'hit' }, { type: 'guess', g: 'miss' }, { type: 'guess', g: pickOf(['hit', 'miss'] as const) },
  ], 150, msgs);
  fuzzGame(L.games!.challenge, (s: lru.ChallengeState): lru.ChallengeAction[] => [
    { type: 'guess', n: Math.floor(rand() * 24) - 2 }, { type: 'invalid' }, { type: 'next' }, { type: 'next' },
    { type: 'guess', n: lru.challengeReveal({ ...s, shown: true, guess: 0 }).lru },
  ], 100, msgs);
  // 挑战揭晓后的比较句
  for (let k = 0; k < 100; k++) {
    const g = startGame(L.games!.challenge, rand).run.state as lru.ChallengeState;
    msgs.push(...collectMsgs(lru.challengeReveal({ ...g, shown: true, guess: Math.floor(rand() * 20) }).compare));
  }
  msgs.push(...collectMsgs(lru.compareRows()));
  return msgs;
}

describe('LRU 缓存 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键：键要么被引擎用到，要么是块的标题、说明、目标、正文，要么是画面用的，要么是覆盖共用文案的 ui.* 键', () => {
    const dir = new URL('../src/ui/vue/scenes/lru-cache/', import.meta.url);
    const sceneKeys = readdirSync(dir)
      .filter((f) => f.endsWith('.vue') || (f.endsWith('.ts') && f !== 'index.ts'))
      .flatMap((f) => literalKeys(readFileSync(new URL(f, dir), 'utf8'), 'm'));
    const used = new Set([...keysOf(msgs), ...blockKeys(levelJson, own), ...sceneKeys]);
    expect(sceneKeys.length).toBeGreaterThan(0);
    const unused = Object.keys(own).filter((k) => !used.has(k) && !k.startsWith('ui.'));
    expect(unused).toEqual([]);
    // 画面用的键都在文案表里
    expect(sceneKeys.filter((k) => !(k in own))).toEqual([]);
    // 覆盖共用的键，共用文案里要真有
    for (const k of Object.keys(own).filter((x) => x.startsWith('ui.'))) expect(k in (coreCopy as Record<string, string>), k).toBe(true);
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

  it('块的说明里写死的数字，和引擎常量一致；猜下一步答错后的按钮写「下一题」（这一关没有结局页）', () => {
    expect(own['predict.intro']).toContain('连对 ' + lru.predictRules.goal + ' 次过关');
    expect(own['ui.predict.cont']).toBe('下一题');
    expect(own['trips.note.small']).toContain('{n}');
    expect(levelJson.play.map((b: { sayLines?: number; saySize?: string }) => [b.sayLines, b.saySize])).toEqual([[2, 'small'], [2, 'small']]);
  });
});
