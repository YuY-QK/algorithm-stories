import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { m, mergeCopy, missingKeys } from '../src/core/i18n';
import type { Control, GameRules, Msg } from '../src/core/types';
import { startGame, actGame, interruptGame, resultOf } from '../src/core/flows/game';
import * as pr from '../src/core/flows/predict';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/bfs/copy.zh.json';
import levelJson from '../content/algorithms/bfs/level.json';
import * as bfs from '../src/engine/bfs';
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
    const seen = () => msgs.push(...collectMsgs([step.run.say, step.run.state, rules.controls(step.run.state), rules.hud?.(step.run.state), resultOf(rules, step.run)]));
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

/** 走到 from 的下一格，朝奶酪的方向（最短路上的邻居） */
function toward(mz: bfs.Maze, from: number): number {
  const dist = new Map<number, number>([[mz.end, 0]]);
  const queue = [mz.end];
  for (let h = 0; h < queue.length; h++) {
    for (const nb of bfs.neighbors(mz, queue[h])) if (!dist.has(nb)) { dist.set(nb, dist.get(queue[h])! + 1); queue.push(nb); }
  }
  return bfs.neighbors(mz, from).sort((a, b) => (dist.get(a) ?? 1e9) - (dist.get(b) ?? 1e9))[0] ?? from;
}

function collectAll(): Msg[] {
  const msgs: Msg[] = [];
  const L = bfs.level;

  // 看：三个迷宫
  for (let k = 0; k < bfs.KID_MAZES.length; k++) msgs.push(...collectMsgs(L.look!.story.frames(k)));

  // 逐步执行：四个迷宫、随机迷宫
  const tr = bfs.traceRules;
  for (let k = 0; k < bfs.TRACE_MAZES.length; k++) {
    const input = tr.act(tr.start(), { type: 'which', which: k });
    msgs.push(...collectMsgs(tr.controls(input)));
    for (const step of tr.trace(input)) msgs.push(...collectMsgs([step.note, tr.vars(input, step), tr.summary?.(input, step)]));
  }
  msgs.push(...collectMsgs([tr.jump, tr.foot]));

  // 猜下一步：随机题目，答对答错各种走法
  const pd = L.predict!.main;
  for (let k = 0; k < 200; k++) {
    const puzzle = pd.puzzle(rand);
    msgs.push(...collectMsgs(puzzle));
    let s = pr.startPredict(puzzle);
    for (let guard = 0; guard < 100 && s.phase !== 'end'; guard++) {
      const v = pr.viewOf(s);
      msgs.push(...collectMsgs([v.prompt, v.wrong, v.chips]));
      const ask = puzzle.asks[s.i];
      s = pr.answer(s, rand() < 0.6 ? ask.answer : 'end')?.state ?? pr.proceed(s)!;
      if (s.phase === 'wrong' || s.phase === 'right') s = pr.proceed(s)!;
    }
    msgs.push(...collectMsgs(pr.viewOf(s)));
  }

  // 找 bug：三个坑在演示迷宫和随机迷宫上
  const br = L.bugs!.main;
  const mazes = Array.from({ length: 40 }, () => bfs.genMaze(2 + Math.floor(rand() * 4), 0.25, rand));
  for (const bug of br.bugs) {
    msgs.push(...collectMsgs([bug, br.input(bug), br.jumps]));
    for (const maze of [bug.maze, ...mazes]) {
      const b = { ...bug, maze };
      for (const step of br.run(b)) msgs.push(...collectMsgs([step.note, br.vars(step, b), br.verdict(step, b)]));
    }
  }

  // 玩和挑战：随机玩很多局
  const cells = (s: { rows?: string[]; which?: number }) => (s.rows ? s.rows.join('').length : bfs.KID_MAZES[s.which!].join('').length);
  const randomTap = (s: { rows?: string[]; which?: number }) => ({ type: 'tap' as const, id: Math.floor(rand() * cells(s)) });
  fuzzGame(L.games!.rings, (s: bfs.RingsState): bfs.RingsAction[] => {
    const wv = bfs.waves(bfs.parseMaze(bfs.KID_MAZES[s.which]));
    return [randomTap(s), { type: 'tap', id: pickOf(wv.rings[s.ring] ?? [0]) }, { type: 'tap', id: pickOf(wv.rings[s.ring] ?? [0]) }];
  }, 150, msgs);
  fuzzGame(L.games!.draw, (s: bfs.DrawState): bfs.DrawAction[] => {
    const mz = bfs.parseMaze(bfs.KID_MAZES[s.which]);
    const near = bfs.around(mz, s.path.at(-1)!).filter((x): x is number => x !== null);
    return [randomTap(s), { type: 'tap', id: pickOf(near) }, { type: 'tap', id: toward(mz, s.path.at(-1)!) }, { type: 'tap', id: toward(mz, s.path.at(-1)!) }, { type: 'undo' }];
  }, 150, msgs);
  fuzzGame(L.games!.challenge, (s: bfs.ChallengeState): bfs.ChallengeAction[] => {
    const mz = bfs.parseMaze(s.rows);
    const near = bfs.around(mz, s.path.at(-1)!).filter((x): x is number => x !== null);
    return [randomTap(s), { type: 'tap', id: pickOf(near) }, { type: 'tap', id: toward(mz, s.path.at(-1)!) }, { type: 'tap', id: toward(mz, s.path.at(-1)!) }, { type: 'tap', id: toward(mz, s.path.at(-1)!) }];
  }, 300, msgs);
  // 只在极端输入下才走到的两句（页面里几乎碰不到，但代码里有这个分支）
  msgs.push(m('trace.tooLong'), m('predict.endNo'));
  return msgs;
}

describe('BFS 文案', () => {
  const msgs = collectAll();

  it('引擎产生的每一个 Msg 在文案表里都有，模板里的参数都给了', () => {
    expect(msgs.length).toBeGreaterThan(1000);
    const missing = new Set(msgs.flatMap((x) => missingKeys(x, copy)));
    expect([...missing]).toEqual([]);
  });

  it('文案表里没有用不到的键：键要么被引擎用到，要么是块的标题、说明、目标、正文，要么是画面用的', () => {
    const dir = new URL('../src/ui/vue/scenes/bfs/', import.meta.url);
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
    expect(bfs.predictRules.goal).toBe(5);
    expect(own['predict.intro']).toContain('连对');
  });
});
