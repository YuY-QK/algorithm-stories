import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mergeCopy, missingKeys } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, tickGame, interruptGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/stack/copy.zh.json';
import levelJson from '../content/algorithms/stack/level.json';
import * as st from '../src/engine/stack';
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
    else if (c.type === 'text') out.push(c.submit('([x]'));
    else if (c.type === 'transport') out.push(...(['reset', 'prev', 'toggle', 'next', { speed: 700 }] as const).map((op) => c.act(op)));
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
  const L = st.level;

  // 看
  msgs.push(...collectMsgs(L.look!.story.frames(L.look!.story.first)));

  // 逐步执行：预设、随机括号串
  const tr = st.traceRules;
  const all = st.OPENERS + st.CLOSERS;
  for (let k = 0; k < 400; k++) {
    let input = tr.start(rand);
    if (k % 3 === 0) input = tr.act(input, { type: 'preset', kind: pickOf(['good', 'cross', 'left', 'extra'] as const) }, rand);
    else if (k % 3 === 1) input = tr.act(input, { type: 'text', s: Array.from({ length: k % 14 }, () => all[Math.floor(rand() * 6)]).join('') }, rand);
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
      msgs.push(...collectMsgs([v.prompt, v.wrong, v.right]));
      const ask = puzzle.asks[s.i];
      const right = rand() < 0.6;
      s = pr.answer(s, right ? ask.answer : 'nope')?.state ?? pr.proceed(s)!;
      if (s.phase === 'wrong' || s.phase === 'right') s = pr.proceed(s)!;
    }
    msgs.push(...collectMsgs(pr.viewOf(s)));
  }

  // 找 bug
  const br = L.bugs!.main;
  for (const bug of br.bugs) {
    msgs.push(...collectMsgs([bug, br.input(bug)]));
    // 换些别的括号串，让有 bug 的代码也跑到其他分支
    const inputs = [bug.input, ')', '(', '(]', '()', ...Array.from({ length: 30 }, () => Array.from({ length: 1 + Math.floor(rand() * 8) }, () => all[Math.floor(rand() * 6)]).join(''))];
    for (const input of inputs) {
      const b = { ...bug, input };
      for (const step of br.run(b)) msgs.push(...collectMsgs([step.note, br.vars(step, b), br.verdict(step, b)]));
    }
  }

  // 玩和挑战：随机玩很多局
  fuzzGame(L.games!.plates, (s: st.PlatesGame): st.PlatesAction[] => [
    { type: 'pick', plate: pickOf(s.stack.length ? s.stack : [0]) },
    { type: 'pick', plate: s.stack[st.topIndex(s.stack)] ?? 0 },
    { type: 'pick', plate: s.stack[st.topIndex(s.stack)] ?? 0 },
  ], 200, msgs);
  fuzzGame(L.games!.blocks, (): st.BlocksAction[] => [
    { type: 'act', choice: pickOf(['push', 'pop', 'stuck'] as const) },
    { type: 'finish', choice: pickOf(['clear', 'left'] as const) },
    { type: 'next' },
    { type: 'again' },
  ], 400, msgs);
  fuzzGame(L.games!.challenge, (s: st.PermGame): st.PermAction[] => [
    { type: 'judge', yes: rand() < 0.5 },
    { type: 'judge', yes: st.permView(s).truth },
    { type: 'next' },
    { type: 'restart' },
  ], 200, msgs);
  // 挑战的画面直接读 permView 里的每一步说明
  for (let k = 0; k < 40; k++) for (const p of st.genChallenge(rand)) msgs.push(...collectMsgs(st.permTrace(st.CHALLENGE_N, p)));

  // 延伸
  msgs.push(...collectMsgs(st.compareRows()));
  return msgs;
}

describe('栈 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键：键要么被引擎用到，要么是块的标题、说明、目标、正文，要么是画面用的', () => {
    const dir = new URL('../src/ui/vue/scenes/stack/', import.meta.url);
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

  it('块的目标提示和说明里写死的数字，和引擎常量一致', () => {
    expect(own['challenge.goal']).toContain('1 到 ' + st.CHALLENGE_N);
    expect(own['perm.tip2']).toContain('1 到 ' + st.CHALLENGE_N + ' 的 120 种顺序里，能做到的只有 42 种');
    expect(own['predict.intro']).toContain('连对 ' + st.predictRules.goal + ' 次过关');
    expect(own['trace.input']).toContain('{max}');
    expect(st.TRACE_MAX).toBe(16);
  });
});
