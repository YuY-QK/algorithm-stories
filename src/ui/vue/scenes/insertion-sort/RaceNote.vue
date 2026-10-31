<script setup lang="ts">
import type { Msg } from '../../../../core/types';

// 结算里的一段话（挑战的「挪动次数正好等于逆序对数」）
defineProps<{ msg: Msg; t: (msg: Msg) => string }>();
</script>

<template>
  <p>{{ t(msg) }}</p>
</template>
