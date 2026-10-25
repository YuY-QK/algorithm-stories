<script setup lang="ts">
import { computed, ref } from 'vue';
import { buildQuestions, buildTrace, genArray, type Question } from '../../engine/merge-sort';
import MergeView from './MergeView.vue';

// 做：猜下一步。画面停在某一步：要么猜合并时下一个放进 tmp 的来自哪边，要么猜递归下一个处理哪个区间。
// 答完翻到下一步看结果。连对 6 次过关。
const GOAL = 6;
const values = ref<number[]>([]);
const steps = computed(() => buildTrace(values.value));
const pool = ref<Question[]>([]);
const q = ref<Question>();
const phase = ref<'ask' | 'right' | 'wrong'>('ask');
const streak = ref(0);
const passed = ref(false);
const picked = ref<string | null>(null);
let lastAt = -1;

function newArray() {
  values.value = genArray(6, 9);
  pool.value = buildQuestions(buildTrace(values.value));
}
function nextQuestion() {
  if (!pool.value.length) newArray();
  const k = Math.floor(Math.random() * pool.value.length);
  const cand = pool.value[k];
  if (cand.at === lastAt && pool.value.length > 1) return nextQuestion();
  pool.value.splice(k, 1);
  q.value = cand;
  lastAt = cand.at;
  phase.value = 'ask';
  picked.value = null;
}
newArray();
nextQuestion();

const shown = computed(() => steps.value[phase.value === 'ask' ? q.value!.at : q.value!.revealAt]);

function choose(v: string) {
  if (phase.value !== 'ask') return;
  picked.value = v;
  if (v === q.value!.answer) {
    streak.value++;
    if (streak.value >= GOAL) passed.value = true;
    phase.value = 'right';
  } else {
    streak.value = 0;
    phase.value = 'wrong';
  }
}
</script>

<template>
  <div v-if="q" class="stage">
    <div class="vars">
      <span class="chip"><small>连对</small>{{ Math.min(streak, GOAL) }} / {{ GOAL }}</span>
      <span v-if="passed" class="chip win">🏅 过关</span>
    </div>
    <MergeView :step="shown" />
    <p class="note" aria-live="polite">
      <template v-if="phase === 'ask'">{{ q.prompt }}</template>
      <template v-else>第 {{ q.revealAt + 1 }} 步：{{ shown.note }}</template>
    </p>
    <div v-if="phase === 'ask'" class="answers">
      <button
        v-for="o in q.options"
        :key="o.value"
        type="button"
        class="btn small mono"
        :aria-label="o.label"
        @click="choose(o.value)"
      >{{ o.label }}</button>
    </div>
    <div v-else class="fb" :class="phase">
      <p>{{ phase === 'right' ? '✅ 对！' : '❌ 不对。' }}{{ q.why }}</p>
      <button type="button" class="btn small primary" @click="nextQuestion">下一题</button>
    </div>
  </div>
</template>

<style scoped>
.mono { font-family: var(--mono); }
.answers .btn { flex: 0 1 auto; }
.win { border-color: var(--accent); color: var(--accent); }
.fb { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; border-left: 3px solid var(--accent); padding-left: 12px; overflow-wrap: anywhere; }
.fb.wrong { border-left-color: var(--warn); }
</style>
