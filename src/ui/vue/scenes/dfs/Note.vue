<script setup lang="ts">
import type { Msg } from '../../../../core/types';

// 结算里的一段说明：中间可以有一个词加粗（before + bold + after 连成一句），small 时是小字。
// 由 GameResult.art 挂上来，文字都是 Msg。
defineProps<{ before: Msg; bold?: Msg; after?: Msg; small?: boolean; t: (msg: Msg) => string }>();
</script>

<template>
  <p :class="{ 'small-note': small }">{{ t(before) }}<b v-if="bold">{{ t(bold) }}</b>{{ after ? t(after) : '' }}</p>
</template>
