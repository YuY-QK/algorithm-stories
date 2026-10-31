<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { PredictView } from '../../../../engine/bubble-sort';

// 做：猜下一步的一排数。正在比较的一对是黄色，站好的是绿色，虚线框是这一轮结束后要站的位置。
// 能点的格子点了就 emit('act', 下标)，对错由规则判断。
defineProps<{ view: PredictView; picked: number | null; pickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [index: number] }>();
</script>

<template>
  <div class="arr">
    <button
      v-for="(v, k) in view.a"
      :key="k"
      type="button"
      class="cell"
      :class="{
        cmp: view.j !== null && (k === view.j || k === view.j + 1),
        done: k >= view.sortedFrom,
        goal: view.goal && k === view.end,
        miss: k === picked,
        over: view.over.includes(k),
      }"
      :disabled="!pickable || k > view.end"
      :aria-label="t(m('scene.cell', { k, v }))"
      @click="emit('act', k)"
    >
      <span class="val">{{ v }}</span>
      <span class="idx">{{ k }}</span>
    </button>
  </div>
</template>

<style scoped>
.arr { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; max-width: 420px; }
.cell { font: inherit; background: none; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; color: var(--fg); cursor: pointer; }
.cell:disabled { cursor: default; }
.cell:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 6px; }
.val {
  width: 100%; height: 44px; display: grid; place-items: center;
  font: 600 15px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.cell:not(:disabled):hover .val { border-color: var(--accent); }
.cell.goal .val { border-style: dashed; border-color: var(--accent); border-width: 2px; }
.cell.cmp .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.cell.done .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.cell.miss .val, .cell.over .val { border-color: var(--warn); border-width: 2.5px; color: var(--warn); }
</style>
