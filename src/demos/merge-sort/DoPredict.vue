<script setup lang="ts">
import { computed, ref } from 'vue';
import { buildTrace, genPredict, pickRound, rounds, type Round } from '../../engine/merge-sort';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { useStreak } from '../../components/shared/useStreak';
import MergeView from './MergeView.vue';

// 做：猜下一步。画面停在某一步：要么猜合并时下一个放进 tmp 的来自哪边，要么猜递归下一个处理哪个区间。
// 答完翻到下一步看结果（答对答错都讲一遍），按「下一题」直接换题，没有结束页。连对 6 次过关。
const GOAL = 6;
const values = ref<number[]>([]);
const steps = computed(() => buildTrace(values.value));
const pool = ref<Round[]>([]);
const q = ref<Round>();
const phase = ref<'ask' | 'right' | 'wrong'>('ask');
const { streak, passed, hit, miss } = useStreak(GOAL);
let lastAt = -1;

function newArray() {
  values.value = genPredict();
  pool.value = rounds(buildTrace(values.value));
}
function nextQuestion() {
  if (!pool.value.length) newArray();
  const k = pickRound(pool.value, lastAt);
  const cand = pool.value[k];
  pool.value.splice(k, 1);
  q.value = cand;
  lastAt = cand.at;
  phase.value = 'ask';
}
newArray();
nextQuestion();

const shown = computed(() => steps.value[phase.value === 'ask' ? q.value!.at : q.value!.revealAt]);

function choose(v: string) {
  if (phase.value !== 'ask') return;
  if (v === q.value!.answer) {
    hit();
    phase.value = 'right';
  } else {
    miss();
    phase.value = 'wrong';
  }
}

const prompt = computed(() => (phase.value === 'ask' ? q.value!.prompt : '第 ' + (q.value!.revealAt + 1) + ' 步：' + shown.value.note));
</script>

<template>
  <PredictFrame
    :streak="streak"
    :goal="GOAL"
    :passed="passed"
    :prompt="prompt"
    :wrong="phase === 'wrong' ? '不对。' + q!.why : null"
    :right="phase === 'right' ? '对！' + q!.why : null"
    :ended="false"
    continue-label="下一题"
    @continue="nextQuestion"
    @next="nextQuestion"
  >
    <template #board>
      <MergeView :step="shown" />
    </template>
    <template #answers>
      <div v-if="phase === 'ask'" class="answers">
        <button
          v-for="o in q!.options"
          :key="o.value"
          type="button"
          class="btn small mono"
          :aria-label="o.label"
          @click="choose(o.value)"
        >{{ o.label }}</button>
      </div>
    </template>
  </PredictFrame>
</template>

<style scoped>
.mono { font-family: var(--mono); }
.answers .btn { flex: 0 1 auto; }
</style>
