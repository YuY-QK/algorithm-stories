<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';

// 调用栈：栈底在左，栈顶（正在执行的这一层）在右。每一层写成 (行,列)，出界的格子也照样写。太深时只画最近的 max 层。
const props = withDefaults(defineProps<{ stack: [number, number][]; max?: number; t: (msg: Msg) => string }>(), { max: 14 });
const shown = computed(() => props.stack.slice(-props.max));
const hidden = computed(() => props.stack.length - shown.value.length);
</script>

<template>
  <div class="srow" :aria-label="t(m('stack.label', { n: stack.length }))">
    <span class="shead">{{ t(m('stack.bottom')) }}</span>
    <span v-if="!stack.length" class="sempty">{{ t(m('stack.empty')) }}</span>
    <span v-if="hidden > 0" class="smore">{{ t(m('stack.more', { n: hidden })) }}</span>
    <span
      v-for="(f, k) in shown" :key="hidden + k" class="sitem"
      :class="{ top: hidden + k === stack.length - 1 }"
    >({{ f[0] }},{{ f[1] }})</span>
    <span v-if="stack.length" class="shead">{{ t(m('stack.top')) }}</span>
  </div>
</template>

<style scoped>
.srow { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-height: 2.2em; }
.shead, .sempty, .smore { font-size: 13px; color: var(--muted); }
.sitem {
  padding: 3px 6px; border-radius: 6px; border: 1.5px dashed var(--accent); background: var(--bg);
  font: 600 12px var(--mono); font-variant-numeric: tabular-nums;
}
.sitem.top { border-style: solid; background: color-mix(in srgb, var(--mid) 40%, var(--bg)); border-color: var(--mid); }
</style>
