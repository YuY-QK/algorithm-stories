<script setup lang="ts">
// 选办法按钮上的大图标（📚 叠起来 / ➡️ 放旁边）。
defineProps<{ icon: string }>();
</script>

<template>
  <span class="ic" aria-hidden="true">{{ icon }}</span>
</template>

<style scoped>
.ic { font-size: 1.8rem; }
</style>
