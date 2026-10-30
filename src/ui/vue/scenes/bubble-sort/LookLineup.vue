<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { LookPage } from '../../../../engine/bubble-sort';
import Lineup from './Lineup.vue';

// 看：绘本一页的画面。台词由 Book 控件显示，这里只画排队的小伙伴。
defineProps<{ frame: LookPage; t: (msg: Msg) => string }>();
</script>

<template>
  <Lineup :line="frame.line" :pair="frame.pair" :fixed-from="frame.fixedFrom" :photo="frame.photo" :t="t" />
</template>
