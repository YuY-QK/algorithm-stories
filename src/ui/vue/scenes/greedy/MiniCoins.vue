<script setup lang="ts">
// 追问「每次先拿哪一枚」选项上的小图：三枚硬币，被选的那一类是实心的、大小不同。
defineProps<{ kind: string }>();
</script>

<template>
  <span class="mini" aria-hidden="true">
    <template v-if="kind === 'small'"><b class="s" /><i /><i /></template>
    <template v-else-if="kind === 'any'"><i /><b class="m" /><i /></template>
    <template v-else><i /><i /><b class="l" /></template>
  </span>
</template>

<style scoped>
.mini { display: flex; gap: 4px; align-items: center; height: 26px; }
.mini i, .mini b { border-radius: 50%; border: 1.5px solid var(--line); width: 14px; height: 14px; }
.mini b { background: var(--mid); border-color: var(--mid-ink); }
.mini .s { width: 12px; height: 12px; }
.mini .m { width: 18px; height: 18px; }
.mini .l { width: 24px; height: 24px; }
</style>
