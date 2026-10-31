<script setup lang="ts">
import { CHALLENGE_MAX, type ChallengeState } from '../../../../engine/binary-search';
import type { Msg } from '../../../../core/types';

// 挑战：1 到 1000 的一条尺子。亮着的是还可能的范围，竖线是猜过的数。
defineProps<{ state: ChallengeState; clickable?: boolean; t: (msg: Msg) => string }>();
const pct = (v: number) => ((v - 1) / (CHALLENGE_MAX - 1)) * 100 + '%';
</script>

<template>
  <div class="range" aria-hidden="true">
    <div class="live" :style="{ left: pct(state.lo), width: 'calc(' + pct(state.hi) + ' - ' + pct(state.lo) + ' + 3px)' }" />
    <span v-for="(e, k) in state.log" :key="k" class="tick" :class="e.dir" :style="{ left: pct(e.g) }" />
  </div>
</template>

<style scoped>
.range { position: relative; height: 14px; border-radius: 7px; background: var(--out); }
.live { position: absolute; top: 0; bottom: 0; border-radius: 7px; background: var(--accent); opacity: 0.6; transition: left 0.3s, width 0.3s; }
.tick { position: absolute; top: -4px; bottom: -4px; width: 3px; margin-left: -1px; border-radius: 2px; background: var(--fg); }
.tick.hit { background: var(--mid); }
</style>
