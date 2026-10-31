import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mergeCopy, missingKeys } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, tickGame, interruptGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/merge-sort/copy.zh.json';
import levelJson from '../content/algorithms/merge-sort/level.json';
import * as ms from '../src/engine/merge-sort';
import { asCopy, blockKeys, collectMsgs, keysOf, literalKeys } from './helpers/copy';
import { seeded } from './helpers/seeded';

// 文案测试（docs/refactor-plan.md 7.3）：跑遍引擎产生的 Msg，缺键为空；文案表里没有用不到的键
const copy = mergeCopy(asCopy(coreCopy), asCopy(levelCopy));
const own = asCopy(levelCopy);
const rand = seeded(2027);
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
  const L = ms.level;

  // 看：故事里的那一队，和很多随机的一队
  const look = L.look!.story;
  msgs.push(...collectMsgs(look.frames(look.first)));
  for (let k = 0; k < 100; k++) msgs.push(...collectMsgs(look.frames(look.next(look.first, rand))));
  // 队伍更长时对半分的页更多（「再分」）
  msgs.push(...collectMsgs(look.frames(ms.dealKids(9, rand))));

  // 逐步执行：三种初始顺序、三种大小
  const tr = ms.traceRules;
  for (let k = 0; k < 120; k++) {
    let input = tr.start(rand);
    input = tr.act(input, { type: 'size', n: pickOf([4, 6, 8]) }, rand);
    input = tr.act(input, { type: 'kind', kind: pickOf(['random', 'sorted', 'reversed'] as const) }, rand);
    msgs.push(...collectMsgs(tr.controls(input)));
    for (const step of tr.trace(input)) msgs.push(...collectMsgs([step.note, tr.vars(input, step), tr.summary?.(input, step)]));
  }
  msgs.push(...collectMsgs([tr.jumps, tr.foot]));
  // 数组太长、步数超过上限时的说明
  msgs.push(...collectMsgs(ms.buildTrace(ms.genArray(2000, 50, rand)).map((x) => x.note)));

  // 猜下一步：随机题目，答对答错各走一遍
  const pd = L.predict!.main;
  for (let k = 0; k < 400; k++) {
    const puzzle = pd.puzzle(rand);
    msgs.push(...collectMsgs(puzzle));
    let s = pr.startPredict(puzzle);
    msgs.push(...collectMsgs(pr.viewOf(s)));
    const ask = puzzle.asks[0];
    const right = rand() < 0.5;
    s = pr.answer(s, right ? ask.answer : 'nope')!.state;
    msgs.push(...collectMsgs(pr.viewOf(s)));
  }

  // 找 bug：换些别的输入，让有 bug 的代码也跑到其他分支
  const br = L.bugs!.main;
  for (const bug of br.bugs) {
    msgs.push(...collectMsgs([bug, br.input(bug)]));
    const variants = [bug.values, ...Array.from({ length: 60 }, () => ms.genArray(1 + Math.floor(rand() * 7), rand() < 0.5 ? 3 : 20, rand))];
    for (const values of variants) {
      const b = { ...bug, values };
      for (const step of br.run(b)) msgs.push(...collectMsgs([step.note, br.vars(step, b), br.verdict(step, b)]));
    }
  }

  // 玩和挑战：随机玩很多局
  fuzzGame(L.games!.merge, (s: ms.MergeGame): ms.MergeAction[] => {
    const side = s.values[s.left[0]] <= s.values[s.right[0]] ? 'L' : 'R';
    return [{ type: 'pick', side: pickOf(['L', 'R'] as const) }, { type: 'pick', side }, { type: 'pick', side }];
  }, 150, msgs);
  fuzzGame(L.games!.split, (s: ms.SplitGame): ms.SplitAction[] => {
    const row = s.rows[s.rows.length - 1].filter((p) => p.size > 1);
    const p = pickOf(row.length ? row : [{ start: 0, size: 2 }]);
    return [
      { type: 'cut', start: p.start, at: 1 + Math.floor(rand() * Math.max(1, p.size - 1)) },
      { type: 'cut', start: p.start, at: p.size / 2 },
      { type: 'cut', start: p.start, at: p.size / 2 },
      { type: 'answer', c: pickOf([1, 2, 3, 4]) },
      { type: 'answer', c: ms.splitTotal(s) },
    ];
  }, 150, msgs);
  fuzzGame(L.games!.challenge, (): ms.ChallengeAction[] => [
    { type: 'add', v: 1 + Math.floor(rand() * ms.CHALLENGE_N) },
    { type: 'add', v: 1 + Math.floor(rand() * ms.CHALLENGE_N) },
    { type: 'mode', mode: pickOf(['max', 'min'] as const) },
    { type: 'undo' },
    { type: 'peek' },
  ], 150, msgs);
  // 挑战的题干：各种目标、试了几次、排满没有
  for (const mode of ['max', 'min'] as const) {
    for (const tries of [0, 1, 2, 3]) {
      for (const len of [0, 3, ms.CHALLENGE_N]) msgs.push(...collectMsgs(ms.challengeNote({ mode, tries, line: Array.from({ length: len }, (_, k) => k + 1) })));
    }
  }
  msgs.push(...collectMsgs(ms.compareRows()));
  return msgs;
}

describe('归并排序 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键：键要么被引擎用到，要么是块的标题、说明、目标、正文，要么是画面用的，要么是覆盖共用文案的 ui.* 键', () => {
    const dir = new URL('../src/ui/vue/scenes/merge-sort/', import.meta.url);
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
    expect(own['predict.intro']).toContain('连对 ' + ms.predictRules.goal + ' 次过关');
    expect(own['ui.predict.cont']).toBe('下一题');
    expect(own['chal.hint.deep']).toContain('左 ' + ms.CHALLENGE_N / 2 + ' 个对右 ' + ms.CHALLENGE_N / 2 + ' 个');
    expect(levelJson.play[1]).toMatchObject({ id: 'split', sayLines: 2 });
  });
});
