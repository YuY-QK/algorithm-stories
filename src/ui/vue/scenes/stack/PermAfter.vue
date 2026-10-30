<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { CHALLENGE_COUNT, permView, type PermAction, type PermGame } from '../../../../engine/stack';

// 挑战的画面（放在播放控制条下面）：演完以后的判断结果、「下一题」，最后一题之后的总结。
const props = defineProps<{ state: PermGame; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: PermAction] }>();
const v = computed(() => permView(props.state));
const verdict = computed(() => {
  const res = v.value.truth ? m('perm.res.can') : m('perm.res.cannot');
  return props.t(props.state.answer === v.value.truth ? m('perm.sum.right', { res }) : m('perm.sum.wrong', { res }));
});
const final = computed(() => {
  const params = { count: CHALLENGE_COUNT, score: props.state.score };
  return props.t(props.state.score === CHALLENGE_COUNT ? m('perm.final.all', params) : m('perm.final.some', params));
});
</script>

<template>
  <p v-if="v.done" class="summary" aria-live="polite">{{ verdict }}</p>
  <div v-if="v.done && !v.finished" class="row">
    <button type="button" class="btn small primary" @click="emit('act', { type: 'next' })">{{ t(m('perm.next')) }}</button>
  </div>
  <div v-if="v.finished" class="result">
    <h3>{{ final }}</h3>
    <p>{{ t(m('perm.tip1')) }}</p>
    <p>{{ t(m('perm.tip2')) }}</p>
    <button type="button" class="btn small" @click="emit('act', { type: 'restart' })">{{ t(m('perm.restart')) }}</button>
  </div>
</template>
