<script setup lang="ts">
import type { Msg } from '../../../../core/types';

// 结算里的一句小字（挑战的「慢的不是交换」）
defineProps<{ msg: Msg; t: (msg: Msg) => string }>();
</script>

<template>
  <p class="small-note">{{ t(msg) }}</p>
</template>
