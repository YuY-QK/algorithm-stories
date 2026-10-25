<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { genPredict, rounds, whyFrom, type Round } from '../../engine/dynamic-programming';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { PAUSE_BRIEF, PAUSE_LONG } from '../../components/shared/timing';
import { useStageStop } from '../../components/shared/usePlayer';
import { useStreak } from '../../components/shared/useStreak';
import DpRow from './DpRow.vue';

// 做：猜下一步。每一格先点出「它从哪两格来」，再选它的值。连对 5 次过关。
const GOAL = 5;

const list = ref<Round[]>([]);
const r = ref(0);
const phase = ref<'from' | 'value' | 'wrong' | 'filled' | 'end'>('from');
const picked = ref<number[]>([]);
const miss = ref<number | null>(null);
const why = ref('');
const { streak, passed, hit, miss: missStreak } = useStreak(GOAL);
let afterWrong: 'from' | 'value' = 'from';
let timer: ReturnType<typeof setTimeout> | null = null;
function clearTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}
// 切走时不再等动画：这一格直接算填好，进入下一格
useStageStop(() => {
  const waiting = timer !== null && phase.value === 'filled';
  clearTimer();
  if (waiting) advance();
});
onBeforeUnmount(clearTimer);

function fresh() {
  clearTimer();
  list.value = rounds(genPredict());
  r.value = 0;
  phase.value = 'from';
  picked.value = [];
  miss.value = null;
}
fresh();

const cur = computed(() => list.value[r.value]);
const view = computed(() => {
  const c = cur.value;
  if (phase.value === 'filled' || phase.value === 'end') return c.dp.map((v, k) => (k === c.i ? c.value : v));
  return c.dp;
});

function bad(text: string, then: 'from' | 'value') {
  missStreak();
  why.value = text;
  afterWrong = then;
  phase.value = 'wrong';
}

function tapCell(k: number) {
  if (phase.value !== 'from') return;
  const c = cur.value;
  if (c.from.includes(k)) {
    if (!picked.value.includes(k)) picked.value = [...picked.value, k];
    if (picked.value.length === 2) {
      hit();
      phase.value = 'value';
    }
    return;
  }
  miss.value = k;
  bad(whyFrom(c, k), 'from');
}

function chooseValue(v: number) {
  if (phase.value !== 'value') return;
  const c = cur.value;
  if (v === c.value) {
    hit();
    phase.value = 'filled';
    clearTimer();
    timer = setTimeout(advance, PAUSE_LONG);
  } else bad(c.why, 'value');
}

function advance() {
  clearTimer();
  picked.value = [];
  miss.value = null;
  if (r.value >= list.value.length - 1) phase.value = 'end';
  else {
    r.value++;
    phase.value = 'from';
  }
}

function goOn() {
  miss.value = null;
  if (afterWrong === 'from') {
    picked.value = [...cur.value.from];
    phase.value = 'value';
  } else {
    phase.value = 'filled';
    clearTimer();
    timer = setTimeout(advance, PAUSE_BRIEF);
  }
}

const prompt = computed(() => {
  const c = cur.value;
  if (phase.value === 'end') return '填完了，dp[' + c.i + '] = ' + c.value + '，到第 ' + c.i + ' 级有 ' + c.value + ' 种跳法。';
  if (phase.value === 'filled') return '✅ dp[' + c.i + '] = ' + c.dp[c.i - 1] + ' + ' + c.dp[c.i - 2] + ' = ' + c.value;
  if (phase.value === 'value') return 'dp[' + c.i + '] = dp[' + (c.i - 1) + '] + dp[' + (c.i - 2) + '] = ' + c.dp[c.i - 1] + ' + ' + c.dp[c.i - 2] + ' = ？';
  return '轮到 dp[' + c.i + ']。它是从哪两格来的？点出这两格。';
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
      <DpRow :dp="view" :cur="cur.i" :picked="picked" :miss="phase === 'wrong' ? miss : null" :fresh="phase === 'filled' || phase === 'end' ? cur.i : null" :clickable="phase === 'from'" @pick="tapCell" />
    </template>
    <template #answers>
      <div v-if="phase === 'value'" class="answers">
        <button v-for="o in cur.options" :key="o" type="button" class="btn small mono" @click="chooseValue(o)">{{ o }}</button>
      </div>
    </template>
  </PredictFrame>
</template>

<style scoped>
.mono { font-family: var(--mono); }
</style>
