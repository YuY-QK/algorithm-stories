import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import { PAUSE_LONG, SPEEDS } from '../src/core/timing';
import type { Control } from '../src/core/types';
import {
  CHALLENGE_COUNT, CHALLENGE_N, PLATE_ICONS, blocksRules, canPop, firstPlate, permRules, permTrace, permView, platesRules, stars, topIndex,
  type BlocksAction, type BlocksGame, type PermAction, type PermGame, type PlatesAction, type PlatesGame,
} from '../src/engine/stack';
import { driver } from './helpers/game';
import { seeded } from './helpers/seeded';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');

describe('玩一「拿盘子」', () => {
  /** 小熊叠盘子，停在第一次要孩子拿的时候 */
  function asking(seed = 1) {
    const g = driver(platesRules, seeded(seed));
    g.settle();
    return g;
  }
  const topOf = (s: PlatesGame) => s.stack[topIndex(s.stack)];
  const pick = (plate: number): PlatesAction => ({ type: 'pick', plate });
  /** 一路点对，直到全拿完 */
  function finish(g: ReturnType<typeof driver<PlatesGame, PlatesAction>>) {
    for (let guard = 0; guard < 100 && g.state.phase !== 'done'; guard++) {
      if (g.state.phase === 'ask') g.act(pick(topOf(g.state)));
      else g.settle();
    }
  }

  it('页面一打开小熊就放第一个盘子：出「嗒」声、说放了哪个、过一会儿再放下一个', () => {
    const g = driver(platesRules, seeded(1));
    const s = g.state;
    expect(s).toMatchObject({ at: 1, phase: 'moving', misses: 0 });
    expect(s.stack).toHaveLength(1);
    expect(g.say).toEqual(m('plates.say.put', { icon: PLATE_ICONS[s.stack[0]], n: 1 }));
    expect(g.sounds).toEqual(['tick']);
    expect(g.after).toBe(PAUSE_LONG);
    expect(platesRules.clickable(s)).toBe(false);
  });

  it('叠到要拿的时候停下：盘子能点，台词让孩子点最上面会被拿走的那个', () => {
    const g = asking();
    expect(g.state.phase).toBe('ask');
    expect(g.say).toEqual(m('plates.say.ask'));
    expect(g.after).toBeUndefined();
    expect(platesRules.clickable(g.state)).toBe(true);
    // 拿之前至少叠了两个，拿的时候有得选
    expect(g.state.stack.length).toBeGreaterThanOrEqual(2);
  });

  it('点了被压着的盘子：它晃一下、最上面的盘子透光、说上面还压着盘子、次数加一；再错一次计数再加一', () => {
    const g = asking();
    const top = topOf(g.state);
    const under = g.state.stack[0];
    expect(under).not.toBe(top);
    const before = g.state;
    g.act(pick(under));
    expect(g.state).toMatchObject({ misses: 1, glow: 1, shake: [under, 1], phase: 'ask', at: before.at });
    expect(g.say).toEqual(m('plates.say.under', { icon: PLATE_ICONS[under] }));
    expect(g.sounds.at(-1)).toBe('wrong');
    expect(g.state.stack).toEqual(before.stack);
    g.act(pick(under));
    expect(g.state).toMatchObject({ misses: 2, glow: 2, shake: [under, 2] });
  });

  it('点对最上面的：出「对」声，盘子被拿走，说还剩几个；之后继续自动放，透光清掉', () => {
    const g = asking();
    const top = topOf(g.state);
    const n = g.state.stack.length;
    g.act(pick(top));
    expect(g.state.glow).toBe(0);
    expect(g.state.taken.at(-1)).toBe(top);
    expect(g.state.stack).toHaveLength(n - 1);
    expect(g.say).toEqual(n - 1 ? m('plates.say.took', { icon: PLATE_ICONS[top], n: n - 1 }) : m('plates.say.tookAll', { icon: PLATE_ICONS[top] }));
    expect(g.sounds.at(-1)).toBe('right');
    expect(g.after).toBe(PAUSE_LONG);
    expect(g.state.phase).toBe('moving');
    expect(g.act(pick(top))).toBe(false);
  });

  it('等孩子点之前、自动放盘子时，点盘子没有反应', () => {
    const g = driver(platesRules, seeded(2));
    expect(g.act(pick(0))).toBe(false);
  });

  it('全拿完：出「赢」声，三星（一次没错）；第一局追问最先放的盘子什么时候拿到', () => {
    const g = asking(3);
    finish(g);
    expect(g.state.phase).toBe('done');
    expect(g.say).toEqual(m('plates.say.done'));
    expect(g.sounds.at(-1)).toBe('win');
    const r = platesRules.result!(g.state)!;
    expect(r.stars).toBe(3);
    const icon = PLATE_ICONS[firstPlate(g.state.ops)];
    expect(r.quiz!.prompt).toEqual(m('plates.quiz.ask', { icon }));
    expect(buttons(r.quiz!.options).map((b) => b.label)).toEqual([m('plates.quiz.first'), m('plates.quiz.last')]);
    expect(r.quiz!.after).toBeUndefined();
    // 结束后只剩「再玩一局」
    expect(buttons(platesRules.controls(g.state)).map((b) => b.label)).toEqual([m('plates.again')]);
    // 最先放的盘子最后拿到
    expect(g.state.taken.at(-1)).toBe(firstPlate(g.state.ops));
  });

  it('星星：错 0 次三颗，1～2 次两颗，更多一颗', () => {
    for (const [misses, want] of [[0, 3], [1, 2], [2, 2], [3, 1]] as const) {
      const g = asking(4);
      for (let k = 0; k < misses; k++) g.act(pick(g.state.stack[0]));
      finish(g);
      expect(platesRules.result!(g.state)!.stars).toBe(want);
      expect(want).toBe(stars(misses));
    }
  });

  it('追问答「最先」：出「错」声，再问并提醒看拿走的那一排；答「最后」：出「对」声，夸一句，不再有选项', () => {
    const g = asking(5);
    finish(g);
    const icon = PLATE_ICONS[firstPlate(g.state.ops)];
    g.act({ type: 'quiz', when: 'first' });
    expect(g.sounds.at(-1)).toBe('wrong');
    let q = platesRules.result!(g.state)!.quiz!;
    expect(q.options).toHaveLength(2);
    expect(q.after).toEqual(m('plates.quiz.hint', { icon }));
    g.act({ type: 'quiz', when: 'last' });
    expect(g.sounds.at(-1)).toBe('right');
    q = platesRules.result!(g.state)!.quiz!;
    expect(q).toEqual({ prompt: m('plates.quiz.right'), options: [] });
    expect(g.act({ type: 'quiz', when: 'first' })).toBe(false);
  });

  it('再玩一局：新局马上开始放盘子；追问只在第一局问，之后不再问', () => {
    const g = asking(6);
    finish(g);
    expect(g.act({ type: 'again' })).toBe(true);
    expect(g.state).toMatchObject({ at: 1, phase: 'moving', misses: 0, quiz: null, asked: true });
    expect(g.after).toBe(PAUSE_LONG);
    g.settle();
    finish(g);
    const r = platesRules.result!(g.state)!;
    expect(r.stars).toBe(3);
    expect(r.quiz).toBeUndefined();
  });

  it('只有结束了才能再玩一局', () => {
    const g = asking(7);
    expect(g.act({ type: 'again' })).toBe(false);
  });

  it('切标签：小熊还在叠的局重新开一局；等孩子点或已经结束的不动', () => {
    const g = driver(platesRules, seeded(8));
    const old = g.state;
    g.interrupt();
    expect(g.state).toMatchObject({ at: 1, phase: 'moving' });
    expect(g.state.ops).not.toBe(old.ops);
    g.settle();
    const waiting = g.state;
    g.interrupt();
    expect(g.state).toBe(waiting);
  });

  it('局面：5 个盘子放完拿完，每一步盘子和台词的数量一致', () => {
    for (let seed = 1; seed < 40; seed++) {
      const g = asking(seed);
      let guard = 0;
      while (g.state.phase !== 'done' && guard++ < 100) {
        if (g.state.phase === 'ask') g.act(pick(topOf(g.state)));
        else g.settle();
      }
      expect(g.state.taken).toHaveLength(5);
      expect(g.state.stack).toEqual([]);
    }
  });
});

describe('玩二「拼积木」', () => {
  /** 开一局，把三串积木换成指定的 */
  function withRounds(rounds: string[]) {
    const custom: BlocksGame = { ...blocksRules.start(seeded(1)).state, rounds };
    return driver({ ...blocksRules, start: () => ({ state: custom, say: m('blocks.say.first') }) });
  }
  const act = (choice: 'push' | 'pop' | 'stuck'): BlocksAction => ({ type: 'act', choice });
  const fin = (choice: 'clear' | 'left'): BlocksAction => ({ type: 'finish', choice });

  it('开局：第一块来了，台词问放进篮子还是拼上；三个大按钮带小字', () => {
    const g = driver(blocksRules, seeded(2));
    expect(g.say).toEqual(m('blocks.say.first'));
    const pads = buttons(blocksRules.controls(g.state));
    expect(pads).toHaveLength(3);
    expect(pads.every((b) => b.look === 'pad' && b.caption && b.aria)).toBe(true);
    expect(blocksRules.clickable(g.state)).toBe(false);
    expect(g.state.rounds).toHaveLength(3);
  });

  it('左半块放进篮子，右半块拼上，一串看完问「都拼好了吗」', () => {
    const g = withRounds(['([])', '(]', '(']);
    g.act(act('push'));
    expect(g.state.basket).toEqual(['(']);
    expect(g.say).toEqual(m('blocks.say.push', { c: '(', n: 1 }));
    expect(g.sounds.at(-1)).toBe('right');
    g.act(act('push'));
    g.act(act('pop'));
    expect(g.state.made).toEqual(['[]']);
    expect(g.say).toEqual(m('blocks.say.pop', { c: ']', top: '[' }));
    g.act(act('pop'));
    expect(g.state).toMatchObject({ phase: 'end', basket: [], made: ['[]', '()'] });
    expect(g.say).toEqual(m('blocks.say.end'));
    expect(buttons(blocksRules.controls(g.state)).map((b) => b.caption)).toEqual([m('blocks.pad.clear'), m('blocks.pad.left')]);
  });

  it('左半块却选了拼上或拼不上：当前块晃一下，说这是左半块；不前进，记一次错', () => {
    const g = withRounds(['()', '(]', '(']);
    g.act(act('pop'));
    expect(g.state).toMatchObject({ wiggle: 1, misses: 1, i: 0 });
    expect(g.say).toEqual(m('blocks.hint.isLeft'));
    expect(g.sounds.at(-1)).toBe('wrong');
    g.act(act('stuck'));
    expect(g.state).toMatchObject({ wiggle: 2, misses: 2 });
  });

  it('右半块却选了放进篮子：篮子里有积木就让最上面一块透光，篮子是空的就让篮子透光', () => {
    const g = withRounds(['()', '(]', '(']);
    g.act(act('push'));
    g.act(act('push'));
    expect(g.state).toMatchObject({ glowTop: 1, glowBasket: 0, misses: 1 });
    expect(g.say).toEqual(m('blocks.hint.rightNotIn'));
    const h = withRounds(['))', '(]', '(']);
    h.act(act('push'));
    expect(h.state).toMatchObject({ glowBasket: 1, glowTop: 0 });
    expect(h.say).toEqual(m('blocks.hint.rightNotIn'));
  });

  it('能拼上却说拼不上：最上面一块透光，让孩子再比形状', () => {
    const g = withRounds(['()', '(]', '(']);
    g.act(act('push'));
    g.act(act('stuck'));
    expect(g.state.glowTop).toBe(1);
    expect(g.say).toEqual(m('blocks.hint.compare'));
  });

  it('该卡住却选了拼上：有积木时问「形状一样吗」让最上面透光；篮子空时问「篮子里还有积木吗」让篮子透光', () => {
    const g = withRounds(['(]', '()', '(']);
    g.act(act('push'));
    g.act(act('pop'));
    expect(g.state.glowTop).toBe(1);
    expect(g.say).toEqual(m('blocks.hint.same'));
    const h = withRounds([')', '()', '(']);
    h.act(act('pop'));
    expect(h.state.glowBasket).toBe(1);
    expect(h.say).toEqual(m('blocks.hint.any'));
  });

  it('选对以后，所有提示都熄掉', () => {
    const g = withRounds(['()', '(]', '(']);
    g.act(act('pop'));
    g.act(act('push'));
    g.act(act('push'));
    expect(g.state.glowTop).toBe(1);
    g.act(act('pop'));
    expect(g.state).toMatchObject({ wiggle: 0, glowTop: 0, glowBasket: 0 });
  });

  it('形状对不上、栈空了：选「拼不上」这一串就结束，说清为什么卡住', () => {
    const g = withRounds(['(]', ')', '(']);
    g.act(act('push'));
    g.act(act('stuck'));
    expect(g.state.phase).toBe('stuck');
    expect(g.say).toEqual(m('blocks.say.stuck', { c: ']', want: ')', top: '(' }));
    expect(g.sounds.at(-1)).toBe('right');
    expect(buttons(blocksRules.controls(g.state)).map((b) => b.label)).toEqual([m('blocks.next')]);
    expect(g.act(act('push'))).toBe(false);
    g.act({ type: 'next' });
    expect(g.state).toMatchObject({ r: 1, i: 0, basket: [], made: [], phase: 'act' });
    expect(g.say).toEqual(m('blocks.say.round', { n: 2 }));
    g.act(act('stuck'));
    expect(g.say).toEqual(m('blocks.say.stuckEmpty', { c: ')' }));
  });

  it('一串看完：全拼好选「都拼好了」，还剩选「还剩下」；选错透光篮子，记一次错', () => {
    const g = withRounds(['()', '((', '(']);
    g.act(act('push'));
    g.act(act('pop'));
    g.act(fin('left'));
    expect(g.state).toMatchObject({ phase: 'end', glowBasket: 1, misses: 1 });
    expect(g.say).toEqual(m('blocks.hint.look'));
    expect(g.sounds.at(-1)).toBe('wrong');
    g.act(fin('clear'));
    expect(g.state.phase).toBe('clear');
    expect(g.say).toEqual(m('blocks.say.clear'));
    expect(g.sounds.at(-1)).toBe('right');
    g.act({ type: 'next' });
    g.act(act('push'));
    g.act(act('push'));
    g.act(fin('clear'));
    expect(g.say).toEqual(m('blocks.hint.remain'));
    g.act(fin('left'));
    expect(g.say).toEqual(m('blocks.say.left', { n: 2 }));
  });

  it('不在这个阶段的操作没有反应', () => {
    const g = withRounds(['()', '(]', '(']);
    expect(g.act(fin('clear'))).toBe(false);
    expect(g.act({ type: 'next' })).toBe(false);
    expect(g.act({ type: 'again' })).toBe(false);
  });

  it('最后一串结束：出「赢」声，按错的次数给星星，说要点，再玩一局重新开始', () => {
    const g = withRounds(['()', '()', '()']);
    for (let r = 0; r < 3; r++) {
      g.act(act('push'));
      g.act(act('pop'));
      g.act(fin('clear'));
      if (r < 2) g.act({ type: 'next' });
    }
    expect(blocksRules.result!(g.state)).toEqual({ stars: 3, body: m('blocks.result') });
    expect(g.sounds.at(-1)).toBe('win');
    expect(buttons(blocksRules.controls(g.state)).map((b) => b.label)).toEqual([m('blocks.again')]);
    g.act({ type: 'again' });
    expect(g.state).toMatchObject({ r: 0, i: 0, misses: 0, phase: 'act' });
    expect(g.say).toEqual(m('blocks.say.round', { n: 1 }));
    expect(blocksRules.result!(g.state)).toBeNull();
  });

  it('星星按错的次数', () => {
    for (const [misses, want] of [[0, 3], [2, 2], [5, 1]] as const) {
      const g = withRounds(['()', '()', '()']);
      for (let k = 0; k < misses; k++) g.act(act('pop'));
      for (let r = 0; r < 3; r++) {
        g.act(act('push'));
        g.act(act('pop'));
        g.act(fin('clear'));
        if (r < 2) g.act({ type: 'next' });
      }
      expect(blocksRules.result!(g.state)!.stars).toBe(want);
    }
  });
});

describe('挑战：能不能按这个顺序出栈', () => {
  const judge = (yes: boolean): PermAction => ({ type: 'judge', yes });
  const play = (op: Extract<PermAction, { type: 'play' }>['op']): PermAction => ({ type: 'play', op });
  const bar = (s: PermGame) => permRules.controls(s)[0] as Extract<Control<PermAction>, { type: 'transport' }>;
  const speed = SPEEDS[1].ms;

  it('开局：第 1 题，没判断，两个判断按钮，没有播放条', () => {
    const g = driver(permRules, seeded(1));
    expect(g.state).toMatchObject({ q: 0, answer: null, score: 0 });
    expect(g.state.puzzles).toHaveLength(CHALLENGE_COUNT);
    expect(buttons(permRules.controls(g.state)).map((b) => b.label)).toEqual([m('perm.yes'), m('perm.no')]);
    expect(g.act(play('toggle'))).toBe(false);
    expect(g.act({ type: 'next' })).toBe(false);
  });

  it('判断完立刻从头演：按默认速度自动播放；判对加一分，判错不加；只能判断一次', () => {
    const g = driver(permRules, seeded(2));
    const truth = permView(g.state).truth;
    g.act(judge(truth));
    expect(g.state).toMatchObject({ answer: truth, score: 1 });
    expect(g.state.p).toMatchObject({ idx: 0, playing: true, speed });
    expect(g.after).toBe(speed);
    expect(g.act(judge(!truth))).toBe(false);
    const h = driver(permRules, seeded(2));
    h.act(judge(!permView(h.state).truth));
    expect(h.state.score).toBe(0);
  });

  it('播放中每到点走一步，出「嗒」声；走到最后一步后再到点就停下', () => {
    const g = driver(permRules, seeded(3));
    g.act(judge(true));
    const total = permView(g.state).steps.length;
    for (let k = 1; k < total; k++) {
      g.tick();
      expect(g.state.p.idx).toBe(k);
      expect(g.sounds.at(-1)).toBe('tick');
      expect(g.after).toBe(speed);
    }
    expect(permView(g.state).done).toBe(true);
    g.tick();
    expect(g.state.p.playing).toBe(false);
    expect(g.after).toBeUndefined();
  });

  it('播放条：暂停、下一步、上一步、重置、换速度（播放中换速度按新间隔继续）', () => {
    const g = driver(permRules, seeded(4));
    g.act(judge(true));
    g.tick();
    g.act(play('toggle'));
    expect(g.state.p.playing).toBe(false);
    expect(g.after).toBeUndefined();
    g.act(play('next'));
    expect(g.state.p.idx).toBe(2);
    g.act(play('prev'));
    expect(g.state.p.idx).toBe(1);
    g.act(play('reset'));
    expect(g.state.p.idx).toBe(0);
    g.act(play('toggle'));
    expect(g.after).toBe(speed);
    g.act(play({ speed: SPEEDS[2].ms }));
    expect(g.after).toBe(SPEEDS[2].ms);
    expect(g.state.p.speed).toBe(SPEEDS[2].ms);
    const c = bar(g.state);
    expect(c).toMatchObject({ type: 'transport', idx: 0, playing: true, speed: SPEEDS[2].ms });
    expect(c.total).toBe(permView(g.state).steps.length);
    expect(c.act('reset')).toEqual({ type: 'play', op: 'reset' });
  });

  it('演完才出结论：下一题回到第一步并停下，不是最后一题才能点；最后一题演完是总结', () => {
    const g = driver(permRules, seeded(5));
    for (let q = 0; q < CHALLENGE_COUNT; q++) {
      expect(g.state.q).toBe(q);
      g.act(judge(permView(g.state).truth));
      expect(g.act({ type: 'next' })).toBe(false); // 还没演完
      for (let k = 0; k < 20 && !permView(g.state).done; k++) g.tick();
      expect(permView(g.state).done).toBe(true);
      if (q < CHALLENGE_COUNT - 1) {
        expect(permView(g.state).finished).toBe(false);
        g.act({ type: 'next' });
        expect(g.state).toMatchObject({ q: q + 1, answer: null });
        expect(g.state.p).toMatchObject({ idx: 0, playing: false });
        expect(g.after).toBeUndefined();
      }
    }
    expect(permView(g.state).finished).toBe(true);
    expect(g.state.score).toBe(CHALLENGE_COUNT);
    expect(g.act({ type: 'next' })).toBe(false);
    // 再来一组
    g.act({ type: 'restart' });
    expect(g.state).toMatchObject({ q: 0, answer: null, score: 0 });
    expect(g.state.p).toMatchObject({ idx: 0, playing: false });
  });

  it('没做完最后一题不能「再来一组」', () => {
    const g = driver(permRules, seeded(6));
    expect(g.act({ type: 'restart' })).toBe(false);
  });

  it('切标签：演示停下，位置不动', () => {
    const g = driver(permRules, seeded(7));
    g.act(judge(true));
    g.tick();
    g.interrupt();
    expect(g.state.p).toMatchObject({ idx: 1, playing: false });
    expect(g.after).toBeUndefined();
  });

  it('每题的画面：这一步的栈和等着入栈的数之和守恒；题目能和不能各约一半', () => {
    for (let seed = 1; seed < 30; seed++) {
      const g = driver(permRules, seeded(seed));
      expect(g.state.puzzles.filter((p) => canPop(CHALLENGE_N, p))).toHaveLength(3);
      for (const p of g.state.puzzles) {
        for (const step of permTrace(CHALLENGE_N, p)) expect(step.stack.length + step.out.length + (CHALLENGE_N - step.next + 1)).toBe(CHALLENGE_N);
      }
    }
  });
});
