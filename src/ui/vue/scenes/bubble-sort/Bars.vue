<script setup lang="ts">
import { computed } from 'vue';
import type { Item } from '../../../../engine/bubble-sort';

// 做：数组画成一排柱子。正在比较的一对是黄色，正在交换的是红框，站好的是绿色。逐步执行和找 bug 共用。
const props = withDefaults(defineProps<{
  items: Item[];
  j?: number | null;
  hl?: 'cmp' | 'swap' | null;
  sortedFrom?: number;
  /** 越界读的那一格（画一个虚线空格） */
  ghost?: boolean;
}>(), { j: null, hl: null, sortedFrom: Infinity, ghost: false });

const max = computed(() => Math.max(1, ...props.items.map((x) => x.v)));
const inPair = (k: number) => props.j !== null && (k === props.j || k === props.j + 1);
</script>

<template>
  <div class="bars-row" :style="{ '--n': items.length + (ghost ? 1 : 0) }" aria-hidden="true">
    <div
      v-for="(x, k) in items"
      :key="k"
      class="col"
      :class="{ cmp: inPair(k) && hl === 'cmp', swp: inPair(k) && hl === 'swap', done: k >= sortedFrom }"
    >
      <div class="pole"><div class="bar" :style="{ height: Math.max(8, (x.v / max) * 100) + '%' }" /></div>
      <div class="val">{{ x.v }}<sup v-if="x.tag">{{ x.tag }}</sup></div>
      <div class="idx">{{ k }}</div>
    </div>
    <div v-if="ghost" class="col oob">
      <div class="pole"><div class="bar" style="height: 100%" /></div>
      <div class="val">?</div>
      <div class="idx">{{ items.length }}</div>
    </div>
  </div>
</template>

<style scoped>
.bars-row { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 6px; max-width: 560px; }
.col { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
.pole { width: 100%; height: 110px; display: flex; align-items: flex-end; }
.bar {
  width: 100%; border-radius: 6px 6px 2px 2px; background: var(--bg); border: 1.5px solid var(--line);
  transition: height 0.25s, background 0.2s, border-color 0.2s;
}
.val { font: 600 14px var(--mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
.val sup { font-size: 0.85em; color: var(--muted); }
.col.cmp .bar { background: var(--mid); border-color: var(--mid); }
.col.swp .bar { background: var(--mid); border-color: var(--warn); border-width: 2.5px; }
.col.done .bar { background: var(--accent); border-color: var(--accent); }
.col.oob .bar { background: none; border: 2px dashed var(--warn); }
.col.oob .val { color: var(--warn); }
</style>
