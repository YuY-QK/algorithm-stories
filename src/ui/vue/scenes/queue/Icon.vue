<script setup lang="ts">
// 选项按钮上的大图标（Control.art 用）：一个只给眼睛看的 emoji
defineProps<{ icon: string }>();
</script>

<template>
  <span class="pic" aria-hidden="true">{{ icon }}</span>
</template>

<style scoped>
.pic { font-size: 2rem; line-height: 1.1; }
</style>
