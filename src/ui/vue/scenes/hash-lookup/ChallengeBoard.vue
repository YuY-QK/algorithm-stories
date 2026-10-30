<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { CHALLENGE_CAPS, CHALLENGE_LIMIT, challengeStats, type ChallengeAction, type ChallengeState } from '../../../../engine/hash-lookup';

// 挑战：8 本书的书号，一排书架数按钮，选了以后每个书架上有几本的柱子（太高的标成警告色）。
const props = defineProps<{ state: ChallengeState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: ChallengeAction] }>();

const stats = computed(() => challengeStats(props.state));
const maxCount = computed(() => Math.max(1, ...(stats.value?.counts ?? [1])));
</script>

<template>
  <p>
    {{ t(m('chal.leadA')) }}<b class="mono">{{ state.keys.join('、') }}</b>{{ t(m('chal.leadB')) }}<b>{{ t(m('chal.leadC', { limit: CHALLENGE_LIMIT })) }}</b>{{ t(m('chal.leadD')) }}
  </p>
  <div class="caps" role="group" :aria-label="t(m('chal.caps'))">
    <button
      v-for="c in CHALLENGE_CAPS" :key="c" type="button" class="btn small cap" :class="{ on: state.cap === c }" :disabled="!clickable"
      @click="emit('act', { type: 'cap', c })"
    >{{ c }}</button>
  </div>
  <div v-if="stats" class="bars" aria-hidden="true">
    <div v-for="(n, b) in stats.counts" :key="b" class="col">
      <div class="well"><div class="fill" :class="{ tall: n > CHALLENGE_LIMIT }" :style="{ height: (n / maxCount) * 100 + '%' }" /></div>
      <span class="num">{{ n }}</span>
      <span class="idx">{{ b }}</span>
    </div>
  </div>
</template>

<style scoped>
.mono { font-family: var(--mono); overflow-wrap: anywhere; }
.caps { display: flex; flex-wrap: wrap; gap: 8px; }
.cap { min-width: 44px; }
.cap.on { border-color: var(--accent); color: var(--accent); }
.bars { display: flex; gap: 4px; align-items: flex-end; }
.col { flex: 1 1 0; min-width: 0; max-width: 40px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.well { width: 100%; height: 80px; display: flex; align-items: flex-end; background: var(--inset); border-radius: 4px; }
.fill { width: 100%; background: var(--accent); border-radius: 4px; transition: height 0.25s; }
.fill.tall { background: var(--warn); }
.num { font: 600 12px var(--mono); }
</style>
