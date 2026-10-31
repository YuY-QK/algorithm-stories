<script setup lang="ts">
// 追问选项上的小图：五个小信箱，第 hot 个（从 0 数）亮着
defineProps<{ hot: number }>();
</script>

<template>
  <span class="mini"><template v-for="k in 5" :key="k"><b v-if="k - 1 === hot" /><i v-else /></template></span>
</template>

<style scoped>
.mini { display: flex; gap: 3px; }
.mini i, .mini b { width: 12px; height: 18px; border-radius: 4px 4px 2px 2px; border: 1.5px solid var(--line); }
.mini b { background: var(--mid); border-color: var(--mid); }
</style>
