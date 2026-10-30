<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { challengeReveal, type ChallengeAction, type ChallengeState } from '../../../../engine/lru-cache';

// 做：挑战输入框下面的部分。输入不对时的提醒，揭晓后的结果（猜中没有、LRU 和 FIFO 各命中几次、一句比较）和「下一题」。
const props = defineProps<{ state: ChallengeState; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: ChallengeAction] }>();

const s = computed(() => props.state);
const r = computed(() => (s.value.shown ? challengeReveal(s.value) : null));
</script>

<template>
  <p v-if="s.msg" class="oops">{{ t(s.msg) }}</p>
  <div v-if="r" class="reveal" aria-live="polite">
    <p>
      <b>{{ r.diff === 0 ? t(m('chal.hit')) : t(m('chal.diff', { n: r.diff })) }}</b>{{ t(m('chal.you.a', { g: s.guess })) }}<b>{{ r.lru }}</b>{{ t(m('chal.you.b')) }}<b>{{ r.fifo }}</b>{{ t(m('chal.you.c')) }}
    </p>
    <p>{{ t(r.compare) }}</p>
    <div class="row"><button type="button" class="btn small primary" @click="emit('act', { type: 'next' })">{{ t(m('chal.next')) }}</button></div>
  </div>
</template>

<style scoped>
.reveal { display: flex; flex-direction: column; gap: 10px; border-left: 3px solid var(--accent); padding-left: 12px; }
</style>
