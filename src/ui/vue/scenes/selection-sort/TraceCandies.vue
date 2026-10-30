<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { SelectionStep, TraceInput } from '../../../../engine/selection-sort';

// 做：逐步执行的数组。i、j、minIdx 的标记，站好的格子是绿色，当前最小的是黄色。
const props = defineProps<{ input: TraceInput; step: SelectionStep; t: (msg: Msg) => string }>();

function tagFor(k: number) {
  const t: string[] = [];
  if (k === props.step.i) t.push('i');
  if (k === props.step.j) t.push('j');
  if (k === props.step.minIdx) t.push('min');
  return t.join('·');
}
</script>

<template>
  <div class="arr" aria-hidden="true">
    <div
      v-for="(v, k) in step.a"
      :key="k"
      class="cell"
      :class="{ fixed: k < step.sorted, cur: k === step.j && step.cmp, least: k === step.minIdx, swapped: !!step.swap && step.swap.includes(k) }"
    >
      <div class="tag">{{ tagFor(k) }}</div>
      <div class="val">{{ v }}</div>
      <div class="idx">{{ k }}</div>
    </div>
  </div>
</template>

<style scoped>
.arr { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 10px 6px; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
.val {
  width: 100%; height: 40px; display: grid; place-items: center;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.cell.fixed .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.cell.cur .val { border-color: var(--fg); border-width: 2.5px; }
.cell.least .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.cell.swapped .val { box-shadow: 0 0 0 3px var(--mid); }
</style>
