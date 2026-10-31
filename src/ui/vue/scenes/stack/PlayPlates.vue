<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { PlatesAction, PlatesGame } from '../../../../engine/stack';
import Plates from './Plates.vue';

// 玩法一「拿盘子」的画面：盘子叠着，被点的盘子用 act 交给规则。晃一下、透光都是 state 里的字段。
defineProps<{ state: PlatesGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: PlatesAction] }>();
</script>

<template>
  <Plates
    :stack="state.stack" :taken="state.taken" :room="5" :clickable="clickable" :glow="state.glow" :shake="state.shake" :t="t"
    @pick="(plate: number) => emit('act', { type: 'pick', plate })"
  />
</template>
