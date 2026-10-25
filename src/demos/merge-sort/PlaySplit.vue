<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { countChoices, judgeCut, kidOf, nextRow, splitRounds, stars, type Piece } from '../../engine/merge-sort';
import { useStageStop } from '../../components/shared/usePlayer';
import { PAUSE_SHORT } from '../../components/shared/timing';

// 玩法二「拆一拆」：一队小动物，孩子点 ✂️ 把每一队从正中间切开，一轮一轮切到每队只剩 1 个，再数一数切了几轮。
// 切歪了不说错：左右两边的小动物分别亮起来，让孩子数一数是不是一样多；再歪一次，正中间的 ✂️ 透出光。
const games = ref(0);
const n = ref(8);
const rows = ref<Piece[][]>([]);
const cutSets = ref<Set<number>[]>([]);
const phase = ref<'cut' | 'ask' | 'done'>('cut');
const mistakes = ref(0);
const say = ref('');
/** 切歪的那一刀：哪一队、切在哪、这一队已经歪了几次 */
const probe = ref<{ start: number; at: number; misses: number } | null>(null);
const askWrong = ref(false);
const hintNums = ref(false);
const chosen = ref<number | null>(null);
const rounds = computed(() => splitRounds(n.value));
let timers: ReturnType<typeof setTimeout>[] = [];
const later = (ms: number, fn: () => void) => {
  const id = setTimeout(() => {
    timers = timers.filter((x) => x !== id);
    fn();
  }, ms);
  timers.push(id);
};
function stopTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function fresh() {
  stopTimers();
  n.value = games.value % 2 === 0 ? 8 : 4;
  games.value++;
  rows.value = [[{ start: 0, size: n.value }]];
  cutSets.value = [new Set()];
  phase.value = 'cut';
  mistakes.value = 0;
  probe.value = null;
  askWrong.value = false;
  hintNums.value = false;
  chosen.value = null;
  say.value = '👆 点 ✂️，把这一队从正中间切开';
}
fresh();

const live = computed(() => rows.value.length - 1);
const isCut = (r: number, p: Piece) => [...cutSets.value[r]].some((g) => g > p.start && g < p.start + p.size);
const cutAt = (r: number, p: Piece) => [...cutSets.value[r]].find((g) => g > p.start && g < p.start + p.size);

function cut(p: Piece, at: number) {
  if (phase.value !== 'cut') return;
  const j = judgeCut(p.size, at);
  if (!j.ok) {
    mistakes.value++;
    const prev = probe.value && probe.value.start === p.start ? probe.value.misses : 0;
    probe.value = { start: p.start, at, misses: prev + 1 };
    say.value = '🤔 左边 ' + j.left + ' 个，右边 ' + j.right + ' 个，一样多吗？';
    return;
  }
  probe.value = null;
  cutSets.value[live.value].add(p.start + at);
  cutSets.value = [...cutSets.value];
  say.value = '✂️ 对半啦：' + j.left + ' 个和 ' + j.right + ' 个';
  const row = rows.value[live.value];
  if (row.every((q) => q.size <= 1 || isCut(live.value, q))) {
    later(PAUSE_SHORT, () => {
      rows.value = [...rows.value, nextRow(row)];
      cutSets.value = [...cutSets.value, new Set()];
      if (rows.value[live.value].every((q) => q.size <= 1)) {
        phase.value = 'ask';
        say.value = '每队都只剩 1 个啦！一共对半分了几轮？';
      } else say.value = '👆 再把每一队都从正中间切开';
    });
  }
}

const choices = computed(() => countChoices(rounds.value));
function answer(c: number) {
  if (phase.value !== 'ask') return;
  chosen.value = c;
  if (c !== rounds.value) {
    mistakes.value++;
    askWrong.value = false;
    requestAnimationFrame(() => (askWrong.value = true));
    hintNums.value = true;
    say.value = '🤔 数一数中间的 ✂️，一个 ✂️ 是一轮';
    return;
  }
  hintNums.value = true;
  phase.value = 'done';
  say.value = '🎉 ' + n.value + ' 个，对半分了 ' + rounds.value + ' 轮！';
}

const earned = computed(() => stars(mistakes.value));
const chain = computed(() => rows.value.map((r) => r[0].size).join(' → '));

function side(r: number, p: Piece, x: number) {
  const pr = probe.value;
  if (r !== live.value || !pr || pr.start !== p.start) return '';
  return x < pr.at ? 'sa' : 'sb';
}

// 切换标签时动画要停：切完这一刀还没翻到下一排就重新开一局
useStageStop(() => {
  if (phase.value === 'cut' && timers.length) fresh();
});
onBeforeUnmount(stopTimers);
</script>

<template>
  <div class="game">
    <p class="small-note">目标：点两个小动物之间的 ✂️，把每一队从正中间切成一样多的两队。一轮一轮切到每队只剩 1 个，最后数一数一共切了几轮。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <div class="rows" :style="{ '--n': n }">
      <template v-for="(row, r) in rows" :key="r">
        <div v-if="r > 0" class="between" aria-hidden="true">✂️ ↓<span v-if="hintNums"> 第 {{ r }} 轮</span></div>
        <div class="grid">
          <div
            v-for="p in row"
            :key="p.start"
            class="piece"
            :class="{ live: r === live && phase === 'cut' && p.size > 1 }"
            :style="{ gridColumn: 'span ' + p.size }"
          >
            <div class="cards" :style="{ '--s': p.size }">
              <span v-for="x in p.size" :key="x" class="ca" :class="side(r, p, x - 1)">{{ kidOf(p.start + x - 1) }}</span>
              <i v-if="isCut(r, p)" class="line" :style="{ left: ((cutAt(r, p)! - p.start) / p.size) * 100 + '%' }" />
            </div>
            <template v-if="r === live && phase === 'cut' && p.size > 1 && !isCut(r, p)">
              <button
                v-for="at in p.size - 1"
                :key="at"
                type="button"
                class="joint"
                :class="{ glow: probe && probe.start === p.start && probe.misses >= 2 && at === p.size / 2 }"
                :style="{ left: (at / p.size) * 100 + '%' }"
                :aria-label="'在第 ' + at + ' 个后面切一刀'"
                @click="cut(p, at)"
              >✂️</button>
            </template>
          </div>
        </div>
      </template>
    </div>

    <div v-if="phase === 'ask'" class="answers ask-row">
      <button
        v-for="c in choices"
        :key="c"
        type="button"
        class="btn big"
        :class="{ shake: askWrong && chosen === c }"
        :aria-label="'分了 ' + c + ' 轮'"
        @click="answer(c)"
      >{{ c }} 轮</button>
    </div>

    <div v-if="phase === 'done'" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <p>👀 每队人数：{{ chain }}。每轮对半，人数减半，所以 {{ n }} 个只要分 {{ rounds }} 轮。{{ n === 8 ? '再来一局试试 4 个：分几轮？' : '再来一局试试 8 个：分几轮？' }}</p>
      <button type="button" class="btn primary" @click="fresh">🔁 再来一局</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 14px; max-width: 560px; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.rows { display: flex; flex-direction: column; gap: 4px; }
.grid { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 4px; }
.piece { position: relative; min-width: 0; border: 1.5px dashed var(--line); border-radius: 8px; padding: 4px 2px; box-sizing: border-box; background: var(--bg); }
.piece.live { padding-bottom: 32px; border-style: solid; border-color: var(--accent); }
.cards { position: relative; display: grid; grid-template-columns: repeat(var(--s), minmax(0, 1fr)); }
.ca { text-align: center; font-size: clamp(16px, 5vw, 26px); line-height: 1.4; border-radius: 6px; transition: background 0.2s; }
.ca.sa { background: var(--mid); }
.ca.sb { background: var(--out); outline: 1.5px solid var(--mid); outline-offset: -1.5px; }
.line { position: absolute; top: 2px; bottom: 2px; width: 0; border-left: 3px solid var(--accent); transform: translateX(-1.5px); }
.joint {
  position: absolute; bottom: 2px; width: 30px; height: 28px; margin-left: -15px; padding: 0; font-size: 16px; line-height: 1;
  border: 1.5px solid var(--line); border-radius: 8px; background: var(--surface); cursor: pointer;
}
.joint:hover { border-color: var(--accent); }
.joint:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.joint.glow { background: var(--mid); border-color: var(--mid); box-shadow: 0 0 0 4px color-mix(in srgb, var(--mid) 45%, transparent); }
.between { text-align: center; color: var(--muted); font-size: 13px; line-height: 1.2; }
.ask-row .btn { flex: 0 1 120px; font-size: 1.15rem; }
.btn.shake { animation: shake 0.5s; border-color: var(--warn); }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  50% { transform: translateX(6px); }
  75% { transform: translateX(-4px); }
}
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
@media (prefers-reduced-motion: reduce) {
  .btn.shake { animation: none; }
}
</style>
