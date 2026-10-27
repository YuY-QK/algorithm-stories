<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { BracketView as View } from '../../../../engine/stack';
import BracketView from './BracketView.vue';

// 做：猜下一步的画面。每问都是选项题，画面不用点。
defineProps<{ view: View; picked: unknown; pickable: boolean; t: (msg: Msg) => string }>();
</script>

<template>
  <BracketView :s="view.s" :i="view.i" :stack="view.stack" :top="view.top" :bad="view.bad" :t="t" />
</template>
