<script setup lang="ts">
// 选项按钮上的大图标（Control.art 用）：一个只给眼睛看的 emoji
defineProps<{ icon: string }>();
</script>

<template>
  <span class="icon" aria-hidden="true">{{ icon }}</span>
</template>

<style scoped>
.icon { font-size: 1.8rem; line-height: 1; }
</style>
