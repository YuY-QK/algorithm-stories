<script setup lang="ts">
import { computed } from 'vue';
import VarChips from '../../shared/VarChips.vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { inversions, isSorted, type ChallengeAction, type ChallengeState } from '../../../../engine/bubble-sort';

// 做：挑战的画面。一排数，相邻两个数之间有个 ⇄ 按钮；下面是换了几次、还剩几个「前大后小」，和最近一次的提醒。
const props = defineProps<{ state: ChallengeState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: ChallengeAction] }>();
const done = computed(() => isSorted(props.state.a));
const chips = computed<[string, string][]>(() => [
  [props.t(m('chal.chip.moves')), props.t(m('chal.times', { n: props.state.moves }))],
  [props.t(m('chal.chip.left')), props.t(m('chal.pairs', { n: inversions(props.state.a) }))],
]);
</script>

<template>
  <div class="track-row">
    <template v-for="(v, k) in state.a" :key="k">
      <span class="box" :class="{ ok: done }">{{ v }}</span>
      <button
        v-if="k < state.a.length - 1" type="button" class="sw" :disabled="done"
        :aria-label="t(m('chal.swapAria', { x: v, y: state.a[k + 1] }))" @click="emit('act', { type: 'swap', k })"
      >⇄</button>
    </template>
  </div>
  <VarChips :vars="chips" />
  <p v-if="state.note" class="small-note">{{ t(state.note) }}</p>
</template>

<style scoped>
.track-row { display: flex; align-items: center; gap: 2px; max-width: 100%; }
.box {
  flex: 1 1 0; min-width: 0; max-width: 56px; height: 48px; display: grid; place-items: center;
  font: 700 18px var(--mono); border: 1.5px solid var(--line); border-radius: 8px; background: var(--bg);
}
.box.ok { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.sw {
  flex: 0 0 auto; width: 26px; height: 34px; padding: 0; font: 600 15px var(--mono); cursor: pointer;
  border-radius: 6px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.sw:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.sw:disabled { opacity: 0.35; cursor: default; }
.sw:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
</style>
