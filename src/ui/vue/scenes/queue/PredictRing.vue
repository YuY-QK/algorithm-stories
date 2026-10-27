<script setup lang="ts">
import { computed } from 'vue';
import type { Msg } from '../../../../core/types';
import type { PredictAnswer, QueueView } from '../../../../engine/queue';
import Cells from './Cells.vue';
import Ops from './Ops.vue';

// 做：猜下一步的画面。操作序列做到第几个，数组此刻的样子；格子被点时把格子号用 act 交给规则。
// 第一问时是操作之前，第二问时数组已经写好、指针还没动（touched 标出那一格）。
const props = defineProps<{ view: QueueView; picked: PredictAnswer | null; pickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [value: PredictAnswer] }>();

/** 已经做完的操作才显示返回值 */
const rets = computed(() => Object.fromEntries(props.view.rets.slice(0, props.view.r).map((x, k) => [k, x])));
</script>

<template>
  <Ops :ops="view.ops" :now="view.r" :past="view.r" :rets="rets" :t="t" />
  <Cells
    :cells="view.cells" :head="view.head" :tail="view.tail" :size="view.size" :touched="view.touched"
    :clickable="pickable" :miss="picked" :t="t" @pick="(k: number) => emit('act', k)"
  />
</template>
