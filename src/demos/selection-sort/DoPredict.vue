<script setup lang="ts">
import { computed, ref } from 'vue';
import { genArray, rounds, swapAt, type Round } from '../../engine/selection-sort';

// 做：猜下一步。每一轮先点出 minIdx 最后停在哪，再说出这一轮 minIdx 被改了几次。连对 6 次过关。
const GOAL = 6;

const arr = ref<number[]>([]);
const list = ref<Round[]>([]);
const r = ref(0);
const phase = ref<'min' | 'count' | 'wrong' | 'end'>('min');
/** 答错的是哪一问 */
const wrongAt = ref<'min' | 'count'>('min');
const picked = ref<number | null>(null);
const why = ref('');
const streak = ref(0);
const passed = ref(false);

function fresh() {
  const n = 6 + Math.floor(Math.random() * 3);
  arr.value = genArray(n, Math.random() < 0.35 ? 'dups' : 'random');
  list.value = rounds(arr.value);
  r.value = 0;
  phase.value = 'min';
  picked.value = null;
}
fresh();

const cur = computed(() => list.value[r.value]);
const final = computed(() => {
  const last = list.value[list.value.length - 1];
  return swapAt(last.before, last.i, last.minIdx);
});
/** 画面上的数组：这一轮开始时的样子；结束时是排好的 */
const view = computed(() => (phase.value === 'end' ? final.value : cur.value.before));
const sorted = computed(() => (phase.value === 'end' ? arr.value.length : cur.value.i));
const showMin = computed(() => (phase.value === 'count' || (phase.value === 'wrong' && wrongAt.value === 'count') ? cur.value.minIdx : null));

const choices = computed(() => Array.from({ length: arr.value.length - cur.value.i }, (_, k) => k));

function hit() {
  streak.value++;
  if (streak.value >= GOAL) passed.value = true;
}
function miss(at: 'min' | 'count', text: string) {
  streak.value = 0;
  wrongAt.value = at;
  why.value = text;
  phase.value = 'wrong';
}

/** minIdx 在这一轮里依次指过哪些下标 */
function path(rd: Round): number[] {
  const out = [rd.i];
  for (let j = rd.i + 1; j < rd.before.length; j++) if (rd.before[j] < rd.before[out[out.length - 1]]) out.push(j);
  return out;
}

function tapCell(k: number) {
  if (phase.value !== 'min') return;
  picked.value = k;
  const { i, minIdx, before } = cur.value;
  if (k === minIdx) {
    hit();
    phase.value = 'count';
    return;
  }
  const v = before[minIdx];
  const dup = k > i && before[k] === v;
  miss('min', dup
    ? 'arr[' + k + '] 也是 ' + v + '，可是判断用的是 <：遇到一样小的不会改 minIdx，所以留在最前面的 ' + minIdx + '。'
    : k < i
      ? '下标 ' + k + ' 在 i 前面，已经排好了。这一轮只在 i = ' + i + ' 及以后找，最小的是 arr[' + minIdx + '] = ' + v + '。'
      : '从 i = ' + i + ' 往后，最小的是 arr[' + minIdx + '] = ' + v + '，minIdx 停在 ' + minIdx + '。');
}

function chooseCount(c: number) {
  if (phase.value !== 'count') return;
  const rd = cur.value;
  if (c === rd.updates) {
    hit();
    advance();
    return;
  }
  const ps = path(rd);
  miss('count', ps.length === 1
    ? '后面没有比 arr[' + rd.i + '] = ' + rd.before[rd.i] + ' 更小的，minIdx 一次都没改。'
    : 'minIdx 依次是 ' + ps.join(' → ') + '（值 ' + ps.map((x) => rd.before[x]).join(' → ') + '），改了 ' + rd.updates + ' 次。只有遇到比「目前最小的」还小的才改，不是比 arr[i] 小就改。');
}

function advance() {
  picked.value = null;
  if (r.value >= list.value.length - 1) phase.value = 'end';
  else {
    r.value++;
    phase.value = 'min';
  }
}

/** 答错后看完解释，按正确答案继续 */
function goOn() {
  if (wrongAt.value === 'min') {
    picked.value = null;
    phase.value = 'count';
  } else advance();
}

const prompt = computed(() => {
  if (phase.value === 'end') return '最后一个不用挑，排好了。';
  const { i } = cur.value;
  if (phase.value === 'min' || (phase.value === 'wrong' && wrongAt.value === 'min')) return '第 ' + (i + 1) + ' 轮，i = ' + i + '。minIdx 最后停在哪一格？点它。';
  return 'minIdx 停在 ' + cur.value.minIdx + '。这一轮里 minIdx 被改了几次（第 7 行执行几次）？';
});
</script>

<template>
  <div class="stage">
    <div class="vars">
      <span class="chip"><small>连对</small>{{ Math.min(streak, GOAL) }} / {{ GOAL }}</span>
      <span v-if="passed" class="chip win">🏅 过关</span>
    </div>
    <div class="arr">
      <button
        v-for="(v, k) in view"
        :key="k"
        type="button"
        class="cell"
        :class="{
          fixed: k < sorted,
          least: k === showMin,
          miss: phase === 'wrong' && wrongAt === 'min' && k === picked,
          right: phase === 'wrong' && wrongAt === 'min' && k === cur.minIdx,
        }"
        :disabled="phase !== 'min'"
        :aria-label="'下标 ' + k + '，值 ' + v"
        @click="tapCell(k)"
      >
        <span class="tag">{{ phase !== 'end' && k === cur.i ? 'i' : '' }}</span>
        <span class="val">{{ v }}</span>
        <span class="idx">{{ k }}</span>
      </button>
    </div>
    <p class="note" aria-live="polite">{{ prompt }}</p>
    <div v-if="phase === 'count'" class="counts">
      <button v-for="c in choices" :key="c" type="button" class="btn small mono" :aria-label="c + ' 次'" @click="chooseCount(c)">{{ c }}</button>
    </div>
    <div v-if="phase === 'wrong'" class="oops-box">
      <p>❌ {{ why }}</p>
      <button type="button" class="btn small" @click="goOn">知道了，继续</button>
    </div>
    <div v-if="phase === 'end'" class="row">
      <button type="button" class="btn small primary" @click="fresh">下一题</button>
    </div>
  </div>
</template>

<style scoped>
.arr { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 10px 5px; }
.cell { font: inherit; background: none; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; color: var(--fg); cursor: pointer; }
.cell:disabled { cursor: default; }
.cell:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 6px; }
.val {
  width: 100%; height: 40px; display: grid; place-items: center;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.cell:not(:disabled):hover .val { border-color: var(--accent); }
.cell.fixed .val { background: var(--out); color: var(--out-ink); border-color: transparent; }
.cell.least .val, .cell.right .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.cell.miss .val { border-color: var(--warn); color: var(--warn); }
.counts { display: flex; flex-wrap: wrap; gap: 8px; }
.counts .btn { min-width: 3em; }
.mono { font-family: var(--mono); }
.win { border-color: var(--accent); color: var(--accent); }
.oops-box { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; border-left: 3px solid var(--warn); padding-left: 12px; }
</style>
