<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { Bug, QuickStep } from '../../../../engine/quick-sort';
import CallStack from './CallStack.vue';
import PartRow from './PartRow.vue';

// 做：找 bug 的一排格子和调用栈。
defineProps<{ step: QuickStep; bug: Bug; t: (msg: Msg) => string }>();
</script>

<template>
  <PartRow :step="step" :t="t" />
  <CallStack :stack="step.stack" :t="t" />
</template>
