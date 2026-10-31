<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { arrayCells, type PredictView } from '../../../../engine/linear-search';
import Boxes from './Boxes.vue';

// 做：猜下一步的数组。这一关的问题都是选项题，数组只展示当前下标和命中的格子。
defineProps<{ view: PredictView; picked: unknown; pickable: boolean; t: (msg: Msg) => string }>();
</script>

<template>
  <Boxes :cells="arrayCells(view.arr, view)" :pointer="view.pointer" :label="t(m('scene.array'))" :t="t" />
</template>
