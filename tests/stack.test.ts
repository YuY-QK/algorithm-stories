import { describe, expect, it } from 'vitest';
import {
  BUGS, CHALLENGE_COUNT, CHALLENGE_N, CHAR_MOVES, CLOSERS, CODE, END_MOVES, LOOK_OPS, OPENERS, TRACE_PRESETS, bracketAction, bracketEnd, bracketGame, bracketPuzzle, buildTrace,
  bugVerdict, canPop, clean, genBalanced, genChallenge, genPredict, has312, isOpener, isValid, lookFrames, pairOf,
  permPuzzles, permTrace, plateGame, presetString, rounds, runBug, runPlates, stars, topIndex, type PuzzleKind,
  type Round,
} from '../src/engine/stack';
import { seeded } from './helpers/seeded';

/** 笨办法判断括号串：反复删掉相邻的一对，最后删空就合法 */
function slowValid(s: string): boolean {
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/\(\)|\[\]|\{\}/g, '');
  }
  return s === '';
}

/** 随机括号串，不一定配对 */
function randomBrackets(n: number): string {
  const all = OPENERS + CLOSERS;
  return Array.from({ length: n }, () => all[Math.floor(Math.random() * 6)]).join('');
}

/** 全排列 */
function perms(a: number[]): number[][] {
  if (a.length <= 1) return [a];
  return a.flatMap((x, k) => perms([...a.slice(0, k), ...a.slice(k + 1)]).map((p) => [x, ...p]));
}

describe('栈 看、玩一：叠盘子', () => {
  it('绘本：后放的先拿，拿走顺序是 爱心 小花 月亮 星星', () => {
    const states = runPlates(LOOK_OPS);
    expect(states).toHaveLength(LOOK_OPS.length + 1);
    const last = states.at(-1)!;
    expect(last.stack).toEqual([]);
    expect(last.taken).toEqual([2, 3, 1, 0]);
  });

  it('拿盘子总是拿最上面那个，空了不能再拿', () => {
    expect(() => runPlates([{ kind: 'pop' }])).toThrow();
    for (let k = 0; k < 500; k++) {
      const states = runPlates(plateGame());
      for (let j = 1; j < states.length; j++) {
        const before = states[j - 1];
        const s = states[j];
        if (s.op!.kind === 'pop') {
          expect(s.moved).toBe(before.stack[topIndex(before.stack)]);
          expect(s.stack).toEqual(before.stack.slice(0, -1));
        } else {
          expect(s.stack).toEqual([...before.stack, s.moved]);
        }
      }
    }
  });

  it('玩法一的局面：5 个不同的盘子，最后拿完，至少叠到 3 个，拿过之后还会再放', () => {
    for (let k = 0; k < 2000; k++) {
      const ops = plateGame();
      expect(ops).toHaveLength(10);
      const pushes = ops.filter((o) => o.kind === 'push').map((o) => (o.kind === 'push' ? o.plate : -1));
      expect(new Set(pushes).size).toBe(5);
      const states = runPlates(ops);
      expect(states.at(-1)!.stack).toEqual([]);
      expect(Math.max(...states.map((s) => s.stack.length))).toBeGreaterThanOrEqual(3);
      const firstPop = ops.findIndex((o) => o.kind === 'pop');
      expect(ops.slice(firstPop).some((o) => o.kind === 'push')).toBe(true);
      // 每次拿的时候至少有两个盘子可选（第一次拿之前至少叠了两个）
      expect(states[firstPop].stack.length).toBeGreaterThanOrEqual(2);
      // 最先放的盘子最后拿到
      expect(states.at(-1)!.taken.at(-1)).toBe(pushes[0]);
    }
  });

  it('星星', () => {
    expect([0, 1, 2, 3, 9].map(stars)).toEqual([3, 2, 2, 1, 1]);
  });
});

describe('栈 玩二：拼积木', () => {
  it('pairOf 和 isOpener', () => {
    expect([...OPENERS].map(pairOf).join('')).toBe(CLOSERS);
    expect([...OPENERS].every(isOpener)).toBe(true);
    expect([...CLOSERS].some(isOpener)).toBe(false);
  });

  it('按 bracketAction 一路走下去，结论和笨办法一致', () => {
    for (let k = 0; k < 5000; k++) {
      const s = randomBrackets(Math.floor(Math.random() * 12));
      let stack: string[] = [];
      let ok = true;
      for (const c of s) {
        const a = bracketAction(stack, c);
        if (a === 'stuck') { ok = false; break; }
        stack = a === 'push' ? [...stack, c] : stack.slice(0, -1);
      }
      if (ok) ok = bracketEnd(stack) === 'clear';
      expect(ok).toBe(slowValid(s));
    }
  });

  it('四种题各自符合描述', () => {
    for (let k = 0; k < 2000; k++) {
      for (const kind of ['good', 'cross', 'left', 'extra'] as PuzzleKind[]) {
        const pairs = 2 + (k % 4);
        const s = bracketPuzzle(kind, pairs);
        const d = rounds(s);
        const last = d.at(-1)!;
        if (kind === 'good') {
          expect(s).toHaveLength(2 * pairs);
          expect(last.correct).toBe('true');
        } else if (kind === 'cross') {
          expect(s).toHaveLength(2 * pairs);
          expect(last.correct).toBe('fail');
          expect(last.stack.length).toBeGreaterThan(0); // 卡在形状不对，不是栈空
        } else if (kind === 'left') {
          expect(s).toHaveLength(2 * pairs - 1);
          expect(last.correct).toBe('false');
        } else {
          expect(s).toHaveLength(2 * pairs - 1);
          expect(last.correct).toBe('fail');
          expect(last.stack).toEqual([]); // 右括号来的时候栈是空的
        }
      }
    }
  });

  it('一局三串：一串合法、一串形状不对、一串多了一块', () => {
    for (let k = 0; k < 1000; k++) {
      const game = bracketGame();
      expect(game).toHaveLength(3);
      expect(game.filter((s) => slowValid(s))).toHaveLength(1);
      for (const s of game) expect(s.length).toBeLessThanOrEqual(6);
    }
  });

  it('genBalanced 总是合法', () => {
    for (let k = 0; k < 2000; k++) expect(slowValid(genBalanced(k % 9))).toBe(true);
  });
});

describe('栈 做：逐步执行', () => {
  it('5000 个随机串，结果和笨办法一致，只有最后一步 done', () => {
    for (let k = 0; k < 5000; k++) {
      const s = k % 2 ? randomBrackets(k % 15) : genBalanced(k % 8);
      const steps = buildTrace(s);
      const last = steps.at(-1)!;
      expect(last.done).toBe(true);
      expect(steps.filter((x) => x.done)).toHaveLength(1);
      expect(last.result).toBe(slowValid(s));
      expect(isValid(s)).toBe(slowValid(s));
      for (const st of steps) {
        expect(st.line).toBeGreaterThanOrEqual(1);
        expect(st.line).toBeLessThanOrEqual(CODE.length);
        expect(CODE[st.line - 1].trim()).not.toBe('}');
        // 栈里只有左括号
        expect(st.stack.every(isOpener)).toBe(true);
      }
    }
  });

  it('每一步的栈和真的栈一致：入栈在第 5 行、出栈在第 7 行', () => {
    for (let k = 0; k < 2000; k++) {
      const s = randomBrackets(k % 12);
      const steps = buildTrace(s);
      for (let j = 1; j < steps.length; j++) {
        const a = steps[j - 1];
        const b = steps[j];
        if (b.line === 5) expect(b.stack).toEqual([...a.stack, s[b.i]]);
        else if (b.line === 7 && b.top !== null) {
          expect(b.stack).toEqual(a.stack.slice(0, -1));
          expect(b.top).toBe(a.stack.at(-1));
        } else expect(b.stack).toEqual(a.stack);
      }
    }
  });

  it('行号指向对应的代码', () => {
    expect(CODE[1]).toContain('ArrayDeque');
    expect(CODE[4]).toContain('addLast');
    expect(CODE[6]).toContain('removeLastOrNull');
    expect(CODE[7]).toContain('pairOf(top) != c');
    expect(CODE[10]).toContain('return stack.isEmpty()');
  });

  it('clean 只留下括号', () => {
    expect(clean('a(b[c]d)e{ }')).toBe('([]){}');
  });
});

describe('栈 做：猜下一步', () => {
  it('rounds 和 buildTrace 一致', () => {
    for (let k = 0; k < 3000; k++) {
      const s = k % 2 ? randomBrackets(k % 12) : genPredict();
      const d = rounds(s);
      const steps = buildTrace(s);
      const pushes = steps.filter((x) => x.line === 5).map((x) => x.i);
      const pops = steps.filter((x) => x.line === 8 && x.result === null).map((x) => x.i);
      expect(d.filter((x) => x.correct === 'push').map((x) => x.i)).toEqual(pushes);
      expect(d.filter((x) => x.correct === 'pop').map((x) => x.i)).toEqual(pops);
      const last = d.at(-1)!;
      if (slowValid(s)) expect(last.correct).toBe('true');
      else expect(['false', 'fail']).toContain(last.correct);
      // 每个决定前的栈就是 buildTrace 里取这个字符时的栈
      for (const x of d) {
        const at = steps.find((st) => (x.i < s.length ? st.line === 3 && st.i === x.i : st.line === 11));
        expect(at!.stack).toEqual(x.stack);
      }
    }
  });
});

describe('栈 做：找 bug', () => {
  it('每个坑只改了一行，改回来就是正确代码', () => {
    for (const b of BUGS) {
      const diff = b.code.map((t, k) => (t === CODE[k] ? -1 : k + 1)).filter((x) => x > 0);
      expect(diff).toEqual([b.wrongLine]);
      expect(CODE[b.wrongLine - 1]).toBe(b.fixed);
    }
  });

  it('每个坑在演示输入上都会出错，正确代码在同样的输入上返回 false', () => {
    const end = Object.fromEntries(BUGS.map((b) => [b.id, runBug(b).at(-1)!]));
    expect(end['no-empty'].outcome).toBe('crash');
    expect(end['no-final'].result).toBe(true);
    expect(end['no-type'].result).toBe(true);
    for (const b of BUGS) expect(isValid(b.input)).toBe(false);
  });

  it('runBug 的行号在 bug 版代码范围里，并且只有最后一步 done', () => {
    for (const b of BUGS) {
      const steps = runBug(b);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      for (const s of steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(b.code.length);
      }
      // 出错前一直经过出错的那一行
      expect(steps.some((s) => s.line === b.wrongLine)).toBe(true);
    }
  });
});

describe('栈 做：挑战', () => {
  it('n = 1..7 的每个排列：贪心结论和「没有 3…1…2 形状」一致，个数是卡特兰数', () => {
    const catalan = [1, 1, 2, 5, 14, 42, 132, 429];
    for (let n = 1; n <= 7; n++) {
      const all = perms(Array.from({ length: n }, (_, k) => k + 1));
      let ok = 0;
      for (const p of all) {
        const can = canPop(n, p);
        expect(can).toBe(!has312(p));
        if (can) ok++;
      }
      expect(ok).toBe(catalan[n]);
    }
  });

  it('permTrace：出栈序列就是目标的前缀，栈和入栈队列守恒', () => {
    for (const p of perms([1, 2, 3, 4, 5])) {
      const steps = permTrace(5, p);
      for (const s of steps) {
        expect(p.slice(0, s.out.length)).toEqual(s.out);
        expect(s.stack.length + s.out.length).toBe(s.next - 1);
        // 栈里从下到上是递增的
        for (let k = 1; k < s.stack.length; k++) expect(s.stack[k]).toBeGreaterThan(s.stack[k - 1]);
      }
      expect(steps.filter((s) => s.done)).toHaveLength(1);
    }
  });

  it('permPuzzles：能和不能各约一半、不重复、不出最简单的两种', () => {
    for (let k = 0; k < 300; k++) {
      const ps = permPuzzles(5);
      expect(ps).toHaveLength(5);
      expect(new Set(ps.map((p) => p.join())).size).toBe(5);
      expect(ps.filter((p) => canPop(CHALLENGE_N, p))).toHaveLength(3);
      for (const p of ps) {
        expect([...p].sort()).toEqual([1, 2, 3, 4, 5]);
        expect(p.join()).not.toBe('1,2,3,4,5');
        expect(p.join()).not.toBe('5,4,3,2,1');
      }
    }
  });
});

describe('栈 迁移后的引擎导出', () => {
  it('lookFrames：每页有台词，盘子和 runPlates 一致，末页收尾', () => {
    const fs = lookFrames();
    const states = runPlates(LOOK_OPS);
    expect(fs).toHaveLength(states.length + 1);
    fs.forEach((f, k) => {
      expect(f.say.length).toBeGreaterThan(0);
      expect(f.stack).toEqual(states[Math.min(k, states.length - 1)].stack);
    });
    expect(fs[0].say).toContain('小熊');
    expect(fs.at(-1)!.say).toContain('栈');
    expect(fs.map((f) => f.say)).toEqual(lookFrames().map((f) => f.say));
  });

  it('rounds：选项分字符题和结束题，答错解释非空且点名字符', () => {
    for (let k = 0; k < 500; k++) {
      const s = genPredict(seeded(k));
      const rs: Round[] = rounds(s);
      rs.forEach((r) => {
        expect(r.why.length).toBeGreaterThan(0);
        expect(r.options).toBe(r.i < s.length ? CHAR_MOVES : END_MOVES);
        expect(r.options.map((o) => o.move)).toContain(r.correct);
        if (r.i < s.length) expect(r.why).toContain(s[r.i]);
      });
    }
    expect(rounds('(]').at(-1)!.why).toContain('要配 )');
    expect(rounds(')').at(-1)!.why).toContain('栈是空的');
    expect(rounds('(').at(-1)!.why).toContain('还剩 1 个');
  });

  it('genPredict、presetString、genChallenge：固定种子可复现', () => {
    for (const seed of [1, 7, 42]) {
      expect(genPredict(seeded(seed))).toBe(genPredict(seeded(seed)));
      expect(genChallenge(seeded(seed))).toEqual(genChallenge(seeded(seed)));
      for (const b of TRACE_PRESETS) {
        const a = presetString(b.kind, seeded(seed));
        expect(a).toBe(presetString(b.kind, seeded(seed)));
        expect(a.length).toBeLessThanOrEqual(2 * 5);
        expect(slowValid(a)).toBe(b.kind === 'good');
      }
    }
    const ps = genChallenge(seeded(3));
    expect(ps).toHaveLength(CHALLENGE_COUNT);
    for (const p of ps) expect([...p].sort()).toEqual(Array.from({ length: CHALLENGE_N }, (_, k) => k + 1));
  });

  it('bugVerdict：没跑完是空，崩溃和返回错误各有说法', () => {
    for (const b of BUGS) expect(bugVerdict(runBug(b)[0], b)).toBe('');
    const text = Object.fromEntries(BUGS.map((b) => [b.id, bugVerdict(runBug(b).at(-1)!, b)]));
    expect(text['no-empty']).toContain('崩溃');
    expect(text['no-final']).toBe('❌ 返回了 true，不对');
    expect(text['no-type']).toBe('❌ 返回了 true，不对');
  });
});
