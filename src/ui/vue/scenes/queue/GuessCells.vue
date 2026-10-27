<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { CHALLENGE_CAP, challengeView, type ChallengeAction, type ChallengeState } from '../../../../engine/queue';
import Ops from './Ops.vue';

// 做：挑战的画面。不看动画，在脑子里跑完一串操作，预测数组每一格最后是什么。
// 每一格一个下拉框，选了什么用 act 交给规则；关键：出队不会擦掉格子里的值。
const props = defineProps<{ state: ChallengeState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: ChallengeAction] }>();
const v = computed(() => challengeView(props.state));
</script>

<template>
  <Ops :ops="state.ops" :t="t" />
  <p>{{ t(m('chal.question')) }}</p>
  <div class="guess" :style="{ '--n': CHALLENGE_CAP }">
    <label v-for="k in CHALLENGE_CAP" :key="k" class="slot">
      <span class="sr">{{ t(m('chal.cellLabel', { k: k - 1 })) }}</span>
      <select
        :value="state.guess[k - 1]" :disabled="state.shown" :class="{ good: state.shown && v.okCell(k - 1), bad: state.shown && !v.okCell(k - 1) }"
        @change="emit('act', { type: 'cell', k: k - 1, v: ($event.target as HTMLSelectElement).value })"
      >
        <option value="">{{ t(m('chal.blank')) }}</option>
        <option v-for="x in v.values" :key="x" :value="String(x)">{{ x }}</option>
      </select>
      <span class="idx" aria-hidden="true">{{ k - 1 }}</span>
    </label>
  </div>
</template>

<style scoped>
.guess { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 6px; max-width: calc(var(--n) * 64px); }
.slot { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.slot select { width: 100%; min-width: 0; padding: 6px 2px; font: 600 14px var(--mono); text-align: center; }
.slot select.good { border-color: var(--accent); }
.slot select.bad { border-color: var(--warn); color: var(--warn); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
