<script setup lang="ts">
import { show } from '../../i18n/runtime';
import type { Msg } from '../../i18n/format';

// 变量当前值，一个变量一个小标签。字符串原样显示（变量名、数字），Msg 翻译（如「已检查」）
defineProps<{ vars: [string | Msg, string | number | Msg][] }>();
const text = (x: string | number | Msg) => (typeof x === 'number' ? x : show(x));
</script>

<template>
  <div class="vars">
    <span v-for="([name, value], k) in vars" :key="k" class="chip"><small>{{ text(name) }}</small>{{ text(value) }}</span>
  </div>
</template>
