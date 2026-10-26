import { describe, expect, it } from 'vitest';
import { CHALLENGE_LIMIT, CHALLENGE_MAX, KID_N, middle, pointTo } from '../src/engine/binary-search';
import { challengeFlow, findFlow, hideFlow, PREDICT_GOAL, predictFlow, traceInputFlow } from '../src/levels/binary-search/flows';
import { driver } from './helpers/flow';
import { expectTranslatable, zh } from './helpers/i18n';

const text = zh('binary-search');

describe('二分查找 玩法一「藏信」', () => {
  it('孩子每次都指对，小邮差最多 4 次找到，每次都站在正中间', () => {
    for (let secret = 1; secret <= KID_N; secret++) {
      const d = driver(hideFlow);
      d.send({ type: 'hide', i: secret });
      expect(d.state.phase).toBe('guide');
      while (d.state.phase === 'guide') {
        expect(d.state.at).toBe(middle(d.state.lo, d.state.hi));
        d.send({ type: 'answer', d: pointTo(secret, d.state.at) });
        expectTranslatable(d.state, 'binary-search');
      }
      expect(d.state.phase).toBe('done');
      expect(d.state.tries).toBeLessThanOrEqual(4);
      expect(text(d.state.say)).toContain(String(d.state.tries));
    }
  });

  it('指错方向：不前进，藏信的信箱透光，再指错就再透一次', () => {
    const d = driver(hideFlow);
    d.send({ type: 'hide', i: 2 });
    const before = d.state;
    d.send({ type: 'answer', d: 'right' });
    expect(d.state.at).toBe(before.at);
    expect(d.state.glow).toEqual([2, 1]);
    d.send({ type: 'answer', d: 'hit' });
    expect(d.state.glow).toEqual([2, 2]);
    expect(d.sounds.filter((s) => s === 'wrong')).toHaveLength(2);
  });

  it('藏好以后才能指路；动画中途切走就回到重新藏信', () => {
    const d = driver(hideFlow);
    d.send({ type: 'answer', d: 'left' });
    expect(d.state.phase).toBe('hide');
    const r = d.stepOnly({ type: 'hide', i: 5 });
    expect(d.state.phase).toBe('hiding');
    expect(r.effects.some((e) => 'after' in e)).toBe(true);
    expect(d.interrupt().phase).toBe('hide');
    expect(d.state.secret).toBeNull();
  });
});

describe('二分查找 玩法二「当小邮差」', () => {
  it('点灰信箱：摇头，不算次数', () => {
    const d = driver(findFlow);
    const secret = d.state.secret;
    const first = secret === 1 ? 15 : 1;
    d.send({ type: 'tap', i: first });
    const grey = secret > first ? first : 15;
    const tries = d.state.tries;
    if (grey < d.state.lo || grey > d.state.hi) {
      d.send({ type: 'tap', i: grey });
      expect(d.state.tries).toBe(tries);
      expect(d.state.shake?.[0]).toBe(grey);
    }
  });

  it('每次点正中间：三颗星，问一次「点哪里最快」；之后再拿三颗星不再问', () => {
    const d = driver(findFlow, 3);
    for (let round = 0; round < 2; round++) {
      while (!d.state.done) d.send({ type: 'tap', i: middle(d.state.lo, d.state.hi) });
      expect(d.state.tries).toBeLessThanOrEqual(4);
      expect(d.state.quiz).toBe(round === 0 ? 'ask' : 'right');
      if (round === 0) d.send({ type: 'quiz', where: 'middle' });
      d.send({ type: 'again' });
    }
  });

  it('连续两局不到三星，才给秘诀；打开秘诀后提示语变了', () => {
    const d = driver(findFlow, 5);
    // 从最左边一个一个点（信在前 4 个时三颗星，连续计数会清零），直到连续两局不到三星
    for (let round = 0; d.state.lowRounds < 2 && round < 50; round++) {
      if (d.state.done) d.send({ type: 'again' });
      for (let i = 1; !d.state.done; i++) d.send({ type: 'tap', i });
      expect(d.state.lowRounds).toBe(d.state.tries > 4 ? d.state.lowRounds : 0);
    }
    expect(d.state.lowRounds).toBe(2);
    d.send({ type: 'hint', on: true });
    expect(d.state.hint).toBe(true);
    expect(d.state.lowRounds).toBe(0);
    expect(text(d.state.say)).toContain('一闪一闪');
    expectTranslatable(d.state, 'binary-search');
  });
});

describe('二分查找 猜下一步', () => {
  it('全答对：连对到 5 次过关，每题结束有「下一题」', () => {
    const d = driver(predictFlow, 7);
    while (!d.state.passed) {
      const s = d.state;
      if (s.ended) { d.send({ type: 'next' }); continue; }
      const cur = s.list[s.r];
      if (s.phase === 'mid') d.send({ type: 'cell', k: cur.mid });
      else d.send({ type: 'move', move: cur.move });
      expectTranslatable(d.state, 'binary-search');
    }
    expect(d.state.streak).toBeGreaterThanOrEqual(PREDICT_GOAL);
    expect(d.sounds).toContain('win');
  });

  it('点错 mid：连对清零，给出解释，继续后接着选下一步', () => {
    const d = driver(predictFlow, 2);
    const cur = d.state.list[0];
    d.send({ type: 'cell', k: cur.mid === 0 ? 1 : 0 });
    expect(d.state.streak).toBe(0);
    expect(d.state.wrong).toEqual(cur.whyMid);
    d.send({ type: 'continue' });
    expect(d.state.phase).toBe('move');
    expect(d.state.wrong).toBeNull();
  });

  it('题干和画面：选下一步时 mid 亮出来', () => {
    const d = driver(predictFlow, 4);
    expect(d.state.view.mid).toBeNull();
    d.send({ type: 'cell', k: d.state.list[0].mid });
    expect(d.state.view.mid).toBe(d.state.list[0].mid);
    expect(text(d.state.prompt)).toContain('接下来');
  });
});

describe('二分查找 挑战', () => {
  it('每次猜正中间，10 次以内一定猜中', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const d = driver(challengeFlow, seed);
      while (d.state.state === 'play') {
        d.send({ type: 'input', value: String(middle(d.state.lo, d.state.hi)) });
        d.send({ type: 'guess' });
      }
      expect(d.state.state).toBe('win');
      expect(d.state.log.length).toBeLessThanOrEqual(CHALLENGE_LIMIT);
    }
  });

  it('乱输入、猜已经排除的数：不算次数，给提示', () => {
    const d = driver(challengeFlow, 9);
    d.send({ type: 'input', value: 'abc' });
    d.send({ type: 'guess' });
    expect(text(d.state.msg!)).toContain(String(CHALLENGE_MAX));
    d.send({ type: 'input', value: d.state.secret === 1 ? '2' : '1' });
    d.send({ type: 'guess' });
    d.send({ type: 'input', value: d.state.secret === 1 ? '2' : '1' });
    d.send({ type: 'guess' });
    expect(d.state.log).toHaveLength(1);
    expect(text(d.state.msg!)).toContain('已经被排除');
  });
});

describe('二分查找 逐步执行的输入', () => {
  it('换大小重新出数组，目标在数组里；取不存在的值确实不在', () => {
    const d = driver(traceInputFlow);
    for (const size of [8, 32, 16]) {
      d.send({ type: 'size', size });
      expect(d.state.arr).toHaveLength(size);
      expect(d.state.arr).toContain(d.state.target);
    }
    d.send({ type: 'pickOut' });
    expect(d.state.arr).not.toContain(d.state.target);
    d.send({ type: 'target', value: 'x' });
    expect(d.state.arr).not.toContain(d.state.target);
    d.send({ type: 'target', value: '42' });
    expect(d.state.target).toBe(42);
  });
});
