import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mergeCopy, missingKeys } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, tickGame, interruptGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/queue/copy.zh.json';
import levelJson from '../content/algorithms/queue/level.json';
import * as q from '../src/engine/queue';
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
      const quiz = resultOf(rules, step.run)?.quiz?.options ?? [];
      const a = pickOf([...actionsOf(rules.controls(step.run.state)), ...actionsOf(quiz), ...extra(step.run.state)]);
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
  const L = q.level;

  // 看
  msgs.push(...collectMsgs(L.look!.story.frames(L.look!.story.first)));

  // 逐步执行：三组预设、随机序列
  const tr = q.traceRules;
  for (let k = 0; k < 300; k++) {
    let input = tr.start(rand);
    if (k % 3 === 1) input = tr.act(input, { type: 'which', which: 'full' }, rand);
    else if (k % 3 === 2) input = tr.act(input, { type: 'which', which: 'random' }, rand);
    if (k % 5 === 0) input = tr.act(input, { type: 'again' }, rand);
    msgs.push(...collectMsgs(tr.controls(input)));
    for (const step of tr.trace(input)) msgs.push(...collectMsgs([step.note, tr.vars(input, step), tr.summary?.(input, step)]));
  }

  // 猜下一步：随机题目，答对答错各种走法
  const pd = L.predict!.main;
  for (let k = 0; k < 400; k++) {
    const puzzle = pd.puzzle(rand);
    msgs.push(...collectMsgs(puzzle));
    let s = pr.startPredict(puzzle);
    for (let guard = 0; guard < 100 && s.phase !== 'end'; guard++) {
      const v = pr.viewOf(s);
      msgs.push(...collectMsgs([v.prompt, v.wrong, v.right, v.chips, v.options]));
      const ask = puzzle.asks[s.i];
      const right = rand() < 0.6;
      s = pr.answer(s, right ? ask.answer : 'full')?.state ?? pr.proceed(s)!;
      if (s.phase === 'wrong' || s.phase === 'right') s = pr.proceed(s)!;
    }
    msgs.push(...collectMsgs(pr.viewOf(s)));
  }

  // 找 bug：换些别的操作序列，让有 bug 的代码也跑到其他分支
  const br = L.bugs!.main;
  for (const bug of br.bugs) {
    msgs.push(...collectMsgs([bug, br.input(bug)]));
    const variants = [bug.ops, ...Array.from({ length: 40 }, () => q.randomOps(bug.cap, 6 + Math.floor(rand() * 8), rand))];
    for (const ops of variants) {
      const b = { ...bug, ops };
      for (const step of br.run(b)) msgs.push(...collectMsgs([step.note, br.vars(step, b), br.verdict(step, b)]));
    }
  }

  // 玩和挑战：随机玩很多局
  fuzzGame(L.games!.next, (s: q.NextGame): q.NextAction[] => [
    { type: 'pick', who: pickOf(s.line.length ? s.line : ['🐼']) },
    { type: 'pick', who: s.line[0] ?? '🐼' },
    { type: 'pick', who: s.line[0] ?? '🐼' },
    { type: 'pick', who: q.BIG },
  ], 200, msgs);
  fuzzGame(L.games!.clerk, (s: q.ClerkState): q.ClerkAction[] => {
    const c = q.clerkCard(s);
    return [{ type: 'pick', i: Math.floor(rand() * q.SEATS) }, { type: 'pick', i: c ? q.cardAnswer(s.ring, c) : 0 }, { type: 'pick', i: c ? q.cardAnswer(s.ring, c) : 0 }];
  }, 200, msgs);
  fuzzGame(L.games!.challenge, (s: q.ChallengeState): q.ChallengeAction[] => [
    { type: 'cell', k: Math.floor(rand() * q.CHALLENGE_CAP), v: pickOf(['', ...q.challengeView(s).values.map(String)]) },
    { type: 'reveal' },
  ], 100, msgs);
  // 挑战揭晓后画面里的文案由画面自己取，这里只确认评分不报错
  msgs.push(...collectMsgs(q.compareRows()));
  return msgs;
}

describe('队列 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键：键要么被引擎用到，要么是块的标题、说明、目标、正文，要么是画面用的', () => {
    const dir = new URL('../src/ui/vue/scenes/queue/', import.meta.url);
    const sceneKeys = readdirSync(dir)
      .filter((f) => f.endsWith('.vue') || (f.endsWith('.ts') && f !== 'index.ts'))
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

  it('块的目标提示和说明里写死的数字，和引擎常量一致', () => {
    expect(own['challenge.goal']).toContain('容量 ' + q.CHALLENGE_CAP);
    expect(own['predict.intro']).toContain('连对 ' + q.predictRules.goal + ' 次过关');
    expect(own['look.open']).toContain(q.SEATS + ' 把椅子');
    expect(own['clerk.goal']).toContain((q.SEATS - 1) + ' 号后面');
  });
});
