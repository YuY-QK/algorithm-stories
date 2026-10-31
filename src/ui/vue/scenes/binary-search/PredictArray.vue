<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { PredictView } from '../../../../engine/binary-search';

// 做：猜下一步的数组。可以点的格子点了就 emit('act', 下标)，对错由规则判断。
defineProps<{ view: PredictView; picked: number | null; pickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [index: number] }>();
</script>

<template>
  <div class="arr">
    <button
      v-for="(v, k) in view.arr"
      :key="k"
      type="button"
      class="cell"
      :class="{
        out: k < view.lo || k > view.hi,
        mid: k === view.mid,
        found: k === view.found,
        miss: k === picked,
      }"
      :disabled="!pickable"
      :aria-label="t(m('scene.cell', { k, v }))"
      @click="emit('act', k)"
    >
      <span class="tag">{{ k === view.lo ? 'lo' : '' }}{{ k === view.lo && k === view.hi ? '·' : '' }}{{ k === view.hi ? 'hi' : '' }}</span>
      <span class="val">{{ v }}</span>
      <span class="idx">{{ k }}</span>
    </button>
  </div>
</template>

<style scoped>
.arr { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 10px 5px; }
.cell { font: inherit; background: none; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; color: var(--fg); cursor: pointer; }
.cell:disabled { cursor: default; }
.cell:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 6px; }
.val {
  width: 100%; height: 40px; display: grid; place-items: center;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.cell:not(:disabled):hover .val { border-color: var(--accent); }
.cell.out .val { background: var(--out); color: var(--out-ink); border-color: transparent; }
.cell.mid .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.cell.found .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.cell.miss .val { border-color: var(--warn); color: var(--warn); }
</style>
