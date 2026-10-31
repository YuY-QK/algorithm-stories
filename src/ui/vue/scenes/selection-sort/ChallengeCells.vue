<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { isSorted, type ChallengeAction, type ChallengeState } from '../../../../engine/selection-sort';

// 做：挑战的画面。点两格就交换它们。选中的那格抬起来，刚换过的两格描边，排好后全部变绿。
const props = defineProps<{ state: ChallengeState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: ChallengeAction] }>();
const done = computed(() => isSorted(props.state.a));
</script>

<template>
  <div class="arr">
    <button
      v-for="(v, k) in state.a"
      :key="k"
      type="button"
      class="cell"
      :class="{ picked: state.sel === k, moved: !!state.last && state.last.includes(k), settled: done }"
      :disabled="done"
      :aria-label="t(state.sel === k ? m('chal.cellSel', { k, v }) : m('chal.cell', { k, v }))"
      :aria-pressed="state.sel === k"
      @click="emit('act', { type: 'tap', k })"
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
.cell:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 8px; }
.val {
  width: 100%; height: 48px; display: grid; place-items: center;
  font: 600 18px var(--mono); border: 1.5px solid var(--line); border-radius: 8px; background: var(--bg);
  transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s;
}
.cell:not(:disabled):hover .val { border-color: var(--accent); }
.cell.picked .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); transform: translateY(-4px); }
.cell.moved .val { border-color: var(--mid); }
.cell.settled .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
</style>
