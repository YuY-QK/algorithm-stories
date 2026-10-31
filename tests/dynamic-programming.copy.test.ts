import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mergeCopy, missingKeys } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, tickGame, interruptGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/dynamic-programming/copy.zh.json';
import levelJson from '../content/algorithms/dynamic-programming/level.json';
import * as dp from '../src/engine/dynamic-programming';
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
    else if (c.type === 'number') out.push(c.submit(Math.floor(rand() * 8)));
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
  const L = dp.level;

  // 看
  msgs.push(...collectMsgs(L.look!.story.frames(L.look!.story.first)));

  // 逐步执行：每种楼梯级数
  const tr = dp.traceRules;
  for (const n of [5, 8, 12]) {
    const input = tr.act(tr.start(rand), { type: 'n', n }, rand);
    msgs.push(...collectMsgs(tr.controls(input)));
    for (const step of tr.trace(input)) msgs.push(...collectMsgs([step.note, tr.vars(input, step), tr.summary?.(input, step)]));
  }

  // 猜下一步：随机题目，答对答错各种走法（点两格、选值、动画）
  const pd = L.predict!.main;
  for (let k = 0; k < 300; k++) {
    const puzzle = pd.puzzle(rand);
    msgs.push(...collectMsgs(puzzle));
    for (const ask of puzzle.asks) if (ask.whyFor) for (let c = 0; c < puzzle.asks[0].view.dp.length; c++) msgs.push(...collectMsgs(ask.whyFor(c)));
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
      const good = ask.collect ? pickOf(ask.collect) : ask.answer;
      s = pr.answer(s, rand() < 0.6 ? good : -1)?.state ?? s;
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
  fuzzGame(L.games!.count, (g: dp.CountGame): dp.CountAction[] => [
    { type: 'hop', h: 1 }, { type: 'hop', h: 2 }, { type: 'hop', h: 1 }, { type: 'hop', h: 2 },
    { type: 'choose', v: pickOf(dp.noteOptions(dp.countLevel(g))) }, { type: 'choose', v: dp.ways(dp.countLevel(g)) }, { type: 'choose', v: dp.ways(dp.countLevel(g)) },
  ], 400, msgs);
  fuzzGame(L.games!.notes, (g: dp.NotesGame): dp.NotesAction[] => {
    const all = dp.flatten(dp.notesRoot(g));
    const look = dp.notesLookups(g);
    return [{ type: 'pick', id: pickOf(all).id }, { type: 'pick', id: pickOf(all).id }, ...(look.length ? [{ type: 'pick' as const, id: pickOf(look).id }] : [])];
  }, 400, msgs);
  fuzzGame(L.games!.challenge, (g: dp.GridGame): dp.GridAction[] => {
    const cur = dp.gridCur(g);
    return [{ type: 'fill', n: cur ? dp.gridTable(g.rocks)[cur[0]][cur[1]] : 0 }, { type: 'fill', n: cur ? dp.gridTable(g.rocks)[cur[0]][cur[1]] : 0 }, { type: 'empty' }];
  }, 300, msgs);

  // 延伸
  msgs.push(...collectMsgs(dp.compareRows()));
  return msgs;
}

describe('动态规划 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键：键要么被引擎用到，要么是块的标题、说明、目标、正文，要么是画面用的', () => {
    const dir = new URL('../src/ui/vue/scenes/dynamic-programming/', import.meta.url);
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
    expect(own['predict.intro']).toContain('连对 ' + dp.level.predict!.main.goal + ' 次过关');
  });
});
