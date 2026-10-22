<script setup lang="ts">
// 参考代码面板，active 行高亮（行号从 1 开始）
withDefaults(defineProps<{ lines: string[]; active: number; lang?: string }>(), { lang: 'PYTHON' });
</script>

<template>
  <div class="code" role="group" :aria-label="lang + ' 代码'">
    <div class="codehead">{{ lang }}</div>
    <pre><div v-for="(t, k) in lines" :key="k" class="line" :class="{ on: k + 1 === active }"><i>{{ k + 1 }}</i><span>{{ t }}</span></div></pre>
  </div>
</template>
