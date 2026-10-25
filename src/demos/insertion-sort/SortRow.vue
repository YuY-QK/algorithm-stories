<script setup lang="ts">
import { suitOf, type SortStep } from '../../engine/insertion-sort';

// 「做」里的数组：一排格子，key 悬在空位上方，标出 i、j、正在比较的格子和排好的部分。
// 逐步执行和找 bug 共用。suits 为真时每个元素带上花色，用来看稳定性。
defineProps<{ step: SortStep; suits?: boolean }>();

function tags(s: SortStep, k: number) {
  const t: string[] = [];
  if (k === s.i) t.push('i');
  if (k === s.j) t.push('j');
  return t.join('·');
}
</script>

<template>
  <div class="srow" :style="{ '--n': step.arr.length }" aria-hidden="true">
    <div v-for="(v, k) in step.arr" :key="k" class="col">
      <div class="keybox" :class="{ on: step.key !== null && k === step.hole }">
        <template v-if="step.key !== null && k === step.hole">{{ step.key }}<small v-if="suits">{{ suitOf(step.keyId!) }}</small></template>
      </div>
      <div class="tag">{{ tags(step, k) }}</div>
      <div
        class="val"
        :class="{
          sorted: k < step.sorted && k !== step.hole,
          hole: k === step.hole && step.key !== null,
          vs: k === step.cmp,
        }"
      >{{ v }}<small v-if="suits">{{ suitOf(step.ids[k]) }}</small></div>
      <div class="idx">{{ k }}</div>
    </div>
  </div>
</template>

<style scoped>
.srow { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 6px; max-width: calc(var(--n) * 56px); }
.col { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
.keybox {
  width: 100%; height: 34px; display: grid; place-items: center; box-sizing: border-box;
  font: 700 14px var(--mono); border-radius: 6px; color: transparent;
}
.keybox.on {
  color: var(--accent-ink); background: var(--accent); transform: rotate(-4deg);
  box-shadow: 0 3px 8px color-mix(in srgb, var(--fg) 22%, transparent);
}
.val {
  width: 100%; height: 40px; display: grid; place-items: center; box-sizing: border-box;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
small { font-size: 10px; line-height: 1; }
.keybox small, .val small { display: block; margin-top: -2px; }
.keybox.on { grid-template-rows: auto auto; align-content: center; }
.val.sorted { border-color: var(--accent); }
.val.hole { border-style: dashed; border-color: var(--muted); color: var(--out-ink); background: transparent; }
.val.vs { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
@media (prefers-reduced-motion: reduce) {
  .keybox.on { transform: none; }
}
</style>
