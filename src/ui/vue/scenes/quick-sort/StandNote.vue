<script setup lang="ts">
import type { Msg } from '../../../../core/types';

// 结算里的一句小字（站两边：两边各自还乱着）
defineProps<{ msg: Msg; t: (msg: Msg) => string }>();
</script>

<template>
  <p class="small-note">{{ t(msg) }}</p>
</template>
