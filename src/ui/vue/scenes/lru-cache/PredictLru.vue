<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { opText, type PredictView } from '../../../../engine/lru-cache';
import ListView from './ListView.vue';

// 做：猜下一步的画面。操作之前的链表（只显示 key），和下一个操作；答完以后被操作的那个 key 亮起来。
// 选项按钮由控件画，这里不点。
defineProps<{ view: PredictView; picked: unknown; pickable: boolean; t: (msg: Msg) => string }>();
</script>

<template>
  <ListView :list="view.before" :cap="view.cap" hide-values :focus="view.focus" :t="t" />
  <p class="call">{{ t(m('scene.nextOp')) }}<code>{{ opText(view.op) }}</code></p>
</template>

<style scoped>
.call { font-size: 1.05rem; }
.call code { font: 600 1em var(--mono); background: var(--out); padding: 2px 8px; border-radius: 4px; }
</style>
