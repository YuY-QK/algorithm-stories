<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { challengeStats, CHALLENGE_LIMIT, type ChallengeState } from '../../../../engine/hash-lookup';

// 挑战：还没过关时，说一句「太挤了」。
defineProps<{ state: ChallengeState; t: (msg: Msg) => string }>();
</script>

<template>
  <p v-if="challengeStats(state) && !state.won && challengeStats(state)!.longest > CHALLENGE_LIMIT" class="note" aria-live="polite">{{ t(m('chal.crowded', { n: challengeStats(state)!.longest })) }}</p>
</template>
