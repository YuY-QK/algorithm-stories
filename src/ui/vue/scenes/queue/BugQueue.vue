<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { Bug, BugStep } from '../../../../engine/queue';
import Cells from './Cells.vue';
import Ops from './Ops.vue';

// 做：找 bug 的画面。有 bug 的代码在这串操作上怎么跑。
defineProps<{ step: BugStep; bug: Bug; t: (msg: Msg) => string }>();
</script>

<template>
  <Ops :ops="bug.ops" :now="step.op" :past="step.op" :rets="step.rets" :t="t" />
  <Cells :cells="step.cells" :head="step.head" :tail="step.tail" :size="Math.min(step.size, bug.cap)" :touched="step.touched" :t="t" />
</template>
