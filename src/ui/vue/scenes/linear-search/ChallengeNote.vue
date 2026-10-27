<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { ChallengeState } from '../../../../engine/linear-search';

// 挑战：输入框下面的提示：猜错或输入不合规，和第一题猜对时留下的讲解。
defineProps<{ state: ChallengeState; t: (msg: Msg) => string }>();
</script>

<template>
  <p v-if="state.oops" class="oops">{{ t(state.oops) }}</p>
  <p v-if="state.ok && state.step !== 'sim'" class="note">{{ t(m('chal.okMark', { text: state.ok })) }}</p>
</template>
