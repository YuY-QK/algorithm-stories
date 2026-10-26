/**
 * 二分查找「小邮差找信箱」的关卡配置：四步里各有哪些块。文字都是 src/locales/<语言>/binary-search.json 里的键。
 */
import {
  BUGS, CODE, KID_N, bugInput, bugVerdict, buildTrace, lookFrames, pickSecret, runBug, traceSummary,
} from '../../engine/binary-search';
import { book, bugs, game, predict, prose, trace, write, type Level } from '../types';
import { msgOf } from '../../i18n/format';
import { challengeFlow, findFlow, hideFlow, predictFlow, traceInputFlow } from './flows';
import type zh from '../../locales/zh/binary-search.json';

const msg = msgOf<typeof zh>();

/** 延伸里的对比图：顺序查找和二分查找最坏要看几次 */
const sizes = [
  { label: '15', unit: 'more.fast.boxes', n: KID_N },
  { label: '1,000', unit: 'more.fast.thousand', n: 1000 },
  { label: '1,000,000', unit: 'more.fast.million', n: 1000000 },
  { label: '1,000,000,000', unit: 'more.fast.billion', n: 1000000000 },
];

const level: Level = {
  slug: 'binary-search',
  blocks: {
    look: [
      book({
        icon: '📖', title: 'look.title', intro: 'look.intro', again: 'look.again', view: 'Look',
        // 第一遍固定藏在 11 号，「再看一次」换一个
        initSeed: () => 11,
        nextSeed: (seed, rand) => pickSecret(rand, seed),
        frames: lookFrames,
      }),
    ],
    play: [
      game({ icon: '🍃', title: 'play.hide.title', goal: 'play.hide.goal', flow: hideFlow, view: 'PlayHide' }),
      game({ icon: '🐰', title: 'play.find.title', goal: 'play.find.goal', flow: findFlow, view: 'PlayFind' }),
    ],
    do: [
      trace({
        icon: '①', title: 'block.trace', intro: 'do.trace.intro', code: CODE, input: traceInputFlow, view: 'Trace',
        build: (i) => buildTrace(i.arr, i.target),
        vars: (s, i) => [['lo', s.lo], ['mid', s.mid ?? '—'], ['hi', s.hi], ['target', i.target], [msg('do.trace.checked'), msg('do.trace.count', { n: s.count })]],
        summary: (s, i) => traceSummary(s, i.arr, i.target),
      }),
      predict({ icon: '②', title: 'block.predict', intro: 'do.predict.intro', flow: predictFlow, view: 'Predict' }),
      bugs({
        icon: '③', title: 'block.bugs', intro: 'do.bugs.intro', bugs: BUGS, run: runBug, verdict: bugVerdict, input: bugInput, view: 'Bug',
        vars: (s, b) => [['lo', s.lo], ['mid', s.mid ?? '—'], ['hi', s.hi], ['target', b.target]],
      }),
      write({ icon: '④', title: 'block.write', pkg: 'binarysearch', target: 'do.write.target', todos: 'do.write.todos', items: ['do.write.search', 'do.write.lowerBound'] }),
      game({ icon: '⑤', title: 'block.challenge', flow: challengeFlow, view: 'Challenge' }),
    ],
    more: [
      prose({
        icon: '⚡', title: 'more.fast.title',
        lines: [
          'more.fast.text',
          {
            chart: 'log',
            rows: sizes.map((r) => ({
              label: r.label,
              unit: r.unit,
              bars: [
                { name: 'more.fast.linear', value: r.n, tone: 'muted' },
                { name: 'more.fast.binary', value: Math.floor(Math.log2(r.n)) + 1, tone: 'accent' },
              ],
            })),
          },
          { note: 'more.fast.note' },
        ],
      }),
      prose({ icon: '📏', title: 'more.sorted.title', lines: ['more.sorted.text'] }),
      prose({ icon: '🌍', title: 'more.world.title', lines: [{ list: ['more.world.bisect', 'more.world.index', 'more.world.stdlib', 'more.world.answer'] }] }),
    ],
  },
};

export default level;
