import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pr from '../src/core/flows/predict';
import { FOLLOW_END, FOLLOW_STEP, PAUSE_SHORT } from '../src/core/timing';
import type { Control } from '../src/core/types';
import {
  CHALLENGE_N, STORY_KIDS, challengeRules, challengeNote, compareBounds, level, mergeRules, predictRules, splitRules, traceRules,
  buildTrace, worstCase, type ChallengeAction, type ChallengeState, type MergeAction, type MergeGame, type SplitAction, type SplitGame,
} from '../src/engine/merge-sort';
import { driver } from './helpers/game';
import { seeded } from './helpers/seeded';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');
const vals = (g: MergeGame, ids: number[]) => ids.map((id) => g.values[id]);

describe('玩法一「合并两队」', () => {
  /** 当前该点的一边（矮的，相等取左） */
  const right = (g: MergeGame): MergeAction => ({ type: 'pick', side: g.values[g.left[0]] <= g.values[g.right[0]] ? 'L' : 'R' });
  const wrong = (g: MergeGame): MergeAction => ({ type: 'pick', side: g.values[g.left[0]] <= g.values[g.right[0]] ? 'R' : 'L' });

  function playThrough(mistakeAt: number[] = [], rand = seeded(5)) {
    const d = driver(mergeRules, rand);
    let k = 0;
    while (d.state.phase === 'pick') {
      if (mistakeAt.includes(k)) d.act(wrong(d.state));
      d.act(right(d.state));
      d.settle();
      k++;
    }
    return d;
  }

  it('开局：两队各 3 到 4 个、已经排好，台词让孩子点更矮的队头；画面能点，没有按钮', () => {
    const d = driver(mergeRules, seeded(1));
    expect(d.say).toEqual(m('merge.say.start'));
    expect(d.state.phase).toBe('pick');
    expect(d.state.out).toEqual([]);
    for (const q of [d.state.left, d.state.right]) {
      expect(q.length).toBeGreaterThanOrEqual(3);
      expect(q.length).toBeLessThanOrEqual(4);
      const v = vals(d.state, q);
      expect(v).toEqual([...v].sort((a, b) => a - b));
    }
    expect(mergeRules.clickable(d.state)).toBe(true);
    expect(mergeRules.controls(d.state)).toEqual([]);
    expect(mergeRules.result!(d.state)).toBeNull();
  });

  it('点错不说错：被点的摇一摇，更矮的透光，台词让孩子再比一比；队伍不动，出「错」声', () => {
    const d = driver(mergeRules, seeded(2));
    const g = d.state;
    const w = wrong(g) as Extract<MergeAction, { type: 'pick' }>;
    const picked = w.side === 'L' ? g.left[0] : g.right[0];
    const other = w.side === 'L' ? g.right[0] : g.left[0];
    d.act(w);
    expect(d.sounds).toEqual(['wrong']);
    expect(d.state.mistakes).toBe(1);
    expect(d.state.shake).toEqual([picked, 1]);
    expect(d.state.glow).toBe(other);
    expect(d.state.left).toEqual(g.left);
    expect(d.state.right).toEqual(g.right);
    expect(d.say).toEqual(m('merge.say.compare', { a: g.values[picked], b: g.values[other] }));
    d.act(wrong(d.state));
    expect(d.state.shake).toEqual([picked, 2]);
    expect(d.state.mistakes).toBe(2);
  });

  it('点对：队头走进新队伍，透光收起，出「对」声，台词讲这一对', () => {
    const d = driver(mergeRules, seeded(2));
    d.act(wrong(d.state));
    const g = d.state;
    const r = right(g) as Extract<MergeAction, { type: 'pick' }>;
    const id = r.side === 'L' ? g.left[0] : g.right[0];
    const other = r.side === 'L' ? g.right[0] : g.left[0];
    d.act(r);
    expect(d.state.out).toEqual([id]);
    expect(d.state.moved).toBe(id);
    expect(d.state.glow).toBeNull();
    expect(d.sounds).toEqual(['wrong', 'right']);
    expect(d.say).toEqual(m('merge.say.next', { a: g.values[id], b: g.values[other] }));
  });

  it('一队走光后：剩下的一个个自动跟上，间隔 FOLLOW_STEP，最后停 FOLLOW_END，出「赢」声', () => {
    const d = driver(mergeRules, seeded(7));
    while (d.state.phase === 'pick') d.act(right(d.state));
    expect(d.state.phase).toBe('tail');
    const rest = d.state.left.length || d.state.right.length;
    const side = d.state.left.length ? 'R' : 'L'; // 走光的是另一边
    expect(d.say).toEqual(m(side === 'R' ? 'merge.say.tailR' : 'merge.say.tailL'));
    expect(mergeRules.clickable(d.state)).toBe(false);
    expect(d.act({ type: 'pick', side: 'L' })).toBe(false);
    d.settle();
    expect(d.afters.slice(-(rest + 1))).toEqual([...Array(rest).fill(FOLLOW_STEP), FOLLOW_END]);
    expect(d.state.phase).toBe('done');
    expect(d.state.moved).toBeNull();
    expect(d.sounds.at(-1)).toBe('win');
    expect(d.say).toEqual(m('merge.say.done'));
  });

  it('合成的新队伍就是排好的：从矮到高；一次不错三颗星，之后可以再来一局', () => {
    const d = playThrough();
    const v = vals(d.state, d.state.out);
    expect(v).toEqual([...v].sort((a, b) => a - b));
    expect(d.state.out).toHaveLength(d.state.values.length);
    expect(mergeRules.result!(d.state)).toEqual({ stars: 3, body: m('merge.done') });
    const bs = buttons(mergeRules.controls(d.state));
    expect(bs).toHaveLength(1);
    expect(bs[0].look).toBe('primary');
    d.act(bs[0].action);
    expect(d.state.phase).toBe('pick');
    expect(d.state.out).toEqual([]);
    expect(d.state.mistakes).toBe(0);
    expect(d.say).toEqual(m('merge.say.start'));
  });

  it('星星：错 1、2 次两颗，错 3 次以上一颗', () => {
    expect(mergeRules.result!(playThrough([0]).state)!.stars).toBe(2);
    expect(mergeRules.result!(playThrough([0, 1]).state)!.stars).toBe(2);
    expect(mergeRules.result!(playThrough([0, 1, 2]).state)!.stars).toBe(1);
  });

  it('没结束时「再来一局」不接受；切标签时跟随动画中途重开一局，别的时候不动', () => {
    const d = driver(mergeRules, seeded(7));
    expect(d.act({ type: 'again' })).toBe(false);
    d.interrupt();
    expect(d.state.mistakes).toBe(0);
    while (d.state.phase === 'pick') d.act(right(d.state));
    expect(d.state.phase).toBe('tail');
    d.interrupt();
    expect(d.state.phase).toBe('pick');
    expect(d.state.out).toEqual([]);
    expect(d.say).toEqual(m('merge.say.start'));
  });
});

describe('玩法二「拆一拆」', () => {
  const live = (g: SplitGame) => g.rows[g.rows.length - 1];
  /** 把当前这一排每一队都切对，返回最后一刀的结果 */
  function cutRow(d: ReturnType<typeof driver<SplitGame, SplitAction>>) {
    for (const p of live(d.state)) if (p.size > 1) d.act({ type: 'cut', start: p.start, at: p.size / 2 });
  }
  function toAsk(d: ReturnType<typeof driver<SplitGame, SplitAction>>) {
    while (d.state.phase === 'cut') {
      cutRow(d);
      d.settle();
    }
  }

  it('开局：第一局 8 个，一整队，台词让孩子点 ✂️', () => {
    const d = driver(splitRules);
    expect(d.state.n).toBe(8);
    expect(d.state.rows).toEqual([[{ start: 0, size: 8 }]]);
    expect(d.say).toEqual(m('split.say.start'));
    expect(splitRules.clickable(d.state)).toBe(true);
    expect(splitRules.controls(d.state)).toEqual([]);
  });

  it('切歪了：算一次错，出「错」声，台词数一数两边；同一队再歪一次，次数加一（正中间的 ✂️ 透光）', () => {
    const d = driver(splitRules);
    d.act({ type: 'cut', start: 0, at: 3 });
    expect(d.sounds).toEqual(['wrong']);
    expect(d.state.mistakes).toBe(1);
    expect(d.state.probe).toEqual({ start: 0, at: 3, misses: 1 });
    expect(d.say).toEqual(m('split.say.uneven', { l: 3, r: 5 }));
    expect(d.state.cuts).toEqual([[]]);
    d.act({ type: 'cut', start: 0, at: 6 });
    expect(d.state.probe).toEqual({ start: 0, at: 6, misses: 2 });
    d.act({ type: 'cut', start: 0, at: 4 });
    expect(d.state.probe).toBeNull();
    expect(d.say).toEqual(m('split.say.cut', { l: 4, r: 4 }));
    expect(d.sounds.at(-1)).toBe('right');
  });

  it('一排都切对：停一下（PAUSE_SHORT）再翻到下一排，出「滴」声；切过的和 1 个的不能再切', () => {
    const d = driver(splitRules);
    d.act({ type: 'cut', start: 0, at: 4 });
    expect(d.state.waiting).toBe(true);
    expect(d.after).toBe(PAUSE_SHORT);
    expect(splitRules.clickable(d.state)).toBe(false);
    expect(d.act({ type: 'cut', start: 0, at: 4 })).toBe(false);
    d.settle();
    expect(d.state.rows).toHaveLength(2);
    expect(d.state.rows[1]).toEqual([{ start: 0, size: 4 }, { start: 4, size: 4 }]);
    expect(d.sounds.at(-1)).toBe('tick');
    expect(d.say).toEqual(m('split.say.again'));
    // 同一排里先切一队，另一队还没切：不停
    d.act({ type: 'cut', start: 0, at: 2 });
    expect(d.state.waiting).toBe(false);
    expect(d.act({ type: 'cut', start: 0, at: 2 })).toBe(false);
  });

  it('切到每队只剩 1 个，问一共分了几轮；答错不扣星，按钮晃，显示「第几轮」，台词让孩子数 ✂️', () => {
    const d = driver(splitRules);
    toAsk(d);
    expect(d.state.phase).toBe('ask');
    expect(d.state.rows).toHaveLength(4);
    expect(d.say).toEqual(m('split.say.ask'));
    expect(d.state.hintNums).toBe(false);
    d.act({ type: 'answer', c: 5 });
    expect(d.sounds.at(-1)).toBe('wrong');
    expect(d.state.wrong).toEqual([5, 1]);
    expect(d.state.hintNums).toBe(true);
    expect(d.state.mistakes).toBe(1);
    expect(d.say).toEqual(m('split.say.count'));
    d.act({ type: 'answer', c: 5 });
    expect(d.state.wrong).toEqual([5, 2]);
  });

  it('答对：「赢」声，结算按分的轮数写；一次不错三颗星；再来一局换成 4 个，再来又是 8 个', () => {
    const d = driver(splitRules);
    toAsk(d);
    d.act({ type: 'answer', c: 3 });
    expect(d.sounds.at(-1)).toBe('win');
    expect(d.say).toEqual(m('split.say.win', { n: 8, rounds: 3 }));
    expect(splitRules.result!(d.state)).toEqual({
      stars: 3,
      body: m('split.done', { chain: '8 → 4 → 2 → 1', n: 8, rounds: 3, next: m('split.next', { n: 4 }) }),
    });
    const again = buttons(splitRules.controls(d.state))[0];
    d.act(again.action);
    expect(d.state.n).toBe(4);
    toAsk(d);
    d.act({ type: 'answer', c: 2 });
    expect(splitRules.result!(d.state)!.body).toEqual(m('split.done', { chain: '4 → 2 → 1', n: 4, rounds: 2, next: m('split.next', { n: 8 }) }));
    d.act({ type: 'again' });
    expect(d.state.n).toBe(8);
  });

  it('星星：切歪和答错都算错；错 1、2 次两颗，3 次以上一颗', () => {
    const play = (misses: number) => {
      const d = driver(splitRules);
      for (let k = 0; k < misses; k++) d.act({ type: 'cut', start: 0, at: 1 });
      toAsk(d);
      d.act({ type: 'answer', c: 3 });
      return splitRules.result!(d.state)!.stars;
    };
    expect([0, 1, 2, 3, 5].map(play)).toEqual([3, 2, 2, 1, 1]);
  });

  it('不在问的时候不接受答案；没结束不接受「再来一局」；切标签时等翻排的这一局重开（4 个和 8 个轮着来）', () => {
    const d = driver(splitRules);
    expect(d.act({ type: 'answer', c: 3 })).toBe(false);
    expect(d.act({ type: 'again' })).toBe(false);
    d.interrupt();
    expect(d.state.n).toBe(8);
    d.act({ type: 'cut', start: 0, at: 4 });
    expect(d.state.waiting).toBe(true);
    d.interrupt();
    expect(d.state.waiting).toBe(false);
    expect(d.state.rows).toHaveLength(1);
    expect(d.state.n).toBe(4);
    expect(d.say).toEqual(m('split.say.start'));
  });
});

describe('挑战：让比较次数最多或最少', () => {
  const N = CHALLENGE_N;
  const bounds = compareBounds(N);
  const fill = (d: ReturnType<typeof driver<ChallengeState, ChallengeAction>>, line: number[]) => line.forEach((v) => d.act({ type: 'add', v }));

  it('开局：目标是「比得最多」，队是空的，没有按钮和结算', () => {
    const d = driver(challengeRules);
    expect(d.state).toEqual({ mode: 'max', line: [], tries: 0 });
    expect(challengeRules.controls(d.state)).toEqual([]);
    expect(challengeRules.result!(d.state)).toBeNull();
    expect(challengeRules.clickable(d.state)).toBe(true);
  });

  it('放进去的数不能重复、不能超出 1 到 N；撤销拿掉最后一个，重排清空；空的时候这两个不接受', () => {
    const d = driver(challengeRules);
    expect(d.act({ type: 'undo' })).toBe(false);
    expect(d.act({ type: 'clear' })).toBe(false);
    expect(d.act({ type: 'add', v: 0 })).toBe(false);
    expect(d.act({ type: 'add', v: N + 1 })).toBe(false);
    d.act({ type: 'add', v: 3 });
    expect(d.act({ type: 'add', v: 3 })).toBe(false);
    d.act({ type: 'add', v: 5 });
    d.act({ type: 'undo' });
    expect(d.state.line).toEqual([3]);
    d.act({ type: 'clear' });
    expect(d.state.line).toEqual([]);
  });

  it('排满才算一次尝试；排满以后不能再放；换目标清空队伍和次数', () => {
    const d = driver(challengeRules);
    fill(d, [1, 2, 3, 4, 5, 6, 7]);
    expect(d.state.tries).toBe(0);
    d.act({ type: 'add', v: 8 });
    expect(d.state.tries).toBe(1);
    expect(d.act({ type: 'add', v: 8 })).toBe(false);
    d.act({ type: 'clear' });
    d.act({ type: 'mode', mode: 'min' });
    expect(d.state).toEqual({ mode: 'min', line: [], tries: 0 });
  });

  it('提示：随试的次数变；目标是最少时是另一句；排满以后没有提示', () => {
    const d = driver(challengeRules);
    const hint = (s: ChallengeState) => (challengeNote(s).params!.hint as { key: string }).key;
    expect(hint(d.state)).toBe('chal.hint.max');
    fill(d, [1, 2, 3, 4, 5, 6, 7, 8]);
    d.act({ type: 'clear' });
    expect(hint(d.state)).toBe('chal.hint.max'); // 试了 1 次
    fill(d, [1, 2, 3, 4, 5, 6, 7, 8]);
    d.act({ type: 'clear' });
    expect(hint(d.state)).toBe('chal.hint.deep'); // 试了 2 次
    fill(d, [1, 2, 3, 4, 5, 6, 7, 8]);
    expect(challengeNote(d.state).params!.hint).toBe('');
    d.act({ type: 'mode', mode: 'min' });
    expect(hint(d.state)).toBe('chal.hint.min');
    expect(challengeNote(d.state).params!.goal).toEqual(m('chal.goal.min'));
  });

  it('排满的结算：达成最多时记下比较次数，按钮只有「再排一次」', () => {
    const d = driver(challengeRules);
    fill(d, worstCase(N));
    const r = challengeRules.result!(d.state)!;
    expect(r.art!.scene).toBe('ChallengeResult');
    expect(r.art!.props).toMatchObject({ mode: 'max', total: bounds.max, win: true, min: bounds.min, max: bounds.max, line: worstCase(N) });
    const bs = buttons(challengeRules.controls(d.state));
    expect(bs.map((b) => b.label)).toEqual([m('chal.again')]);
    expect(bs[0].look).toBe('smallPrimary');
    d.act(bs[0].action);
    expect(d.state.line).toEqual([]);
    expect(d.state.tries).toBe(1);
  });

  it('没达成：试够 3 次才有「看一种答案」，给出的答案正好达成目标（最多和最少都是）', () => {
    for (const mode of ['max', 'min'] as const) {
      const d = driver(challengeRules);
      d.act({ type: 'mode', mode });
      const bad = mode === 'max' ? [1, 2, 3, 4, 5, 6, 7, 8] : [4, 8, 3, 7, 2, 6, 1, 5];
      for (let k = 0; k < 3; k++) {
        fill(d, bad);
        const labels = buttons(challengeRules.controls(d.state)).map((b) => b.label);
        expect(labels).toEqual(k < 2 ? [m('chal.again')] : [m('chal.again'), m('chal.peek')]);
        if (k < 2) d.act({ type: 'clear' });
      }
      expect(challengeRules.result!(d.state)!.art!.props).toMatchObject({ win: false });
      d.act({ type: 'peek' });
      expect(challengeRules.result!(d.state)!.art!.props).toMatchObject({ win: true, total: mode === 'max' ? bounds.max : bounds.min });
      // 达成以后不再给「看一种答案」
      expect(buttons(challengeRules.controls(d.state)).map((b) => b.label)).toEqual([m('chal.again')]);
    }
  });
});

describe('猜下一步、逐步执行、绘本的规则', () => {
  it('猜下一步：连对 6 次过关；一题一问，选项里只有一个正确答案，答对答错都讲解，答完直接换下一题', () => {
    expect(predictRules.goal).toBe(6);
    const rand = seeded(9);
    for (let k = 0; k < 200; k++) {
      const puzzle = predictRules.puzzle(rand);
      expect(puzzle.asks).toHaveLength(1);
      expect(puzzle.skipEnd).toBe(true);
      const ask = puzzle.asks[0];
      expect(ask.kind).toBe('choose');
      expect(ask.options!.filter((o) => o.value === ask.answer)).toHaveLength(1);
      expect(ask.right!.key).toBe('predict.yes');
      expect(ask.why.key).toBe('predict.no');
      expect(ask.right!.params).toEqual(ask.why.params);
      // 答错：看解释，画面翻到下一步；点「继续」后该直接换下一题
      let s = pr.startPredict(puzzle, predictRules.goal);
      const wrongValue = ask.options!.find((o) => o.value !== ask.answer)!.value;
      s = pr.answer(s, wrongValue)!.state;
      expect(pr.viewOf(s).wrong).toEqual(ask.why);
      expect(pr.viewOf(s).view).toBe(ask.reveal!.view);
      expect(pr.viewOf(s).prompt).toEqual(ask.reveal!.prompt);
      s = pr.proceed(s)!;
      expect(pr.isOver(s)).toBe(true);
      // 答对：也讲解，画面也翻到下一步
      let t = pr.startPredict(puzzle, predictRules.goal);
      t = pr.answer(t, ask.answer)!.state;
      expect(pr.viewOf(t).right).toEqual(ask.right);
      expect(pr.viewOf(t).view).toBe(ask.reveal!.view);
      expect(t.streak).toBe(1);
    }
  });

  it('猜下一步：连对 6 次出「赢」声，答错清零', () => {
    const rand = seeded(3);
    let s = pr.startPredict(predictRules.puzzle(rand), 6);
    const sounds: (string | undefined)[] = [];
    for (let k = 0; k < 6; k++) {
      const out = pr.answer(s, s.puzzle.asks[0].answer)!;
      sounds.push(out.sound);
      s = pr.nextPuzzle(out.state, predictRules.puzzle(rand));
    }
    expect(sounds).toEqual(['right', 'right', 'right', 'right', 'right', 'win']);
    expect(s.passed).toBe(true);
    const bad = pr.answer(s, 'nope')!;
    expect(bad.state.streak).toBe(0);
    expect(bad.sound).toBe('wrong');
  });

  it('逐步执行：默认 6 个随机数；大小和顺序可选，已排好是升序、倒序是降序；换一组还是同样大小', () => {
    const rand = seeded(4);
    let input = traceRules.start(rand);
    expect(input.size).toBe(6);
    expect(input.arr).toHaveLength(6);
    input = traceRules.act(input, { type: 'size', n: 8 }, rand);
    expect(input.arr).toHaveLength(8);
    const sorted = traceRules.act(input, { type: 'kind', kind: 'sorted' }, rand);
    expect(sorted.arr).toEqual([3, 6, 9, 12, 15, 18, 21, 24]);
    const rev = traceRules.act(input, { type: 'kind', kind: 'reversed' }, rand);
    expect(rev.arr).toEqual([24, 21, 18, 15, 12, 9, 6, 3]);
    expect(traceRules.act(rev, { type: 'fresh' }, rand).arr).toHaveLength(8);
    const cs = traceRules.controls(input);
    expect(cs.map((c) => c.type)).toEqual(['segmented', 'segmented', 'button']);
    const seg = cs[0] as Extract<Control<unknown>, { type: 'segmented' }>;
    expect(seg.options.map((o) => o.value)).toEqual([4, 6, 8]);
  });

  it('逐步执行：播放条多两个跳转（下一次调用、下一次合并），总结只在最后一步；有图例', () => {
    const input = { size: 6, kind: 'random' as const, arr: [5, 2, 6, 1, 4, 3] };
    const steps = traceRules.trace(input);
    expect(traceRules.summary!(input, steps[0])).toBeNull();
    const sum = traceRules.summary!(input, steps.at(-1)!)!;
    expect(sum.key).toBe('trace.summary');
    expect(sum.params).toMatchObject({ n: 6, calls: 11, merges: 5, depth: 4, compares: steps.at(-1)!.compares });
    const [call, merge] = traceRules.jumps!;
    expect(steps.findIndex((x, k) => k > 0 && call.stop(x, steps[0]))).toBe(steps.findIndex((x, k) => k > 0 && x.line === 1));
    const first = steps.findIndex((x, k) => k > 0 && merge.stop(x, steps[0]));
    expect(steps[first].line === 16 || steps[first].done).toBe(true);
    expect(traceRules.legend).toEqual(m('trace.legend'));
    expect(steps).toEqual(buildTrace(input.arr));
  });

  it('绘本：第一遍是故事里的那一队，再看一次换一队 6 个不同的身高', () => {
    const L = level.look!.story;
    expect(L.first).toEqual(STORY_KIDS);
    const next = L.next(L.first, seeded(2));
    expect(new Set(next).size).toBe(6);
    expect(L.frames(next).every((f) => f.values === next)).toBe(true);
  });
});
