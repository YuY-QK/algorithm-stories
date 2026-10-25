<script setup lang="ts">
import { computed, ref } from 'vue';
import { genPredict, rounds, swapAt, whyMin, type Round } from '../../engine/selection-sort';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { useStreak } from '../../components/shared/useStreak';

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
const { streak, passed, hit, miss: resetStreak } = useStreak(GOAL);

function fresh() {
  arr.value = genPredict();
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

function miss(at: 'min' | 'count', text: string) {
  resetStreak();
  wrongAt.value = at;
  why.value = text;
  phase.value = 'wrong';
}

function tapCell(k: number) {
  if (phase.value !== 'min') return;
  picked.value = k;
  if (k === cur.value.minIdx) {
    hit();
    phase.value = 'count';
    return;
  }
  miss('min', whyMin(cur.value, k));
}

function chooseCount(c: number) {
  if (phase.value !== 'count') return;
  const rd = cur.value;
  if (c === rd.updates) {
    hit();
    advance();
    return;
  }
  miss('count', rd.why);
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
    </template>
    <template #answers>
      <div v-if="phase === 'count'" class="counts">
        <button v-for="c in choices" :key="c" type="button" class="btn small mono" :aria-label="c + ' 次'" @click="chooseCount(c)">{{ c }}</button>
      </div>
    </template>
  </PredictFrame>
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
</style>
