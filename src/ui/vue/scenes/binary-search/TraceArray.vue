<script setup lang="ts">
import type { BinaryStep, TraceInput } from '../../../../engine/binary-search';
import type { Msg } from '../../../../core/types';

// 做：逐步执行的数组。lo、mid、hi 的标记和已排除的格子跟着当前步骤走。
defineProps<{ input: TraceInput; step: BinaryStep; t: (msg: Msg) => string }>();

function tagFor(s: BinaryStep, k: number) {
  const t: string[] = [];
  if (k === s.lo) t.push('lo');
  if (k === s.mid) t.push('mid');
  if (k === s.hi) t.push('hi');
  return t.join('·');
}
</script>

<template>
  <div class="arr" aria-hidden="true">
    <div
      v-for="(v, k) in input.arr"
      :key="k"
      class="cell"
      :class="{ out: k < step.lo || k > step.hi, mid: k === step.mid, found: k === step.found }"
    >
      <div class="tag">{{ tagFor(step, k) }}</div>
      <div class="val">{{ v }}</div>
      <div class="idx">{{ k }}</div>
    </div>
  </div>
</template>

<style scoped>
.arr { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 10px 6px; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
.val {
  width: 100%; height: 40px; display: grid; place-items: center;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.cell.out .val { background: var(--out); color: var(--out-ink); border-color: transparent; }
.cell.mid .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.cell.found .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
</style>
