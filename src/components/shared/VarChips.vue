<script setup lang="ts">
// 变量当前值，一个变量一个小标签
defineProps<{ vars: [string, string | number][] }>();
</script>

<template>
  <div class="vars">
    <span v-for="[name, value] in vars" :key="name" class="chip"><small>{{ name }}</small>{{ value }}</span>
  </div>
</template>
