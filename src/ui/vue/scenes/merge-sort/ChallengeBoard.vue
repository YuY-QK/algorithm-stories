<script setup lang="ts">
import { computed } from 'vue';
import Segmented from '../../../../components/shared/Segmented.vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { CHALLENGE_N, challengeNote, challengePeekable, challengeTarget, type ChallengeAction, type ChallengeState } from '../../../../engine/merge-sort';

// 做：挑战的画面。目标切换、提示、排队的格子和可选的数、撤销和重排。
// 孩子的每一下都交给规则（act），排满以后的结果由规则的 result 给，画在下面。
const props = defineProps<{ state: ChallengeState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: ChallengeAction] }>();

const N = CHALLENGE_N;
const s = computed(() => props.state);
const full = computed(() => s.value.line.length === N);
const modes = computed(() => [
  { value: 'max', label: props.t(m('chal.mode.max')) },
  { value: 'min', label: props.t(m('chal.mode.min')) },
]);
</script>

<template>
  <div class="controls">
    <Segmented
      :model-value="s.mode"
      :legend="t(m('chal.goalLabel'))"
      :options="modes"
      @update:model-value="(v: string) => emit('act', { type: 'mode', mode: v as 'max' | 'min' })"
    />
    <span class="chip"><small>{{ s.mode === 'max' ? t(m('chal.chip.max')) : t(m('chal.chip.min')) }}</small>{{ t(m('chal.chipTimes', { n: challengeTarget(s) })) }}</span>
  </div>
  <p class="note" aria-live="polite">{{ t(challengeNote(s)) }}</p>

  <div class="slots" :style="{ '--n': N }" role="group" :aria-label="t(m('chal.line'))">
    <span v-for="(_, k) in N" :key="k" class="slot" :class="{ on: k < s.line.length }">{{ s.line[k] ?? '' }}</span>
  </div>
  <div class="pool" :style="{ '--n': N }" role="group" :aria-label="t(m('chal.pool'))">
    <button
      v-for="v in N"
      :key="v"
      type="button"
      class="btn pick"
      :disabled="full || s.line.includes(v)"
      :aria-label="t(m('chal.put', { v }))"
      @click="emit('act', { type: 'add', v })"
    >{{ v }}</button>
  </div>
  <div class="row">
    <button type="button" class="btn small" :disabled="!s.line.length" @click="emit('act', { type: 'undo' })">{{ t(m('chal.undo')) }}</button>
    <button type="button" class="btn small" :disabled="!s.line.length" @click="emit('act', { type: 'clear' })">{{ t(m('chal.clear')) }}</button>
    <button v-if="challengePeekable(s)" type="button" class="btn small" @click="emit('act', { type: 'peek' })">{{ t(m('chal.peek')) }}</button>
  </div>
</template>

<style scoped>
.slots, .pool { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 6px; max-width: calc(var(--n) * 56px); }
.slot {
  height: 42px; display: grid; place-items: center; box-sizing: border-box;
  border: 1.5px dashed var(--line); border-radius: 8px; font: 700 15px var(--mono);
}
.slot.on { border-style: solid; border-color: var(--accent); background: var(--bg); }
.btn.pick { padding: 8px 0; font: 700 15px var(--mono); text-align: center; min-width: 0; }
</style>
