<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { CHALLENGE, challengeReveal, desc, type ChallengeGame } from '../../../../engine/greedy';

// 做：挑战的画面。这一题的一套面值和说明；答完以后是动态规划揭晓的结果。按钮由规则的 controls 给。
const props = defineProps<{ state: ChallengeGame; clickable: boolean; t: (msg: Msg) => string }>();
const q = () => CHALLENGE[props.state.k];
const reveal = () => challengeReveal(props.state);
</script>

<template>
  <div class="sys" :aria-label="t(m('scene.faces', { list: desc(q().coins).join('、') }))">
    <span v-for="c in desc(q().coins)" :key="c" class="face" aria-hidden="true">{{ c }}</span>
  </div>
  <p class="small-note">{{ t(q().note) }}</p>
  <div v-if="reveal()" class="reveal" aria-live="polite">
    <p class="verdict">{{ t(reveal()!.verdict) }}</p>
    <p>{{ t(reveal()!.text) }}</p>
  </div>
</template>

<style scoped>
.sys { display: flex; flex-wrap: wrap; gap: 8px; }
.face {
  width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center;
  font: 700 15px var(--mono); background: var(--mid); color: var(--mid-ink); border: 1.5px solid var(--mid-ink);
}
.reveal { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; border-left: 3px solid var(--accent); padding-left: 12px; }
.verdict { font-weight: 700; }
</style>
