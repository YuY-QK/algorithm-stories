<script setup lang="ts">
import { computed, ref } from 'vue';
import { genPredict, opText, rounds, type Round } from '../../engine/lru-cache';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { useStreak } from '../../components/shared/useStreak';
import ListView from './ListView.vue';

// 做：猜下一步。给出链表现在的样子和下一个操作，猜命中不命中、谁被淘汰、顺序怎么变。连对 5 次过关。
// 没有「结束」页：每题答完（对或错）都讲解，点「下一题」换题，题用完了重新出一局。
const GOAL = 5;

const cap = ref(2);
const list = ref<Round[]>([]);
const r = ref(0);
const phase = ref<'ask' | 'right' | 'wrong'>('ask');
const chosen = ref(-1);
const { streak, passed, hit, miss } = useStreak(GOAL);

function fresh() {
  const g = genPredict();
  cap.value = g.cap;
  list.value = rounds(g.cap, g.ops);
  r.value = 0;
  phase.value = 'ask';
  chosen.value = -1;
}
fresh();

const q = computed(() => list.value[r.value]);

function answer(k: number) {
  if (phase.value !== 'ask') return;
  chosen.value = k;
  if (k === q.value.correct) {
    phase.value = 'right';
    hit();
  } else {
    phase.value = 'wrong';
    miss();
  }
}

function next() {
  if (r.value >= list.value.length - 1) return fresh();
  r.value++;
  phase.value = 'ask';
  chosen.value = -1;
}
</script>

<template>
  <PredictFrame
    :streak="streak"
    :goal="GOAL"
    :passed="passed"
    :prompt="q.prompt"
    :wrong="phase === 'wrong' ? q.why : null"
    :right="phase === 'right' ? q.why : null"
    :ended="false"
    continue-label="下一题"
    @continue="next"
    @next="next"
  >
    <template #chips>
      <span class="chip"><small>capacity</small>{{ cap }}</span>
    </template>
    <template #board>
      <ListView :list="q.before" :cap="cap" hide-values :focus="phase === 'ask' ? null : q.op.k" />
      <p class="call">下一个操作：<code>{{ opText(q.op) }}</code></p>
    </template>
    <template #answers>
      <div class="answers">
        <button
          v-for="(o, k) in q.options" :key="k" type="button" class="btn small mono"
          :class="{ right: phase !== 'ask' && k === q.correct, miss: phase === 'wrong' && k === chosen }"
          :disabled="phase !== 'ask'" @click="answer(k)"
        >{{ o }}</button>
      </div>
    </template>
  </PredictFrame>
</template>

<style scoped>
.call { font-size: 1.05rem; }
.call code { font: 600 1em var(--mono); background: var(--out); padding: 2px 8px; border-radius: 4px; }
.mono { font-family: var(--mono); }
.btn.right:disabled { border-color: var(--accent); opacity: 1; }
.btn.miss:disabled { border-color: var(--warn); color: var(--warn); opacity: 1; }
</style>
