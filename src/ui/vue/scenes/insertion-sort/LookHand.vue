<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { LookPage } from '../../../../engine/insertion-sort';
import Hand from './Hand.vue';

// 看：绘本一页的画面。台词由 Book 控件显示，这里只画牌桌。
defineProps<{ frame: LookPage; t: (msg: Msg) => string }>();
</script>

<template>
  <Hand :cards="frame.cards" :slots="frame.slots" :held="frame.held" :held-at="frame.heldAt" :in-hand="frame.inHand" :vs="frame.cmp" :t="t" />
</template>
