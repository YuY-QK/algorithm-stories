<script setup lang="ts">
import type { ChallengeState } from '../../../../engine/binary-search';
import type { Msg } from '../../../../core/types';

// 挑战：输入不合规的提示，和每次猜测的记录。结束后补一句「当时的正中间」。
defineProps<{ state: ChallengeState; t: (msg: Msg) => string }>();
</script>

<template>
  <p v-if="state.oops" class="oops">{{ t(state.oops) }}</p>
  <ol class="log">
    <li v-for="(e, k) in state.log" :key="k">
      <span class="mono">{{ e.g }}</span>
      {{ t(e.say) }}
      <small v-if="state.status !== 'play' && e.hint" class="hint">{{ t(e.hint) }}</small>
    </li>
  </ol>
</template>

<style scoped>
.log { margin: 0; padding-left: 1.6em; display: flex; flex-direction: column; gap: 4px; }
.mono { font: 600 15px var(--mono); display: inline-block; min-width: 3em; }
.hint { color: var(--muted); }
</style>
