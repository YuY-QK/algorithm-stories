<script setup lang="ts">
import { computed, ref } from 'vue';
import { arrayCells, genPuzzle, PREDICT_GOAL, rounds, type Puzzle, type Round } from '../../engine/linear-search';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { useStreak } from '../../components/shared/useStreak';
import Boxes from './Boxes.vue';

// 做：猜下一步。每个位置先猜「相等吗」，第一次不相等后猜 i 变成几，走完猜返回什么。连对 5 次过关。
const puzzle = ref<Puzzle>(genPuzzle());
const list = ref<Round[]>([]);
const r = ref(0);
const phase = ref<'ask' | 'wrong' | 'end'>('ask');
const { streak, passed, hit, miss } = useStreak(PREDICT_GOAL);

function fresh() {
  puzzle.value = genPuzzle();
  list.value = rounds(puzzle.value);
  r.value = 0;
  phase.value = 'ask';
}
fresh();

const cur = computed(() => list.value[r.value]);

function choose(key: string) {
  if (phase.value !== 'ask') return;
  if (key === cur.value.correct) {
    hit();
    advance();
  } else {
    miss();
    phase.value = 'wrong';
  }
}
function advance() {
  if (cur.value.ended) phase.value = 'end';
  else {
    r.value++;
    phase.value = 'ask';
  }
}

const found = computed(() => phase.value === 'end' && cur.value.kind === 'cmp');
const cells = computed(() => {
  const c = cur.value;
  // 「下一个 i」那一题：这一格已经看过，还没轮到下一格
  const i = c.kind === 'next' ? c.i + 1 : c.i;
  return arrayCells(puzzle.value.arr, { i, hits: found.value ? [c.i] : [] });
});
const pointer = computed(() => (cur.value.kind === 'cmp' ? cur.value.i : -1));
const prompt = computed(() => (phase.value === 'end' ? '✅ ' + cur.value.result : cur.value.prompt));
</script>

<template>
  <PredictFrame
    :streak="streak"
    :goal="PREDICT_GOAL"
    :passed="passed"
    :prompt="prompt"
    :wrong="phase === 'wrong' ? cur.why : null"
    :ended="phase === 'end'"
    @continue="advance"
    @next="fresh"
  >
    <template #chips><span class="chip"><small>target</small>{{ puzzle.target }}</span></template>
    <template #board>
      <Boxes :cells="cells" :pointer="pointer" label="数组" />
    </template>
    <template #answers>
      <div v-if="phase === 'ask'" class="answers">
        <button v-for="o in cur.options" :key="o.key" type="button" class="btn small mono" @click="choose(o.key)">{{ o.text }}</button>
      </div>
    </template>
  </PredictFrame>
</template>

<style scoped>
.mono { font-family: var(--mono); }
</style>
