<script setup lang="ts">
import { computed } from 'vue';
import { kindOf } from '../../../../engine/stack';

// 一块积木（一个括号）。三种括号三种颜色，拼好的一对可以传两个字符一起画。
const props = withDefaults(defineProps<{ c: string; small?: boolean }>(), { small: false });
const kind = computed(() => kindOf(props.c[0]));
</script>

<template>
  <span class="piece" :class="['k' + kind, { small }]">{{ c }}</span>
</template>

<style scoped>
.piece {
  display: inline-grid; place-items: center; min-width: 40px; height: 44px; padding: 0 4px; box-sizing: border-box;
  font: 700 1.5rem/1 var(--mono); border-radius: 10px; border: 2px solid transparent;
}
.piece.small { min-width: 30px; height: 32px; font-size: 1.05rem; border-radius: 8px; }
.k0 { background: var(--accent); color: var(--accent-ink); }
.k1 { background: var(--mid); color: var(--mid-ink); }
.k2 { background: var(--warn); color: var(--surface); }
</style>
