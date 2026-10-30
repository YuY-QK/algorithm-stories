<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { PICK_ROUNDS, pickGlow, type PickAction, type PickState } from '../../../../engine/quick-sort';
import Lineup from './Lineup.vue';

// 玩法二「挑个好标杆」的画面：回合数，一排同学（点一位当标杆），点了以后左右各站了几个人。按钮由规则的 controls 给。
const props = defineProps<{ state: PickState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: PickAction] }>();
const glow = computed(() => pickGlow(props.state));
</script>

<template>
  <p class="small-note">{{ t(m('pick.round', { n: Math.min(state.round, PICK_ROUNDS), total: PICK_ROUNDS })) }}</p>
  <Lineup
    :heights="state.values" :order="state.order" :kinds="state.kinds" :pickable="clickable" :glow="glow" :t="t"
    @pick="(id: number) => emit('act', { type: 'pick', id })"
  />

  <div v-if="state.split" class="split" aria-live="polite">
    <div v-if="state.split.left > 0" class="side lo" :style="{ flexGrow: state.split.left }"><span>{{ t(m('pick.left', { n: state.split.left })) }}</span></div>
    <div v-else class="empty">{{ t(m('pick.left', { n: 0 })) }}</div>
    <div v-if="state.split.right > 0" class="side hi" :style="{ flexGrow: state.split.right }"><span>{{ t(m('pick.right', { n: state.split.right })) }}</span></div>
    <div v-else class="empty">{{ t(m('pick.right', { n: 0 })) }}</div>
  </div>
</template>

<style scoped>
.split { display: flex; gap: 6px; max-width: 684px; font: 700 14px var(--mono); }
.side { flex-basis: 0; min-width: 0; padding: 8px 6px; border-radius: 8px; text-align: center; transition: flex-grow 0.4s; }
.side.lo { background: color-mix(in srgb, var(--accent) 40%, var(--bg)); border: 1.5px solid var(--accent); }
.side.hi { background: color-mix(in srgb, var(--mid) 55%, var(--bg)); border: 1.5px solid var(--mid); color: var(--fg); }
.empty { flex: 0 0 auto; white-space: nowrap; padding: 8px 10px; border-radius: 8px; border: 1.5px dashed var(--warn); color: var(--warn); text-align: center; }
@media (prefers-reduced-motion: reduce) {
  .side { transition: none; }
}
</style>
