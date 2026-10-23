<script setup lang="ts">
// 递归调用栈：从最外层到当前这一层，每层是一次 quickSort(lo, hi)。
defineProps<{ stack: [number, number][] }>();
</script>

<template>
  <div class="cs">
    <span class="lab">调用栈</span>
    <span v-if="!stack.length" class="empty">（空）</span>
    <span v-for="([lo, hi], d) in stack" :key="d" class="fr" :class="{ top: d === stack.length - 1 }">
      <small v-if="d > 0">→</small>({{ lo }}, {{ hi }})
    </span>
  </div>
</template>

<style scoped>
.cs { display: flex; flex-wrap: wrap; gap: 4px 6px; align-items: baseline; font: 500 13px var(--mono); }
.lab { color: var(--muted); font-size: 12px; margin-right: 4px; }
.fr { padding: 2px 8px; border-radius: 6px; border: 1.5px solid var(--line); background: var(--bg); white-space: nowrap; }
.fr small { color: var(--muted); margin-right: 4px; }
.fr.top { border-color: var(--accent); color: var(--accent); font-weight: 700; }
.empty { color: var(--muted); }
</style>
