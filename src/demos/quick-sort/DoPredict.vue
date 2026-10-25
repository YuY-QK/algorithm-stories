<script setup lang="ts">
import { computed, ref } from 'vue';
import { genArray, rounds, type Round } from '../../engine/quick-sort';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { useStreak } from '../../components/shared/useStreak';
import CallStack from './CallStack.vue';
import PartRow from './PartRow.vue';

// 做：猜下一步。动画停在 partition 里的某一刻，猜接下来会发生什么：
// j 指着的要不要换、换到哪、循环结束标杆落在哪、分区完递归哪两个区间。连对 6 次过关。
// 没有「结束」页：答对直接换下一题，答错看完解释也直接换下一题。
const GOAL = 6;
const list = ref<Round[]>([]);
const qi = ref(0);
const phase = ref<'ask' | 'target' | 'wrong'>('ask');
const miss = ref<number | null>(null);
const hit = ref<number | null>(null);
const why = ref('');
const { streak, passed, hit: good1, miss: miss1 } = useStreak(GOAL);

function fresh() {
  list.value = rounds(genArray(7, 12));
  qi.value = 0;
  begin();
}
function begin() {
  const q = list.value[qi.value];
  phase.value = q.kind === 'land' ? 'target' : 'ask';
  miss.value = null;
  hit.value = null;
}
fresh();

const q = computed(() => list.value[qi.value]);
const st = computed(() => q.value.step);

function next() {
  if (qi.value >= list.value.length - 1) fresh();
  else {
    qi.value++;
    begin();
  }
}
function good() {
  good1();
  next();
}
function bad(text: string, showHit: number | null = null) {
  miss1();
  why.value = text;
  hit.value = showHit;
  phase.value = 'wrong';
}

function answerWill(yes: boolean) {
  const r = q.value;
  if (r.kind !== 'swap') return;
  if (yes !== r.will) return bad(r.why);
  if (yes) phase.value = 'target';
  else good();
}
function tap(k: number) {
  if (phase.value !== 'target') return;
  const r = q.value;
  if (r.kind === 'ranges') return;
  if (k === r.target) return good();
  miss.value = k;
  bad(r.kind === 'swap' ? r.whyTarget : r.why, r.target);
}
function answerRange(ok: boolean) {
  const r = q.value;
  if (r.kind !== 'ranges') return;
  if (ok) return good();
  bad(r.why);
}

const prompt = computed(() => {
  const r = q.value;
  return r.kind === 'swap' && phase.value === 'target' ? r.targetPrompt : r.prompt;
});
</script>

<template>
  <PredictFrame
    :streak="streak"
    :goal="GOAL"
    :passed="passed"
    :prompt="prompt"
    :wrong="phase === 'wrong' ? why : null"
    :ended="false"
    continue-label="知道了，下一题"
    @continue="next"
  >
    <template #chips>
      <span class="chip"><small>lo, hi</small>{{ st.lo }}, {{ st.hi }}</span>
    </template>
    <template #board>
      <PartRow :step="st" :pickable="phase === 'target'" :miss="miss" :hit="hit" @pick="tap" />
      <CallStack :stack="st.stack" />
    </template>
    <template #answers>
      <div v-if="phase === 'ask' && q.kind === 'swap'" class="answers">
        <button type="button" class="btn small" @click="answerWill(true)">✅ 比标杆小：i++ 再交换</button>
        <button type="button" class="btn small" @click="answerWill(false)">⏭ 不比标杆小：什么也不做</button>
      </div>
      <div v-if="phase === 'ask' && q.kind === 'ranges'" class="answers">
        <button v-for="o in q.options" :key="o.text" type="button" class="btn small mono" @click="answerRange(o.ok)">{{ o.text }}</button>
      </div>
    </template>
  </PredictFrame>
</template>

<style scoped>
.mono { font-family: var(--mono); }
.answers .btn { flex: 0 1 auto; text-align: left; }
</style>
