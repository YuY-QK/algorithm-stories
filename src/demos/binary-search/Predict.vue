<script setup lang="ts">
import { computed } from 'vue';
import type { Move, PredictAction, PredictBoard } from '../../levels/binary-search/flows';
import { t } from '../../i18n/runtime';

// 猜下一步的画面：可以点的数组格子（part=board）和三个「接下来」按钮（part=answers）。规则在 flows.ts 的 predictFlow
const props = defineProps<{ s: PredictBoard; send: (a: PredictAction) => void; part: 'board' | 'answers' }>();
const MOVES: { move: Move; key: string }[] = [
  { move: 'found', key: 'do.predict.moveFound' },
  { move: 'right', key: 'do.predict.moveRight' },
  { move: 'left', key: 'do.predict.moveLeft' },
];
const mid = computed(() => props.s.list[props.s.r].mid);
</script>

<template>
  <div v-if="part === 'board'" class="arr">
    <button
      v-for="(v, k) in s.arr"
      :key="k"
      type="button"
      class="cell"
      :class="{
        out: k < s.view.lo || k > s.view.hi,
        mid: k === s.view.mid,
        found: k === s.view.found,
        miss: s.phase === 'wrong' && k === s.picked && k !== mid,
      }"
      :disabled="s.phase !== 'mid'"
      :aria-label="t('do.predict.cell', { k, v })"
      @click="send({ type: 'cell', k })"
    >
      <span class="tag">{{ k === s.view.lo ? 'lo' : '' }}{{ k === s.view.lo && k === s.view.hi ? '·' : '' }}{{ k === s.view.hi ? 'hi' : '' }}</span>
      <span class="val">{{ v }}</span>
      <span class="idx">{{ k }}</span>
    </button>
  </div>
  <div v-else-if="s.phase === 'move'" class="answers">
    <button v-for="m in MOVES" :key="m.move" type="button" class="btn small mono" @click="send({ type: 'move', move: m.move })">{{ t(m.key) }}</button>
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
.mono { font-family: var(--mono); }
</style>
