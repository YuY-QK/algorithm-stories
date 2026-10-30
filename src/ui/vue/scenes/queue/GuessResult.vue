<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { challengeView, type ChallengeState } from '../../../../engine/queue';
import Cells from './Cells.vue';

// 做：挑战揭晓以后的画面（放在按钮下面）：对了几项，真正的循环队列跑完是什么样。
const props = defineProps<{ state: ChallengeState; t: (msg: Msg) => string }>();
const v = computed(() => challengeView(props.state));
const headOk = computed(() => props.state.head === v.value.answer.head);
const tailOk = computed(() => props.state.tail === v.value.answer.tail);
</script>

<template>
  <div v-if="state.shown" class="result">
    <h3>{{ v.score === v.full ? t(m('chal.allRight')) : t(m('chal.score', { score: v.score, full: v.full })) }}</h3>
    <p>{{ t(m('chal.real')) }}</p>
    <Cells :cells="v.answer.cells" :head="v.answer.head" :tail="v.answer.tail" :size="v.answer.size" :t="t" />
    <p class="small-note">
      head = {{ v.answer.head }}<span :class="headOk ? 'ok' : 'no'">{{ headOk ? t(m('chal.ok')) : t(m('chal.picked', { n: state.head })) }}</span>{{ t(m('chal.sep')) }}tail = {{ v.answer.tail }}<span :class="tailOk ? 'ok' : 'no'">{{ tailOk ? t(m('chal.ok')) : t(m('chal.picked', { n: state.tail })) }}</span>{{ t(m('chal.sizeNote', { n: v.answer.size })) }}
    </p>
  </div>
</template>

<style scoped>
.ok { color: var(--accent); }
.no { color: var(--warn); }
</style>
