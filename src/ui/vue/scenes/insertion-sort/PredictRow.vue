<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { PredictView } from '../../../../engine/insertion-sort';

// 做：猜下一步的一排数。「key 落在哪一格」时 key 拿在手上悬在空位上方，点格子回答；
// 回答后 key 放进去（刚放好的一格实心），点错的格子红框。对错由规则判断。
defineProps<{ view: PredictView; picked: number | null; pickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [index: number] }>();
</script>

<template>
  <div class="prow" :style="{ '--n': view.arr.length }">
    <button
      v-for="(v, k) in view.arr"
      :key="k"
      type="button"
      class="cell"
      :class="{
        sorted: k < view.sorted && k !== view.hole,
        hole: k === view.hole,
        placed: k === view.placed,
        miss: k === picked,
      }"
      :disabled="!pickable || k > view.maxPick"
      :aria-label="t(k === view.hole ? m('scene.cellHole', { k }) : m('scene.cell', { k, v }))"
      @click="emit('act', k)"
    >
      <span class="keyslot">{{ k === view.hole ? view.key : '' }}</span>
      <span class="val">{{ v }}</span>
      <span class="idx">{{ k }}</span>
    </button>
  </div>
</template>

<style scoped>
.prow { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 6px; max-width: calc(var(--n) * 56px); }
.cell { font: inherit; background: none; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; color: var(--fg); cursor: pointer; }
.cell:disabled { cursor: default; }
.cell:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 6px; }
.keyslot {
  width: 100%; height: 30px; display: grid; place-items: center; border-radius: 6px;
  font: 700 14px var(--mono);
}
.cell.hole .keyslot { background: var(--accent); color: var(--accent-ink); transform: rotate(-4deg); }
.val {
  width: 100%; height: 40px; display: grid; place-items: center; box-sizing: border-box;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.cell:not(:disabled):hover .val { border-color: var(--accent); }
.cell.sorted .val { border-color: var(--accent); }
.cell.hole .val { border-style: dashed; border-color: var(--muted); color: transparent; background: transparent; }
.cell.placed .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.cell.miss .val { border-color: var(--warn); border-style: solid; box-shadow: 0 0 0 2px var(--warn); }
@media (prefers-reduced-motion: reduce) {
  .cell.hole .keyslot { transform: none; }
}
</style>
