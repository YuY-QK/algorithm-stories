<script setup lang="ts">
import { computed, ref } from 'vue';
import { genOps, opText, quizzes, type Quiz } from '../../engine/lru-cache';
import ListView from './ListView.vue';

// 做：猜下一步。给出链表现在的样子和下一个操作，猜命中不命中、谁被淘汰、顺序怎么变。连对 5 次过关。
const GOAL = 5;

const cap = ref(2);
const list = ref<Quiz[]>([]);
const r = ref(0);
const phase = ref<'ask' | 'right' | 'wrong'>('ask');
const chosen = ref(-1);
const streak = ref(0);
const passed = ref(false);

function fresh() {
  cap.value = 2 + Math.floor(Math.random() * 2);
  list.value = quizzes(cap.value, genOps(14, cap.value + 2));
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
    streak.value++;
    if (streak.value >= GOAL) passed.value = true;
  } else {
    phase.value = 'wrong';
    streak.value = 0;
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
  <div class="stage">
    <div class="vars">
      <span class="chip"><small>capacity</small>{{ cap }}</span>
      <span class="chip"><small>连对</small>{{ Math.min(streak, GOAL) }} / {{ GOAL }}</span>
      <span v-if="passed" class="chip win">🏅 过关</span>
    </div>
    <ListView :list="q.before" :cap="cap" hide-values :focus="phase === 'ask' ? null : q.op.k" />
    <p class="call">下一个操作：<code>{{ opText(q.op) }}</code></p>
    <p class="note" aria-live="polite">{{ q.prompt }}</p>
    <div class="answers">
      <button
        v-for="(o, k) in q.options" :key="k" type="button" class="btn small mono"
        :class="{ right: phase !== 'ask' && k === q.correct, miss: phase === 'wrong' && k === chosen }"
        :disabled="phase !== 'ask'" @click="answer(k)"
      >{{ o }}</button>
    </div>
    <div v-if="phase !== 'ask'" class="explain" :class="phase" aria-live="polite">
      <p>{{ phase === 'right' ? '✅ ' : '❌ ' }}{{ q.explain }}</p>
      <button type="button" class="btn small primary" @click="next">下一题</button>
    </div>
  </div>
</template>

<style scoped>
.call { font-size: 1.05rem; }
.call code { font: 600 1em var(--mono); background: var(--out); padding: 2px 8px; border-radius: 4px; }
.mono { font-family: var(--mono); }
.win { border-color: var(--accent); color: var(--accent); }
.btn.right:disabled { border-color: var(--accent); opacity: 1; }
.btn.miss:disabled { border-color: var(--warn); color: var(--warn); opacity: 1; }
.explain { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; border-left: 3px solid var(--accent); padding-left: 12px; }
.explain.wrong { border-left-color: var(--warn); }
</style>
