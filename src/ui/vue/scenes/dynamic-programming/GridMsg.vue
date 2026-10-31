<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { GridGame } from '../../../../engine/dynamic-programming';

// 做：挑战输入框下面的提示（填错时的闪光提示和算式、没填数字时的提醒）。
defineProps<{ state: GridGame; t: (msg: Msg) => string }>();
defineEmits<{ act: [action: unknown] }>();
</script>

<template>
  <p class="oops" aria-live="polite">{{ state.msg ? t(state.msg) : '' }}</p>
</template>
