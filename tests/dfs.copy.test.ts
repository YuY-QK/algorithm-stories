import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { m, mergeCopy, missingKeys } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, tickGame, interruptGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/dfs/copy.zh.json';
import levelJson from '../content/algorithms/dfs/level.json';
import * as dfs from '../src/engine/dfs';
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

/** 随机玩很多局，把沿途所有 Msg 收集起来（自动步骤也走完） */
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
    for (let k = 0; k < 150; k++) {
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

/** 站在 from，按规则下一步该去的格子（没有就原地） */
const nextCell = (mz: dfs.Maze, visited: boolean[], from: number) => {
  const c = dfs.expectedChoice(mz, visited, from);
  return c === dfs.BACK ? from : dfs.around(mz, from)[c]!;
};

function collectAll(): Msg[] {
  const msgs: Msg[] = [];
  const L = dfs.level;

  // 看：三个山洞
  for (let k = 0; k < dfs.KID_MAZES.length; k++) msgs.push(...collectMsgs(L.look!.story.frames(k)));

  // 逐步执行：四个山洞
  const tr = dfs.traceRules;
  for (let k = 0; k < dfs.TRACE_MAZES.length; k++) {
    const input = tr.act(tr.start(), { type: 'which', which: k });
    msgs.push(...collectMsgs(tr.controls(input)));
    for (const step of tr.trace(input)) msgs.push(...collectMsgs([step.note, tr.vars(input, step), tr.summary?.(input, step)]));
  }
  msgs.push(...collectMsgs([tr.jump, tr.jumps, tr.foot]));

  // 猜下一步：随机题目，答对答错各种走法
  const pd = L.predict!.main;
  for (let k = 0; k < 200; k++) {
    const puzzle = pd.puzzle(rand);
    msgs.push(...collectMsgs(puzzle));
    let s = pr.startPredict(puzzle);
    for (let guard = 0; guard < 100 && s.phase !== 'end'; guard++) {
      const v = pr.viewOf(s);
      msgs.push(...collectMsgs([v.prompt, v.wrong, v.chips, v.options, v.praise]));
      const ask = puzzle.asks[s.i];
      s = pr.answer(s, rand() < 0.6 ? ask.answer : 'end')?.state ?? pr.proceed(s)!;
      if (s.phase === 'wrong' || s.phase === 'right') s = pr.proceed(s)!;
    }
    msgs.push(...collectMsgs(pr.viewOf(s)));
  }

  // 找 bug：三个坑在演示山洞和随机山洞上
  const br = L.bugs!.main;
  const mazes = Array.from({ length: 150 }, () => dfs.genMaze(2 + Math.floor(rand() * 4), 0.25, rand));
  for (const bug of br.bugs) {
    msgs.push(...collectMsgs([bug, br.input(bug), br.jumps]));
    // 最后一个山洞让「走到洞口外面」的坑先从下边越界（读第 h 行）
    for (const maze of [bug.maze, ...mazes, ['S#E', '.#.', '.#.']]) {
      const b = { ...bug, maze };
      for (const step of br.run(b)) msgs.push(...collectMsgs([step.note, br.vars(step, b), br.verdict(step, b)]));
    }
  }

  // 玩和挑战：随机玩很多局，另外每一步都有一些「照规则走」的操作，好走到赢
  fuzzGame(L.games!.explore, (s: dfs.ExploreState): dfs.ExploreAction[] => {
    const mz = parseMazeOf(s.which);
    const good = dfs.expectedChoice(mz, s.visited, s.path.at(-1)!);
    return [{ type: 'choose', c: pickOf([0, 1, 2, 3, 4]) as dfs.Choice }, { type: 'choose', c: good }, { type: 'choose', c: good }, { type: 'choose', c: good }];
  }, 200, msgs);
  fuzzGame(L.games!.islands, (s: dfs.IslandsState): dfs.IslandsAction[] => {
    const map = dfs.parseIslands(dfs.ISLAND_MAPS[s.which]);
    const total = dfs.islands(map).length;
    const lands = dfs.islands(map).flat();
    return [
      { type: 'tap', id: Math.floor(rand() * map.w * map.h) }, { type: 'tap', id: pickOf(lands) }, { type: 'tap', id: pickOf(lands) },
      { type: 'count', n: pickOf([total - 1, total, total, total + 1]) },
    ];
  }, 200, msgs);
  fuzzGame(L.games!.challenge, (s: dfs.ChallengeState): dfs.ChallengeAction[] => {
    const mz = dfs.parseMaze(s.rows);
    return [
      { type: 'tap', id: Math.floor(rand() * mz.w * mz.h) }, { type: 'tap', id: dfs.visitOrder(mz, 'dfs')[s.k - 1] }, { type: 'tap', id: pickOf(dfs.visitOrder(mz, 'bfs')) },
      { type: 'hint' },
    ];
  }, 200, msgs);
  // 页面出的题都走得到宝藏；走不到的山洞（逐步执行里有一个）也跑一遍解释，覆盖「搜索结束」那几句
  for (const t of dfs.TRACE_MAZES) msgs.push(...collectMsgs(dfs.rounds(dfs.parseMaze(t.rows))));
  // 只在极端输入下才走到的句子（页面里几乎碰不到，但代码里有这个分支）
  msgs.push(m('trace.tooLong'));
  void nextCell;
  return msgs;
}

const parseMazeOf = (which: number) => dfs.parseMaze(dfs.PLAY_MAZES[which]);

describe('DFS 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键：键要么被引擎用到，要么是块的标题、说明、目标、正文，要么是画面用的', () => {
    const dir = new URL('../src/ui/vue/scenes/dfs/', import.meta.url);
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

  it('块说明里写死的数字，和引擎常量一致', () => {
    expect(dfs.predictRules.goal).toBe(5);
    expect(own['predict.intro']).toContain('连对');
    expect(own['bug.noMark.explain']).toContain('第 ' + dfs.L.skip + ' 行');
    expect(own['bug.bounds.explain']).toContain('第 ' + dfs.L.skip + ' 行');
  });
});
