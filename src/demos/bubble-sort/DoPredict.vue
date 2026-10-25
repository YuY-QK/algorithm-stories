<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { PREDICT_N, genPredict, passedOver, rounds, type Round } from '../../engine/bubble-sort';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { useStreak } from '../../components/shared/useStreak';
import { PAUSE_START, PAUSE_TICK } from '../../components/shared/timing';
import { useStageStop } from '../../components/shared/usePlayer';

// 做：猜下一步。每一轮开始前猜两件事：这一轮结束后哪个数站到最右边（还没排好的部分），
// 这一轮会交换几次。答完播放这一轮，验证你的猜测。连对 6 次过关。
const GOAL = 6;

const arr = ref<number[]>([]);
const list = ref<Round<number>[]>([]);
const r = ref(0);
const view = ref<number[]>([]);
const sortedFrom = ref(PREDICT_N);
const j = ref<number | null>(null);
const phase = ref<'top' | 'count' | 'wrong' | 'anim' | 'end'>('top');
const wrongOf = ref<'top' | 'count'>('top');
const picked = ref<number | null>(null);
const why = ref('');
const { streak, passed, hit, miss: resetStreak } = useStreak(GOAL);
let timer: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}
// 切标签时动画停下；停在半路的这一题作废，换一题，免得卡在「进行中」
useStageStop(() => { if (phase.value === 'anim') fresh(); else clearTimer(); });
onBeforeUnmount(clearTimer);

function fresh() {
  clearTimer();
  arr.value = genPredict();
  list.value = rounds(arr.value, (v) => v);
  r.value = 0;
  view.value = arr.value.slice();
  sortedFrom.value = PREDICT_N;
  j.value = null;
  picked.value = null;
  phase.value = 'top';
}
fresh();

const cur = computed(() => list.value[r.value]);
const over = computed(() => (phase.value === 'wrong' && wrongOf.value === 'count' ? passedOver(cur.value.before, cur.value.end) : []));

function miss(kind: 'top' | 'count', text: string) {
  resetStreak();
  wrongOf.value = kind;
  why.value = text;
  phase.value = 'wrong';
}

function tapCell(k: number) {
  if (phase.value !== 'top' || k > cur.value.end) return;
  picked.value = k;
  if (view.value[k] === cur.value.top) {
    hit();
    phase.value = 'count';
  } else {
    miss('top', cur.value.whyTop);
  }
}

function chooseCount(c: number) {
  if (phase.value !== 'count') return;
  if (c === cur.value.swaps) {
    hit();
    animate();
  } else {
    miss('count', cur.value.why);
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
      timer = setTimeout(tick, PAUSE_TICK);
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
  timer = setTimeout(tick, PAUSE_START);
}

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
  <PredictFrame
    :streak="streak"
    :goal="GOAL"
    :passed="passed"
    :prompt="prompt"
    :wrong="phase === 'wrong' ? why : null"
    :ended="phase === 'end'"
    @continue="goOn"
    @next="fresh"
  >
    <template #board>
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
    </template>
    <template #answers>
      <div v-if="phase === 'count'" class="answers">
        <button v-for="c in cur.end + 1" :key="c" type="button" class="btn small mono" @click="chooseCount(c - 1)">{{ c - 1 }} 次</button>
      </div>
    </template>
  </PredictFrame>
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
</style>
