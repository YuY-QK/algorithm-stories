<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { bubbleRounds, distinctArray, passedOver, type Round } from '../../engine/bubble-sort';

// 做：猜下一步。每一轮开始前猜两件事：这一轮结束后哪个数站到最右边（还没排好的部分），
// 这一轮会交换几次。答完播放这一轮，验证你的猜测。连对 6 次过关。
const GOAL = 6;
const N = 6;

const arr = ref<number[]>([]);
const list = ref<Round<number>[]>([]);
const r = ref(0);
const view = ref<number[]>([]);
const sortedFrom = ref(N);
const j = ref<number | null>(null);
const phase = ref<'top' | 'count' | 'wrong' | 'anim' | 'end'>('top');
const wrongOf = ref<'top' | 'count'>('top');
const picked = ref<number | null>(null);
const why = ref('');
const streak = ref(0);
const passed = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

function fresh() {
  if (timer) clearTimeout(timer);
  arr.value = distinctArray(N, 30);
  list.value = bubbleRounds(arr.value, (v) => v);
  r.value = 0;
  view.value = arr.value.slice();
  sortedFrom.value = N;
  j.value = null;
  picked.value = null;
  phase.value = 'top';
}
fresh();

const cur = computed(() => list.value[r.value]);
const over = computed(() => (phase.value === 'wrong' && wrongOf.value === 'count' ? passedOver(cur.value.before, cur.value.end) : []));

function hit() {
  streak.value++;
  if (streak.value >= GOAL) passed.value = true;
}
function miss(kind: 'top' | 'count', text: string) {
  streak.value = 0;
  wrongOf.value = kind;
  why.value = text;
  phase.value = 'wrong';
}

function tapCell(k: number) {
  if (phase.value !== 'top' || k > cur.value.end) return;
  picked.value = k;
  const { top, end } = cur.value;
  if (view.value[k] === top) {
    hit();
    phase.value = 'count';
  } else {
    miss('top', '这一轮要比的是下标 0 到 ' + end + '。每次比较都把较大的往右带，所以其中最大的 ' + top + ' 一旦被碰到，就会被一路带到下标 ' + end + '。');
  }
}

function chooseCount(c: number) {
  if (phase.value !== 'count') return;
  const { swaps, before, end } = cur.value;
  if (c === swaps) {
    hit();
    animate();
  } else {
    const ks = passedOver(before, end);
    miss('count', '这一轮换了 ' + swaps + ' 次。从左往右，「目前最大的数」一路往右走，遇到比它小的就换一次。'
      + (ks.length ? '左边出现过更大数的是 ' + ks.map((k) => before[k]).join('、') + '（标了红框），每个被越过一次。' : '每个数左边都没有比它大的，一次都不用换。'));
  }
}

function goOn() {
  if (wrongOf.value === 'top') {
    picked.value = null;
    phase.value = 'count';
  } else animate();
}

function animate() {
  phase.value = 'anim';
  const rd = cur.value;
  let c = 0;
  const tick = () => {
    if (c < rd.compares.length) {
      j.value = rd.compares[c].j;
      view.value = rd.compares[c].after;
      c++;
      timer = setTimeout(tick, 320);
      return;
    }
    j.value = null;
    picked.value = null;
    if (rd.quiet || rd.end <= 1) {
      sortedFrom.value = 0;
      phase.value = 'end';
      return;
    }
    sortedFrom.value = rd.end;
    r.value++;
    phase.value = 'top';
  };
  timer = setTimeout(tick, 200);
}

onBeforeUnmount(() => { if (timer) clearTimeout(timer); });

const prompt = computed(() => {
  if (phase.value === 'end') {
    const rd = cur.value;
    return rd.quiet
      ? '第 ' + (rd.i + 1) + ' 轮一次都没换，if (!swapped) break，排好了。'
      : '只剩一个没排，外层循环走完，排好了。';
  }
  if (phase.value === 'anim') return '第 ' + (cur.value.i + 1) + ' 轮进行中……';
  const { i, end } = cur.value;
  if (phase.value === 'top' || (phase.value === 'wrong' && wrongOf.value === 'top')) return '第 ' + (i + 1) + ' 轮（i = ' + i + '）：结束后，下标 ' + end + ' 上会是哪个数？点它。';
  return '第 ' + (i + 1) + ' 轮会交换几次？';
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
          cmp: j !== null && (k === j || k === j + 1),
          done: k >= sortedFrom,
          goal: (phase === 'top' || phase === 'count') && k === cur.end,
          miss: phase === 'wrong' && wrongOf === 'top' && k === picked,
          over: over.includes(k),
        }"
        :disabled="phase !== 'top' || k > cur.end"
        :aria-label="'下标 ' + k + '，值 ' + v"
        @click="tapCell(k)"
      >
        <span class="val">{{ v }}</span>
        <span class="idx">{{ k }}</span>
      </button>
    </div>
    <p class="note" aria-live="polite">{{ prompt }}</p>
    <div v-if="phase === 'count'" class="answers">
      <button v-for="c in cur.end + 1" :key="c" type="button" class="btn small mono" @click="chooseCount(c - 1)">{{ c - 1 }} 次</button>
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
.arr { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; max-width: 420px; }
.cell { font: inherit; background: none; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; color: var(--fg); cursor: pointer; }
.cell:disabled { cursor: default; }
.cell:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 6px; }
.val {
  width: 100%; height: 44px; display: grid; place-items: center;
  font: 600 15px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.cell:not(:disabled):hover .val { border-color: var(--accent); }
.cell.goal .val { border-style: dashed; border-color: var(--accent); border-width: 2px; }
.cell.cmp .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.cell.done .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.cell.miss .val, .cell.over .val { border-color: var(--warn); border-width: 2.5px; color: var(--warn); }
.answers .btn { flex: 0 1 auto; }
.mono { font-family: var(--mono); }
.win { border-color: var(--accent); color: var(--accent); }
.oops-box { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; border-left: 3px solid var(--warn); padding-left: 12px; }
</style>
