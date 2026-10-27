<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { ChallengeState } from '../../../../engine/linear-search';

// 挑战：题目说明（几个箱子）和当前要猜的问题；猜完两题后，讲解放在这里。
defineProps<{ state: ChallengeState; clickable?: boolean; t: (msg: Msg) => string }>();
</script>

<template>
  <p>{{ t(m('chal.leadA')) }} <b>{{ state.n }}</b> {{ t(m('chal.leadB')) }}</p>
  <p v-if="state.step === 'worst'" aria-hidden="true">{{ t(m('chal.q.worst')) }}</p>
  <p v-else-if="state.step === 'avg'" aria-hidden="true">{{ t(m('chal.q.avg')) }}</p>
  <!-- 最后一步没有输入框，猜对的讲解直接放在按钮前面 -->
  <p v-else-if="state.ok" class="note">{{ t(m('chal.okMark', { text: state.ok })) }}</p>
</template>
