<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { Bug, BugStep } from '../../../../engine/selection-sort';

// 做：找 bug 的数组。i、j、minIdx 的标记跟着当前步骤走。
defineProps<{ step: BugStep; bug: Bug; t: (msg: Msg) => string }>();
</script>

<template>
  <div class="arr" aria-hidden="true">
    <div v-for="(v, k) in step.a" :key="k" class="cell" :class="{ least: k === step.minIdx, cur: k === step.j }">
      <div class="tag">{{ [k === step.i && 'i', k === step.j && 'j', k === step.minIdx && 'min'].filter(Boolean).join('·') }}</div>
      <div class="val">{{ v }}</div>
      <div class="idx">{{ k }}</div>
    </div>
  </div>
</template>

<style scoped>
.arr { display: flex; gap: 6px; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 48px; min-width: 0; }
.val {
  width: 100%; height: 40px; display: grid; place-items: center;
  font: 600 14px var(--mono); border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s;
}
.cell.cur .val { border-color: var(--fg); border-width: 2.5px; }
.cell.least .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
</style>
