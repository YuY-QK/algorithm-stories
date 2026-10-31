<script setup lang="ts">
import type { Msg } from '../../../../core/types';

// 结算里的结论：中间那段加粗，后面一句小字。
defineProps<{ a: Msg; b: Msg; c: Msg; note: Msg; t: (msg: Msg) => string }>();
</script>

<template>
  <p>{{ t(a) }}<b>{{ t(b) }}</b>{{ t(c) }}</p>
  <p class="small-note">{{ t(note) }}</p>
</template>
